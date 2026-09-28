import os
import re
import resend
from dotenv import load_dotenv

# Ensure environment variables are loaded
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
dotenv_path = os.path.join(BASE_DIR, "..", ".env")
load_dotenv(dotenv_path=dotenv_path)

def get_resend_api_key():
    """Retrieve and validate Resend API key from environment variable."""
    api_key = os.getenv("RESEND_API_KEY", "").strip()
    if not api_key or api_key in ["YOUR_RESEND_API_KEY_HERE", "your_resend_api_key_here", ""]:
        return None
    return api_key

def is_valid_email(email: str) -> bool:
    """Validate email address format using regular expression."""
    if not email or not isinstance(email, str):
        return False
    email_regex = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
    return bool(re.match(email_regex, email.strip()))

def get_sender_email():
    """Get sender email address configured for Resend."""
    # Free tier Resend uses onboarding@resend.dev unless a custom domain is verified
    return os.getenv("RESEND_FROM_EMAIL", "Krishi Mitra <onboarding@resend.dev>")

def send_price_alert_email(farmer_email: str, crop: str, market: str, current_price: float, target_price: float):
    """
    Send real-time crop price alert email to the farmer via Resend.
    
    Parameters:
    - farmer_email: Recipient email address
    - crop: Name of the crop (e.g., Tomato, Wheat)
    - market: Mandi/Market name
    - current_price: Current market price (₹/Quintal)
    - target_price: Farmer's desired target price (₹/Quintal)
    
    Returns:
    - dict: {"success": True/False, "id": email_id, "error": error_message}
    """
    api_key = get_resend_api_key()
    if not api_key:
        return {
            "success": False,
            "error": "RESEND_API_KEY is not configured in .env. Please set your valid Resend API key."
        }

    if not is_valid_email(farmer_email):
        return {
            "success": False,
            "error": f"Invalid recipient email address: '{farmer_email}'"
        }

    # Configure Resend SDK key
    resend.api_key = api_key
    from_email = get_sender_email()

    subject = "Krishi Mitra - Crop Price Alert"

    # Plain text version
    text_content = f"""Krishi Mitra - Crop Price Alert

Dear Farmer,

Good news! The market price for your crop has reached or exceeded your target price.

---------------------------------------------
Crop: {crop}
Market / Mandi: {market}
Current Market Price: ₹{current_price:,.2f} per quintal
Your Target Price: ₹{target_price:,.2f} per quintal
---------------------------------------------

Example: {crop} price has reached your target price.

Log in to Krishi Mitra to check market trends and make the best decision for selling your harvest.

Warm regards,
Team Krishi Mitra 🌾
"""

    # Rich responsive HTML template
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Krishi Mitra - Crop Price Alert</title>
        <style>
            body {{
                font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                background-color: #f4f7f4;
                margin: 0;
                padding: 0;
                color: #2c3e50;
            }}
            .container {{
                max-width: 600px;
                margin: 24px auto;
                background: #ffffff;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 15px rgba(0,0,0,0.08);
                border: 1px solid #e1e8e1;
            }}
            .header {{
                background: linear-gradient(135deg, #1b5e20, #2e7d32);
                color: #ffffff;
                padding: 30px 20px;
                text-align: center;
            }}
            .header h1 {{
                margin: 0;
                font-size: 26px;
                font-weight: 700;
                letter-spacing: 0.5px;
            }}
            .header p {{
                margin: 8px 0 0;
                font-size: 14px;
                color: #c8e6c9;
            }}
            .badge {{
                display: inline-block;
                background-color: #ffd54f;
                color: #e65100;
                padding: 5px 14px;
                border-radius: 20px;
                font-size: 13px;
                font-weight: 700;
                margin-top: 12px;
                text-transform: uppercase;
            }}
            .content {{
                padding: 28px 24px;
            }}
            .headline {{
                font-size: 18px;
                font-weight: 600;
                color: #1b5e20;
                margin-bottom: 16px;
                border-left: 4px solid #2e7d32;
                padding-left: 12px;
            }}
            .card {{
                background: #f9fbf9;
                border: 1px solid #dcedc8;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
            }}
            .price-row {{
                display: flex;
                justify-content: space-between;
                padding: 10px 0;
                border-bottom: 1px dashed #dcedc8;
                font-size: 15px;
            }}
            .price-row:last-child {{
                border-bottom: none;
            }}
            .price-label {{
                color: #555;
                font-weight: 500;
            }}
            .price-value {{
                font-weight: 700;
                color: #2e7d32;
            }}
            .highlight-price {{
                color: #d32f2f;
                font-size: 18px;
            }}
            .message-box {{
                background-color: #e8f5e9;
                border-radius: 8px;
                padding: 14px 18px;
                margin: 18px 0;
                font-size: 14px;
                color: #1b5e20;
                line-height: 1.5;
            }}
            .footer {{
                background-color: #f1f8e9;
                text-align: center;
                padding: 18px 20px;
                font-size: 12px;
                color: #689f38;
                border-top: 1px solid #e0e0e0;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🌾 Krishi Mitra</h1>
                <p>Smart Price Analysis & Agricultural Intelligence</p>
                <div class="badge">🎯 Target Price Reached!</div>
            </div>
            <div class="content">
                <div class="headline">
                    {crop} price has reached your target price!
                </div>
                <p>Hello Farmer,</p>
                <p>Great news! The market price for <strong>{crop}</strong> in <strong>{market}</strong> has met or crossed your desired target price threshold.</p>
                
                <div class="card">
                    <div class="price-row">
                        <span class="price-label">🌾 Crop:</span>
                        <span class="price-value">{crop}</span>
                    </div>
                    <div class="price-row">
                        <span class="price-label">📍 Market / Mandi:</span>
                        <span class="price-value">{market}</span>
                    </div>
                    <div class="price-row">
                        <span class="price-label">🎯 Your Target Price:</span>
                        <span class="price-value">₹{target_price:,.2f} / Quintal</span>
                    </div>
                    <div class="price-row">
                        <span class="price-label">📈 Current Market Price:</span>
                        <span class="price-value highlight-price">₹{current_price:,.2f} / Quintal</span>
                    </div>
                </div>

                <div class="message-box">
                    💡 <strong>Pro Tip:</strong> Prices are favorable right now. You can check market volume and trends on the Krishi Mitra dashboard to plan your dispatch.
                </div>
            </div>
            <div class="footer">
                <p>This automated alert was generated by Krishi Mitra Smart Price Alert Service.</p>
                <p>© 2026 Krishi Mitra - Supporting Farmers with Smart Analytics</p>
            </div>
        </div>
    </body>
    </html>
    """

    params = {
        "from": from_email,
        "to": [farmer_email.strip()],
        "subject": subject,
        "html": html_content,
        "text": text_content,
    }

    try:
        response = resend.Emails.send(params)
        email_id = getattr(response, "id", None) or (response.get("id") if isinstance(response, dict) else str(response))
        return {
            "success": True,
            "id": email_id,
            "message": f"Price alert email sent successfully to {farmer_email}"
        }
    except Exception as e:
        error_msg = str(e)
        print(f"[Resend Error] Failed sending price alert email to {farmer_email}: {error_msg}")
        return {
            "success": False,
            "error": error_msg
        }

def send_test_email(to_email: str = None):
    """
    Send a test email using Resend to verify configuration.
    """
    api_key = get_resend_api_key()
    if not api_key:
        return {
            "success": False,
            "error": "RESEND_API_KEY is not set or still has default placeholder in .env file."
        }

    recipient = to_email or os.getenv("TEST_EMAIL", "test@example.com")
    if not recipient or not is_valid_email(recipient) or recipient == "your-email@example.com":
        return {
            "success": False,
            "error": f"Please provide a valid recipient email or configure TEST_EMAIL in .env. Current value: '{recipient}'"
        }

    resend.api_key = api_key
    from_email = get_sender_email()

    subject = "Krishi Mitra - Test Email Verification 🚀"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; background-color: #f4f7f4; padding: 20px; }}
            .card {{ max-width: 520px; margin: auto; background: white; padding: 25px; border-radius: 10px; border: 1px solid #c8e6c9; }}
            h2 {{ color: #2e7d32; margin-top: 0; }}
            .success-pill {{ background: #e8f5e9; color: #1b5e20; padding: 8px 14px; border-radius: 20px; display: inline-block; font-weight: bold; }}
        </style>
    </head>
    <body>
        <div class="card">
            <h2>🌾 Krishi Mitra Email Service</h2>
            <div class="success-pill">✅ Resend API Connected Successfully!</div>
            <p style="margin-top: 15px; color: #333; line-height: 1.6;">
                Congratulations! Your Resend API integration is working perfectly. You will now receive smart real-time price alerts when crop prices reach your target threshold.
            </p>
            <p style="color: #666; font-size: 13px; border-top: 1px solid #eee; padding-top: 10px;">
                Recipient: <strong>{recipient}</strong><br/>
                Sent via: <strong>Resend Official Python SDK</strong>
            </p>
        </div>
    </body>
    </html>
    """

    params = {
        "from": from_email,
        "to": [recipient.strip()],
        "subject": subject,
        "html": html_content,
        "text": f"Krishi Mitra Email Test: Resend API is successfully configured! Sent to {recipient}."
    }

    try:
        response = resend.Emails.send(params)
        email_id = getattr(response, "id", None) or (response.get("id") if isinstance(response, dict) else str(response))
        return {
            "success": True,
            "id": email_id,
            "message": f"Test email sent successfully to {recipient}"
        }
    except Exception as e:
        error_msg = str(e)
        print(f"[Resend Error] Test email failed: {error_msg}")
        return {
            "success": False,
            "error": error_msg
        }
