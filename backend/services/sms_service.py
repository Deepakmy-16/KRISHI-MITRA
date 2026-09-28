import os
import re
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(dotenv_path=os.path.join(BASE_DIR, "..", ".env"))

_INDIAN_MOBILE = re.compile(r"^[6-9]\d{9}$")


def _twilio_config():
    """Load Twilio settings from environment. Never log secret values."""
    return {
        "account_sid": os.getenv("TWILIO_ACCOUNT_SID", "").strip(),
        "auth_token": os.getenv("TWILIO_AUTH_TOKEN", "").strip(),
        "from_number": os.getenv("TWILIO_PHONE_NUMBER", "").strip(),
    }


def is_twilio_configured():
    cfg = _twilio_config()
    sid, token, from_number = cfg["account_sid"], cfg["auth_token"], cfg["from_number"]
    if not sid or not token or not from_number:
        return False
    placeholders = {
        "...",
        "your_twilio_account_sid",
        "your_twilio_auth_token",
        "your_twilio_phone_number",
    }
    return sid not in placeholders and token not in placeholders and from_number not in placeholders


def normalize_indian_phone(phone_number: str):
    """
    Accept common Indian formats and return E.164 (+91XXXXXXXXXX).
    Returns None if invalid.
    """
    if not phone_number or not isinstance(phone_number, str):
        return None

    raw = phone_number.strip()
    digits = re.sub(r"\D", "", raw)

    if digits.startswith("91") and len(digits) == 12:
        digits = digits[2:]
    elif digits.startswith("0") and len(digits) == 11:
        digits = digits[1:]

    if not _INDIAN_MOBILE.match(digits):
        return None

    return f"+91{digits}"


def _safe_error(exc):
    """Return a user-facing message without credentials or stack traces."""
    code = getattr(exc, "status", None) or getattr(exc, "code", None)
    if code in (20003, 401, 403):
        return "SMS service authentication failed. Check backend Twilio settings."
    if code in (21211, 21614, 21408):
        return "Invalid or unsupported phone number for SMS."
    if code in (21608, 21610):
        return "This phone number cannot receive SMS from the configured Twilio number."
    return "Could not send SMS right now. Please try again later."


def send_sms(phone_number: str, body: str):
    """
    Send a generic SMS via Twilio.
    Returns {"success": bool, "error": optional str, "sid": optional str}.
    """
    if not is_twilio_configured():
        return {
            "success": False,
            "error": "SMS is not configured. Add Twilio settings to the backend .env file.",
        }

    e164 = normalize_indian_phone(phone_number)
    if not e164:
        return {
            "success": False,
            "error": "Enter a valid Indian mobile number (10 digits, starting with 6-9).",
        }

    if not body or not str(body).strip():
        return {"success": False, "error": "SMS message cannot be empty."}

    cfg = _twilio_config()
    try:
        from twilio.rest import Client
        from twilio.base.exceptions import TwilioRestException

        client = Client(cfg["account_sid"], cfg["auth_token"])
        message = client.messages.create(
            to=e164,
            from_=cfg["from_number"],
            body=str(body).strip(),
        )
        return {"success": True, "sid": getattr(message, "sid", None), "to": e164}
    except TwilioRestException as exc:
        print("[Twilio] SMS send failed.")
        return {"success": False, "error": _safe_error(exc)}
    except Exception:
        print("[Twilio] Unexpected SMS error.")
        return {"success": False, "error": "Could not send SMS right now. Please try again later."}


def send_price_alert(phone_number, crop, current_price, target_price):
    """Send a crop price alert SMS through Twilio."""
    crop_name = str(crop or "Crop").strip()
    try:
        current_fmt = f"{float(current_price):.0f}"
        target_fmt = f"{float(target_price):.0f}"
    except (TypeError, ValueError):
        return {"success": False, "error": "Invalid price values for SMS."}

    body = (
        "Krishi Mitra Price Alert:\n"
        f"{crop_name} price has reached ₹{current_fmt}/quintal.\n"
        f"Your target price was ₹{target_fmt}/quintal."
    )
    return send_sms(phone_number, body)


def send_test_sms(phone_number):
    """Development-only test message. Does not expose credentials."""
    body = (
        "Krishi Mitra test SMS: your Twilio connection is working. "
        "You will receive crop price alerts on this number."
    )
    return send_sms(phone_number, body)
