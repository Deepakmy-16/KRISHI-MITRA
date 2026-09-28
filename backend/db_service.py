import os
import sqlite3
from datetime import datetime
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
dotenv_path = os.path.join(BASE_DIR, "..", ".env")
load_dotenv(dotenv_path=dotenv_path)

# Supabase Client Initialization (if credentials provided)
supabase_client = None
SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "").strip() or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip() or os.getenv("SUPABASE_ANON_KEY", "").strip()

if SUPABASE_URL and SUPABASE_KEY and SUPABASE_URL != "your_supabase_url_here":
    try:
        from supabase import create_client, Client
        supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("Connected to Supabase PostgreSQL database.")
    except Exception as e:
        print(f"Supabase connection warning: {e}. Falling back to local database.")
        supabase_client = None

# SQLite Local Database Setup (Always ready as fallback or primary)
LOCAL_DB_PATH = os.path.join(BASE_DIR, "data", "alerts.db")
os.makedirs(os.path.join(BASE_DIR, "data"), exist_ok=True)


def _now():
    return datetime.utcnow().isoformat()


def _ensure_column(cursor, table, column, definition):
    cursor.execute(f"PRAGMA table_info({table})")
    existing = {row[1] for row in cursor.fetchall()}
    if column not in existing:
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")


def init_local_db():
    """Ensure local SQLite table exists with schema matching existing alerts plus SMS fields."""
    conn = sqlite3.connect(LOCAL_DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS price_alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            farmer_id TEXT,
            farmer_email TEXT NOT NULL DEFAULT '',
            crop TEXT NOT NULL,
            market TEXT NOT NULL DEFAULT 'All Markets',
            target_price REAL NOT NULL,
            alert_enabled INTEGER DEFAULT 1,
            alert_sent INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now', 'localtime'))
        )
    """)
    _ensure_column(cursor, "price_alerts", "user_id", "TEXT")
    _ensure_column(cursor, "price_alerts", "phone_number", "TEXT")
    _ensure_column(cursor, "price_alerts", "active", "INTEGER DEFAULT 1")
    _ensure_column(cursor, "price_alerts", "updated_at", "TEXT")
    cursor.execute("""
        UPDATE price_alerts
        SET active = COALESCE(active, alert_enabled, 1),
            updated_at = COALESCE(updated_at, created_at)
        WHERE active IS NULL OR updated_at IS NULL
    """)
    conn.commit()
    conn.close()


init_local_db()


def _row_to_alert(r):
    active = bool(r["active"] if "active" in r.keys() and r["active"] is not None else r["alert_enabled"])
    return {
        "id": r["id"],
        "user_id": r["user_id"] if "user_id" in r.keys() else None,
        "farmer_id": r["farmer_id"],
        "farmer_email": r["farmer_email"],
        "phone_number": r["phone_number"] if "phone_number" in r.keys() else "",
        "crop": r["crop"],
        "market": r["market"],
        "target_price": float(r["target_price"]),
        "alert_enabled": active,
        "active": active,
        "alert_sent": bool(r["alert_sent"]),
        "created_at": r["created_at"],
        "updated_at": r["updated_at"] if "updated_at" in r.keys() else r["created_at"],
    }


def _format_supabase_row(row):
    active = bool(row.get("active") if row.get("active") is not None else row.get("alert_enabled", True))
    row["alert_enabled"] = active
    row["active"] = active
    row["alert_sent"] = bool(row.get("alert_sent", False))
    row["phone_number"] = row.get("phone_number") or ""
    row["user_id"] = row.get("user_id") or row.get("farmer_id")
    return row


def create_alert(
    farmer_email: str = "",
    crop: str = "",
    market: str = "All Markets",
    target_price: float = 0,
    farmer_id: str = None,
    alert_enabled: bool = True,
    phone_number: str = "",
    user_id: str = None,
):
    """
    Save a new price alert record in Supabase or SQLite.
    """
    farmer_id = farmer_id or user_id or farmer_email or phone_number
    user_id = user_id or farmer_id
    created_at = _now()
    active = bool(alert_enabled)

    payload = {
        "farmer_id": str(farmer_id),
        "user_id": str(user_id) if user_id else None,
        "farmer_email": str(farmer_email or "").strip().lower(),
        "phone_number": str(phone_number or "").strip(),
        "crop": str(crop).strip(),
        "market": str(market or "All Markets").strip(),
        "target_price": float(target_price),
        "alert_enabled": active,
        "active": active,
        "alert_sent": False,
        "created_at": created_at,
        "updated_at": created_at,
    }

    if supabase_client:
        try:
            res = supabase_client.table("price_alerts").insert(payload).execute()
            if res.data and len(res.data) > 0:
                return {"success": True, "alert": _format_supabase_row(res.data[0])}
        except Exception as e:
            print(f"[Supabase Insert Error]: {e}. Writing to local database.")

    try:
        conn = sqlite3.connect(LOCAL_DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO price_alerts (
                farmer_id, user_id, farmer_email, phone_number, crop, market,
                target_price, alert_enabled, active, alert_sent, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
        """, (
            payload["farmer_id"],
            payload["user_id"],
            payload["farmer_email"],
            payload["phone_number"],
            payload["crop"],
            payload["market"],
            payload["target_price"],
            1 if active else 0,
            1 if active else 0,
            created_at,
            created_at,
        ))
        conn.commit()
        alert_id = cursor.lastrowid
        conn.close()
        payload["id"] = alert_id
        return {"success": True, "alert": payload}
    except Exception as e:
        return {"success": False, "error": "Could not save the price alert. Please try again."}


def get_alerts(farmer_email: str = None, farmer_id: str = None, user_id: str = None):
    """
    Fetch price alerts list. Filter by user_id, farmer_id, or farmer_email.
    """
    if supabase_client:
        try:
            query = supabase_client.table("price_alerts").select("*")
            if user_id:
                query = query.eq("user_id", str(user_id))
            elif farmer_email:
                query = query.eq("farmer_email", farmer_email.strip().lower())
            elif farmer_id:
                query = query.eq("farmer_id", str(farmer_id))
            query = query.order("created_at", desc=True)
            res = query.execute()
            if res.data is not None:
                return {"success": True, "alerts": [_format_supabase_row(row) for row in res.data]}
        except Exception as e:
            print(f"[Supabase Query Error]: {e}. Reading from local database.")

    try:
        conn = sqlite3.connect(LOCAL_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        if user_id:
            cursor.execute(
                "SELECT * FROM price_alerts WHERE user_id = ? OR farmer_id = ? ORDER BY id DESC",
                (str(user_id), str(user_id)),
            )
        elif farmer_email:
            cursor.execute(
                "SELECT * FROM price_alerts WHERE farmer_email = ? ORDER BY id DESC",
                (farmer_email.strip().lower(),),
            )
        elif farmer_id:
            cursor.execute(
                "SELECT * FROM price_alerts WHERE farmer_id = ? ORDER BY id DESC",
                (str(farmer_id),),
            )
        else:
            cursor.execute("SELECT * FROM price_alerts ORDER BY id DESC")

        alerts = [_row_to_alert(r) for r in cursor.fetchall()]
        conn.close()
        return {"success": True, "alerts": alerts}
    except Exception as e:
        return {"success": False, "error": "Could not load price alerts.", "alerts": []}


def get_alert_by_id(alert_id):
    try:
        conn = sqlite3.connect(LOCAL_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM price_alerts WHERE id = ?", (alert_id,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            if supabase_client:
                try:
                    res = supabase_client.table("price_alerts").select("*").eq("id", alert_id).execute()
                    if res.data:
                        return _format_supabase_row(res.data[0])
                except Exception:
                    return None
            return None
        return _row_to_alert(row)
    except Exception:
        return None


def alert_belongs_to_user(alert, user_id: str):
    if not alert or not user_id:
        return False
    return str(alert.get("user_id") or "") == str(user_id) or str(alert.get("farmer_id") or "") == str(user_id)


def get_active_unsent_alerts():
    """
    Get all active alerts that have NOT yet been sent.
    """
    if supabase_client:
        try:
            res = (
                supabase_client.table("price_alerts")
                .select("*")
                .eq("alert_sent", False)
                .execute()
            )
            if res.data:
                return [
                    _format_supabase_row(row)
                    for row in res.data
                    if bool(row.get("active") if row.get("active") is not None else row.get("alert_enabled", True))
                ]
        except Exception as e:
            print(f"[Supabase Active Alerts Error]: {e}")

    try:
        conn = sqlite3.connect(LOCAL_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM price_alerts
            WHERE alert_sent = 0
              AND COALESCE(active, alert_enabled, 1) = 1
        """)
        alerts = [_row_to_alert(r) for r in cursor.fetchall()]
        conn.close()
        return alerts
    except Exception as e:
        print(f"[Local DB Active Alerts Error]: {e}")
        return []


def mark_alert_as_sent(alert_id):
    """Update alert_sent = True to prevent duplicate SMS/email."""
    updated_at = _now()
    if supabase_client:
        try:
            supabase_client.table("price_alerts").update({
                "alert_sent": True,
                "updated_at": updated_at,
            }).eq("id", alert_id).execute()
        except Exception as e:
            print(f"[Supabase Mark Sent Error]: {e}")

    try:
        conn = sqlite3.connect(LOCAL_DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE price_alerts SET alert_sent = 1, updated_at = ? WHERE id = ?",
            (updated_at, alert_id),
        )
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"[Local DB Mark Sent Error]: {e}")
        return False


def stop_alert(alert_id):
    """Set active = false. Price checker must not send SMS."""
    updated_at = _now()
    if supabase_client:
        try:
            supabase_client.table("price_alerts").update({
                "active": False,
                "alert_enabled": False,
                "updated_at": updated_at,
            }).eq("id", alert_id).execute()
        except Exception as e:
            print(f"[Supabase Stop Error]: {e}")

    try:
        conn = sqlite3.connect(LOCAL_DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE price_alerts
            SET active = 0, alert_enabled = 0, updated_at = ?
            WHERE id = ?
            """,
            (updated_at, alert_id),
        )
        conn.commit()
        changed = cursor.rowcount
        conn.close()
        return changed > 0
    except Exception as e:
        print(f"[Local DB Stop Error]: {e}")
        return False


def resume_alert(alert_id):
    """Set active = true and reset alert_sent so SMS can fire again."""
    updated_at = _now()
    if supabase_client:
        try:
            supabase_client.table("price_alerts").update({
                "active": True,
                "alert_enabled": True,
                "alert_sent": False,
                "updated_at": updated_at,
            }).eq("id", alert_id).execute()
        except Exception as e:
            print(f"[Supabase Resume Error]: {e}")

    try:
        conn = sqlite3.connect(LOCAL_DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE price_alerts
            SET active = 1, alert_enabled = 1, alert_sent = 0, updated_at = ?
            WHERE id = ?
            """,
            (updated_at, alert_id),
        )
        conn.commit()
        changed = cursor.rowcount
        conn.close()
        return changed > 0
    except Exception as e:
        print(f"[Local DB Resume Error]: {e}")
        return False


def toggle_alert(alert_id, enabled: bool = None):
    """
    Toggle or update the alert_enabled/active state of an alert.
    """
    if enabled is False:
        return stop_alert(alert_id)
    if enabled is True:
        return resume_alert(alert_id)

    alert = get_alert_by_id(alert_id)
    if not alert:
        return False
    if alert.get("active"):
        return stop_alert(alert_id)
    return resume_alert(alert_id)


def delete_alert(alert_id):
    """Delete a price alert by ID."""
    if supabase_client:
        try:
            supabase_client.table("price_alerts").delete().eq("id", alert_id).execute()
        except Exception as e:
            print(f"[Supabase Delete Error]: {e}")

    try:
        conn = sqlite3.connect(LOCAL_DB_PATH)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM price_alerts WHERE id = ?", (alert_id,))
        conn.commit()
        changed = cursor.rowcount
        conn.close()
        return changed > 0
    except Exception as e:
        print(f"[Local DB Delete Error]: {e}")
        return False
