import re
from db_service import get_active_unsent_alerts, mark_alert_as_sent
from email_service import send_price_alert_email
from services.sms_service import send_price_alert as send_price_alert_sms, normalize_indian_phone


def extract_price_value(record):
    """Safely extract price as float from a crop market record dictionary."""
    for key in ["Modal_x0020_Price", "Modal_Price", "price", "Max_x0020_Price", "Min_x0020_Price"]:
        val = record.get(key)
        if val is not None:
            try:
                cleaned = re.sub(r"[^\d.]", "", str(val))
                if cleaned:
                    return float(cleaned)
            except (ValueError, TypeError):
                continue
    return 0.0


def find_crop_price(crop_name: str, market_name: str, live_data: list):
    """
    Search live crop records for a matching crop and market.
    Returns (matched_record, price_float).
    """
    if not live_data or not crop_name:
        return None, 0.0

    target_crop = crop_name.strip().lower()
    target_market = (market_name or "").strip().lower()

    best_match = None
    best_price = 0.0

    for item in live_data:
        c_name = str(
            item.get("Commodity") or item.get("commodity") or item.get("Crop") or item.get("crop_name") or ""
        ).strip().lower()
        m_name = str(item.get("Market") or item.get("market") or "").strip().lower()

        if c_name == target_crop or target_crop in c_name:
            price = extract_price_value(item)
            if price <= 0:
                continue

            if target_market and target_market not in ["all markets", "any", "all", ""]:
                if m_name == target_market or target_market in m_name:
                    return item, price

            if best_match is None or price > best_price:
                best_match = item
                best_price = price

    return best_match, best_price


def _dispatch_alert(alert, current_price, market_display):
    """
    Send SMS (preferred when a phone number exists) and optional email.
    Returns (channel_success, details). SMS failure must not mark alert_sent.
    """
    crop = alert.get("crop")
    target_price = float(alert.get("target_price") or 0)
    phone = normalize_indian_phone(alert.get("phone_number") or "")
    email = (alert.get("farmer_email") or "").strip()
    details = {"sms": None, "email": None}

    sms_ok = False
    email_ok = False

    if phone:
        sms_res = send_price_alert_sms(phone, crop, current_price, target_price)
        details["sms"] = "SENT" if sms_res.get("success") else sms_res.get("error")
        sms_ok = bool(sms_res.get("success"))
    elif email:
        email_res = send_price_alert_email(
            farmer_email=email,
            crop=crop,
            market=market_display,
            current_price=current_price,
            target_price=target_price,
        )
        details["email"] = "SENT" if email_res.get("success") else email_res.get("error")
        email_ok = bool(email_res.get("success"))

    return (sms_ok or email_ok), details


def check_and_trigger_price_alerts(live_data: list):
    """
    Evaluate active alerts against live crop prices.

    If current_price >= target_price AND active AND not alert_sent:
      send SMS via Twilio (or email fallback)
      mark alert_sent only after a successful send
    """
    active_alerts = get_active_unsent_alerts()
    results = []

    if not active_alerts:
        return {"total_checked": 0, "triggered": 0, "results": []}

    triggered_count = 0

    for alert in active_alerts:
        alert_id = alert["id"]
        crop = alert["crop"]
        market = alert.get("market", "All Markets")
        target_price = float(alert["target_price"])
        is_active = bool(alert.get("active", alert.get("alert_enabled", True)))
        alert_sent = bool(alert.get("alert_sent", False))

        if not is_active or alert_sent:
            continue

        matched_record, current_price = find_crop_price(crop, market, live_data)

        if current_price > 0 and current_price >= target_price:
            market_display = (
                (matched_record.get("Market") or matched_record.get("market") or market)
                if matched_record
                else market
            )
            print(
                f"[Price Alert] {crop} current ₹{current_price} >= target ₹{target_price}"
            )

            sent_ok, details = _dispatch_alert(alert, current_price, market_display)
            if sent_ok:
                mark_alert_as_sent(alert_id)
                triggered_count += 1
                results.append({
                    "alert_id": alert_id,
                    "crop": crop,
                    "current_price": current_price,
                    "target_price": target_price,
                    "status": "SENT",
                    "channels": details,
                })
            else:
                results.append({
                    "alert_id": alert_id,
                    "crop": crop,
                    "current_price": current_price,
                    "target_price": target_price,
                    "status": "SEND_FAILED",
                    "channels": details,
                })
        else:
            results.append({
                "alert_id": alert_id,
                "crop": crop,
                "current_price": current_price,
                "target_price": target_price,
                "status": "PRICE_BELOW_TARGET" if current_price > 0 else "PRICE_UNAVAILABLE",
            })

    return {
        "total_checked": len(active_alerts),
        "triggered": triggered_count,
        "results": results,
    }
