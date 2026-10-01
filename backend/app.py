from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import json
import requests
from dotenv import load_dotenv
from schemes_scraper import scrape_schemes
from crop_scraper import fetch_realtime_prices
from apscheduler.schedulers.background import BackgroundScheduler

# Import Email, DB, SMS, and Alert Checker Services
import email_service
import db_service
import alert_checker
from services.sms_service import (
    send_price_alert as send_price_alert_sms,
    send_test_sms,
    normalize_indian_phone,
)

# Load environment variables from project root
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
import sys
if BASE_DIR not in sys.path:
    sys.path.append(BASE_DIR)
dotenv_path = os.path.join(BASE_DIR, "..", ".env")
load_dotenv(dotenv_path=dotenv_path)

from routes.plant_disease_routes import plant_disease_bp
from routes.recommendation_routes import recommendation_bp
from routes.history_routes import history_bp
from routes.admin_routes import admin_bp
import admin_service

app = Flask(__name__)
# Enable CORS for all routes and origins
# IMPORTANT: Replace YOUR_VERCEL_APP with your actual Vercel deployment URL
ALLOWED_ORIGINS = [
    "*",  # Allow all (safe for public data APIs; restrict if you need auth security)
    # Add your Vercel URL here for stricter security, e.g.:
    # "https://krishi-mitra.vercel.app",
    # "https://your-custom-domain.com",
]
CORS(app, resources={r"/api/*": {"origins": ALLOWED_ORIGINS, "allow_headers": ["Content-Type", "X-User-Id"], "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]}})
app.register_blueprint(plant_disease_bp)
app.register_blueprint(recommendation_bp)
app.register_blueprint(history_bp)
app.register_blueprint(admin_bp)

DATA = []

def ensure_data_dir():
    """Create the data directory if it doesn't exist (needed on fresh deployments)."""
    data_dir = os.path.join(BASE_DIR, "data")
    os.makedirs(data_dir, exist_ok=True)

ensure_data_dir()

def load_data():

    global DATA
    DATA = []
    
    # Load Live Data if available
    live_path = os.path.join(BASE_DIR, "data", "live_crops.json")
    if os.path.exists(live_path):
        try:
            with open(live_path, 'r', encoding='utf-8') as f:
                DATA = json.load(f)
        except Exception as e:
            print(f"Error loading live data: {e}")

load_data()

def run_price_alert_checks():
    """Background task to evaluate price alerts against current data"""
    try:
        load_data()
        if DATA:
            res = alert_checker.check_and_trigger_price_alerts(DATA)
            if res.get("triggered", 0) > 0:
                print(f"[Scheduler] Triggered {res['triggered']} price alert emails.")
    except Exception as e:
        print(f"[Scheduler Alert Check Error]: {e}")

# 🕒 AUTOMATIC SCHEDULER (Scrapers & Price Alert Evaluation)
scheduler = BackgroundScheduler()
scheduler.add_job(func=scrape_schemes, trigger="interval", hours=24)
scheduler.add_job(func=fetch_realtime_prices, trigger="interval", hours=12) # Update prices every 12h
scheduler.add_job(func=run_price_alert_checks, trigger="interval", minutes=5) # Check alerts every 5 mins
scheduler.start()

def initial_sync():
    try:
        scrape_schemes()
        fetch_realtime_prices()
        load_data()
        run_price_alert_checks()
    except Exception as e:
        print(f"Initial setup/scraping notice: {e}")

import threading
threading.Thread(target=initial_sync, daemon=True).start()

@app.route("/api/data")
def get_data():
    # Reload data to include any fresh scraper updates
    load_data()
    return jsonify(DATA)

@app.route("/api/live-schemes")
def get_live_schemes():
    schemes_path = os.path.join(BASE_DIR, "data", "live_schemes.json")
    if os.path.exists(schemes_path):
        with open(schemes_path, 'r', encoding='utf-8') as f:
            return jsonify(json.load(f))
    return jsonify({"error": "No live data available yet. Please trigger an update."}), 404

@app.route("/api/update-schemes")
def update_schemes():
    success = scrape_schemes()
    if success:
        schemes_path = os.path.join(BASE_DIR, "data", "live_schemes.json")
        if os.path.exists(schemes_path):
            with open(schemes_path, 'r', encoding='utf-8') as f:
                return jsonify(json.load(f))
    return jsonify({"error": "Failed to update schemes"}), 500

# =========================================================================
# 🔔 SMART PRICE ALERT ENDPOINTS (Twilio SMS)
# =========================================================================

def _request_user_id():
    data = request.get_json(silent=True) or {}
    return (
        request.args.get("user_id")
        or data.get("user_id")
        or request.headers.get("X-User-Id")
        or ""
    ).strip()


def _owned_alert_or_error(alert_id):
    user_id = _request_user_id()
    if not user_id:
        return None, (jsonify({"success": False, "error": "Please sign in to manage your price alerts."}), 401)
    alert = db_service.get_alert_by_id(alert_id)
    if not alert:
        return None, (jsonify({"success": False, "error": "Price alert not found."}), 404)
    if not db_service.alert_belongs_to_user(alert, user_id):
        return None, (jsonify({"success": False, "error": "You can only manage your own price alerts."}), 403)
    return alert, None


def _test_sms_allowed():
    flag = os.getenv("ALLOW_TEST_SMS", "").strip().lower()
    if flag in ("0", "false", "no", "off"):
        return False
    env = (os.getenv("FLASK_ENV") or os.getenv("ENV") or "").strip().lower()
    if env == "production" and flag not in ("1", "true", "yes", "on"):
        return False
    return True


@app.route("/api/price-alerts/test-sms", methods=["POST"])
def test_price_alert_sms():
    """
    Development/testing only. Sends a simple Twilio SMS.
    Disabled in production unless ALLOW_TEST_SMS=true.
    """
    if not _test_sms_allowed():
        return jsonify({
            "success": False,
            "error": "Test SMS is disabled outside development."
        }), 403

    try:
        data = request.get_json(silent=True) or {}
        phone = data.get("phone_number") or data.get("phone") or ""
        result = send_test_sms(phone)
        status = 200 if result.get("success") else 400
        return jsonify({
            "success": bool(result.get("success")),
            "message": "Test SMS sent." if result.get("success") else None,
            "error": result.get("error"),
            "to": result.get("to") if result.get("success") else None,
            "testing": True,
        }), status
    except Exception:
        return jsonify({"success": False, "error": "Could not send test SMS."}), 500


@app.route("/api/price-alerts", methods=["POST"])
def create_price_alert():
    """
    Create a crop price SMS alert.
    Request JSON: { "phone_number", "crop", "target_price", "user_id" }
    """
    try:
        data = request.get_json() or {}
        user_id = (data.get("user_id") or _request_user_id()).strip()
        crop = str(data.get("crop") or "").strip()
        phone_raw = str(data.get("phone_number") or data.get("phone") or "").strip()
        farmer_email = str(data.get("farmer_email") or "").strip()
        market = str(data.get("market") or "All Markets").strip() or "All Markets"
        target_price_raw = data.get("target_price")
        alert_enabled = bool(data.get("alert_enabled", True))

        if not user_id:
            return jsonify({"success": False, "error": "Please sign in to set a price alert."}), 401

        phone_number = normalize_indian_phone(phone_raw)
        if not phone_number:
            return jsonify({
                "success": False,
                "error": "Enter a valid Indian mobile number (10 digits starting with 6-9, or +91...)."
            }), 400

        if not crop:
            return jsonify({"success": False, "error": "Please select a crop."}), 400

        if target_price_raw is None or target_price_raw == "":
            return jsonify({"success": False, "error": "Target price is required."}), 400
        try:
            target_price = float(target_price_raw)
            if target_price <= 0:
                return jsonify({"success": False, "error": "Target price must be a positive number."}), 400
        except (ValueError, TypeError):
            return jsonify({"success": False, "error": "Target price must be a valid number."}), 400

        if farmer_email and not email_service.is_valid_email(farmer_email):
            farmer_email = ""

        db_res = db_service.create_alert(
            farmer_email=farmer_email,
            crop=crop,
            market=market,
            target_price=target_price,
            farmer_id=user_id,
            alert_enabled=alert_enabled,
            phone_number=phone_number,
            user_id=user_id,
        )

        if not db_res.get("success"):
            return jsonify({"success": False, "error": db_res.get("error", "Could not save price alert.")}), 500

        saved_alert = db_res.get("alert", {})

        load_data()
        _, current_price = alert_checker.find_crop_price(crop, market, DATA)
        sms_sent = False
        sms_warning = None

        if alert_enabled and current_price >= target_price and current_price > 0:
            sms_res = send_price_alert_sms(phone_number, crop, current_price, target_price)
            if sms_res.get("success"):
                db_service.mark_alert_as_sent(saved_alert.get("id"))
                saved_alert["alert_sent"] = True
                sms_sent = True
            else:
                sms_warning = sms_res.get("error") or "Could not send SMS yet. The alert is saved and will retry."

        saved_alert["current_price"] = current_price
        saved_alert["immediate_sms_sent"] = sms_sent
        if sms_warning:
            saved_alert["sms_warning"] = sms_warning

        message = "Price alert created successfully."
        if sms_sent:
            message = "Price alert created and SMS sent because the target price is already reached."

        return jsonify({"success": True, "message": message, "alert": saved_alert}), 201

    except Exception:
        return jsonify({"success": False, "error": "Could not create the price alert. Please try again."}), 500


@app.route("/api/price-alerts", methods=["GET"])
def get_price_alerts():
    """Return the current user's price alerts."""
    try:
        user_id = _request_user_id()
        if not user_id:
            return jsonify({
                "success": False,
                "error": "Please sign in to view your price alerts.",
                "alerts": []
            }), 401

        db_res = db_service.get_alerts(user_id=user_id)
        if not db_res.get("success"):
            return jsonify({"success": False, "error": db_res.get("error", "Could not load alerts."), "alerts": []}), 500

        alerts = db_res.get("alerts", [])
        load_data()
        for alert in alerts:
            _, current_price = alert_checker.find_crop_price(alert.get("crop"), alert.get("market"), DATA)
            alert["current_price"] = current_price
            alert["target_reached"] = bool(current_price > 0 and current_price >= alert.get("target_price", 0))

        return jsonify({"success": True, "count": len(alerts), "alerts": alerts})

    except Exception:
        return jsonify({"success": False, "error": "Could not load price alerts.", "alerts": []}), 500


@app.route("/api/price-alerts/<alert_id>/stop", methods=["PUT", "POST"])
def stop_price_alert(alert_id):
    alert, err = _owned_alert_or_error(alert_id)
    if err:
        return err
    try:
        if db_service.stop_alert(alert_id):
            return jsonify({"success": True, "message": "Price alert stopped successfully."})
        return jsonify({"success": False, "error": "Could not stop this price alert."}), 500
    except Exception:
        return jsonify({"success": False, "error": "Could not stop this price alert."}), 500


@app.route("/api/price-alerts/<alert_id>/resume", methods=["PUT", "POST"])
def resume_price_alert(alert_id):
    alert, err = _owned_alert_or_error(alert_id)
    if err:
        return err
    try:
        if db_service.resume_alert(alert_id):
            return jsonify({"success": True, "message": "Price alert resumed. SMS can trigger again."})
        return jsonify({"success": False, "error": "Could not resume this price alert."}), 500
    except Exception:
        return jsonify({"success": False, "error": "Could not resume this price alert."}), 500


@app.route("/api/price-alerts/<alert_id>", methods=["DELETE"])
def delete_price_alert(alert_id):
    alert, err = _owned_alert_or_error(alert_id)
    if err:
        return err
    try:
        if db_service.delete_alert(alert_id):
            return jsonify({"success": True, "message": "Price alert deleted."})
        return jsonify({"success": False, "error": "Could not delete this price alert."}), 500
    except Exception:
        return jsonify({"success": False, "error": "Could not delete this price alert."}), 500


@app.route("/api/price-alerts/<alert_id>/toggle", methods=["PATCH", "POST"])
def toggle_price_alert(alert_id):
    alert, err = _owned_alert_or_error(alert_id)
    if err:
        return err
    try:
        data = request.get_json(silent=True) or {}
        enabled = data.get("alert_enabled")
        if enabled is False:
            ok = db_service.stop_alert(alert_id)
        elif enabled is True or data.get("reset_sent"):
            ok = db_service.resume_alert(alert_id)
        else:
            ok = db_service.toggle_alert(alert_id)
        if ok:
            return jsonify({"success": True, "message": "Alert updated successfully."})
        return jsonify({"success": False, "error": "Could not update this price alert."}), 500
    except Exception:
        return jsonify({"success": False, "error": "Could not update this price alert."}), 500

@app.route("/api/test-email", methods=["GET"])
def test_email_endpoint():
    """
    Send a test email using Resend to verify email delivery configuration.
    Query param: ?email=... (defaults to TEST_EMAIL env variable)
    """
    try:
        recipient = request.args.get("email") or os.getenv("TEST_EMAIL")
        res = email_service.send_test_email(to_email=recipient)
        status_code = 200 if res.get("success") else 400
        return jsonify({
            "success": bool(res.get("success")),
            "message": res.get("message") if res.get("success") else None,
            "error": res.get("error") if not res.get("success") else None,
        }), status_code
    except Exception:
        return jsonify({"success": False, "error": "Could not send test email."}), 500

@app.route("/api/check-price-alerts", methods=["POST", "GET"])
def manual_check_price_alerts():
    """
    Manually trigger price alert evaluation for all active unsent alerts.
    """
    try:
        load_data()
        res = alert_checker.check_and_trigger_price_alerts(DATA)
        return jsonify({
            "success": True,
            "message": f"Evaluated {res.get('total_checked', 0)} alerts. Dispatched {res.get('triggered', 0)} messages.",
            "data": res
        })
    except Exception:
        return jsonify({"success": False, "error": "Could not check price alerts right now."}), 500

# =========================================================================
# 💬 CHATBOT & UTILITY ROUTES
# =========================================================================

@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.json or {}
    user_msg = data.get("message", "").lower()
    lang = data.get("language", "en") # 'en' or 'hi'

    # Always reload data fresh so chatbot has the latest crop prices
    load_data()
    
    # Try using Gemini API if CHATBOT_API_KEY is configured
    chatbot_key = os.getenv("CHATBOT_API_KEY")
    if chatbot_key and chatbot_key not in ["your_chatbot_api_key_here", ""]:
        crop_context = ""
        if DATA:
            crop_context = "Here are the current real-time crop market prices in India:\n"
            for row in DATA[:50]:
                crop_name = row.get("Commodity") or row.get("commodity") or row.get("Crop") or row.get("crop_name")
                price = row.get("Modal_x0020_Price") or row.get("price")
                market = row.get("Market") or row.get("market")
                state = row.get("State") or row.get("state")
                if crop_name and price and market:
                    crop_context += f"- {crop_name}: ₹{price} per quintal in {market} market, {state}.\n"
        
        system_instruction = (
            "You are 'Kisan Assistant', a helpful agricultural AI chatbot. "
            "Help the farmer by answering questions about crops, weather, farming, price alerts, or recommendations. "
            "Keep your responses extremely clear, practical, friendly, and concise. "
            f"You MUST write your entire response in the language corresponding to language code: '{lang}' (e.g. 'en' for English, 'hi' for Hindi, 'kn' for Kannada, 'ta' for Tamil, 'te' for Telugu). "
            "Use the following real-time crop price database to answer any crop price, rate, cost, or market query:\n"
            f"{crop_context}\n"
            "If the crop is not listed or you do not have its price, explain that you don't have its real-time price but can give advice on growing it."
        )

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={chatbot_key}"
        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": f"System Instructions:\n{system_instruction}\n\nUser Message: {data.get('message')}"
                        }
                    ]
                }
            ]
        }
        headers = {"Content-Type": "application/json"}

        try:
            response = requests.post(url, json=payload, headers=headers, timeout=12)
            if response.status_code == 200:
                resp_json = response.json()
                candidates = resp_json.get("candidates", [])
                if candidates:
                    text_content = candidates[0].get("content", {}).get("parts", [{}])[0].get("text")
                    if text_content:
                        return jsonify({"response": text_content.strip()})
        except Exception as e:
            print(f"Error querying Gemini API: {e}")

    responses = {
        "en": {
            "hello": "Namaste! I am your Kisan Assistant. How can I help you today? You can ask about crop prices (e.g. 'wheat price'), price alerts, farming seasons, or weather.",
            "price_query": "The price of {name} in {market} market is ₹{price} per quintal.",
            "no_crop": "Which crop are you asking about? I have prices for Wheat, Rice, Potato, Onion, Tomato, Maize, Cotton, Mustard, Soyabean, Bajra, Tur, Groundnut, Sugarcane, Banana, Mango, Garlic, Peas and more. Try: 'wheat price' or 'rice price'.",
            "seasons": "In Kharif (June-Oct), you can grow Rice, Maize, Cotton, Bajra, Soyabean. In Rabi (Nov-April), Wheat, Mustard and Garlic are popular. In Zaid (March-June), Watermelon and Vegetables thrive.",
            "unknown": "I'm sorry, I didn't quite get that. You can ask me: crop prices (e.g. 'wheat price'), price alerts, farming seasons, or weather tips.",
            "list_crops": "Available crop prices: Wheat, Rice, Potato, Onion, Tomato, Maize, Cotton, Mustard, Soyabean, Bajra, Tur, Groundnut, Sugarcane, Banana, Mango, Garlic, Peas."
        },
        "hi": {
            "hello": "नमस्ते! मैं आपका किसान सहायक हूँ। मैं आपकी कैसे मदद कर सकता हूँ? फसल की कीमत, अलर्ट, मौसम या खेती के बारे में पूछें।",
            "price_query": "{market} मंडी में {name} की कीमत ₹{price} प्रति क्विंटल है।",
            "no_crop": "आप किस फसल के बारे में पूछ रहे हैं? मैं आपको गेहूं, चावल, आलू, प्याज, टमाटर आदि की कीमतें बता सकता हूं।",
            "seasons": "खरीफ (जून-अक्टूबर) में आप चावल, मक्का, कपास उगा सकते हैं। रबी (नवंबर-अप्रैल) में गेहूं और सरसों लोकप्रिय हैं।",
            "unknown": "क्षमा करें, मुझे समझ नहीं आया। आप मुझसे फसल की कीमतों या खेती के मौसम के बारे में पूछ सकते हैं।",
            "list_crops": "उपलब्ध फसलें: गेहूं, चावल, आलू, प्याज, टमाटर, मक्का, कपास, सरसों।"
        }
    }

    current_resp = responses.get(lang, responses["en"])

    if any(word in user_msg for word in ["hello", "hi", "hey", "namaste", "नमस्ते"]):
        return jsonify({"response": current_resp["hello"]})

    if any(word in user_msg for word in ["list", "crops", "available", "which crop", "all crop"]):
        return jsonify({"response": current_resp["list_crops"]})

    if any(word in user_msg for word in ["season", "grow", "kharif", "rabi", "zaid", "मौसम"]):
        return jsonify({"response": current_resp["seasons"]})

    if any(word in user_msg for word in ["weather", "rain", "forecast", "बारिश"]):
        return jsonify({"response": "You can check the Weather Advisor page for real-time rain predictions and farming suggestions! Stay updated to protect your crops."})

    # Crop Price matching
    found_crop = None
    for row in DATA:
        crop_name = (row.get("Commodity") or row.get("commodity") or row.get("Crop") or row.get("crop_name") or "").lower()
        if crop_name and crop_name in user_msg:
            found_crop = row
            break

    if found_crop:
        name = found_crop.get("Commodity") or found_crop.get("commodity") or found_crop.get("Crop") or found_crop.get("crop_name")
        price = found_crop.get("Modal_x0020_Price") or found_crop.get("price")
        market = found_crop.get("Market") or found_crop.get("market")
        return jsonify({"response": current_resp["price_query"].format(name=name, market=market, price=price)})
    elif any(word in user_msg for word in ["price", "rate", "cost", "कीमत", "भाव"]):
        return jsonify({"response": current_resp["no_crop"]})

    return jsonify({"response": current_resp["unknown"]})

@app.route("/")
def home():
    return "Krishi Mitra Backend is running successfully 🚀"

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
