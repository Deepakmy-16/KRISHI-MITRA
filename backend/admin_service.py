import os
import sqlite3
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ADMIN_DB_PATH = os.path.join(BASE_DIR, "data", "admin.db")

# Admin credentials from env (set these in Render dashboard)
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "KrishiAdmin@2024")
ADMIN_SECRET_KEY = os.getenv("ADMIN_SECRET_KEY", "krishi-admin-secret-2024")


def _now():
    return datetime.utcnow().isoformat()


def init_admin_db():
    """Create admin tables: user_logins, user_sessions."""
    os.makedirs(os.path.join(BASE_DIR, "data"), exist_ok=True)
    conn = sqlite3.connect(ADMIN_DB_PATH)
    cursor = conn.cursor()

    # Track every login event
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_logins (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id     TEXT NOT NULL,
            name        TEXT DEFAULT '',
            email       TEXT DEFAULT '',
            phone       TEXT DEFAULT '',
            photo       TEXT DEFAULT '',
            event       TEXT DEFAULT 'login',   -- 'login' | 'logout' | 'visit'
            page        TEXT DEFAULT '',
            ip          TEXT DEFAULT '',
            user_agent  TEXT DEFAULT '',
            logged_at   TEXT DEFAULT (datetime('now'))
        )
    """)

    # Track unique users (upserted on each login)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS known_users (
            user_id         TEXT PRIMARY KEY,
            name            TEXT DEFAULT '',
            email           TEXT DEFAULT '',
            phone           TEXT DEFAULT '',
            photo           TEXT DEFAULT '',
            first_seen      TEXT DEFAULT (datetime('now')),
            last_seen       TEXT DEFAULT (datetime('now')),
            total_logins    INTEGER DEFAULT 0
        )
    """)

    conn.commit()
    conn.close()


init_admin_db()


# ─── Admin auth helpers ─────────────────────────────────────────────────────

def verify_admin(username: str, password: str) -> bool:
    return username == ADMIN_USERNAME and password == ADMIN_PASSWORD


def verify_admin_token(token: str) -> bool:
    return token == ADMIN_SECRET_KEY


# ─── Record login event ──────────────────────────────────────────────────────

def record_login(user_id: str, name: str = "", email: str = "",
                 phone: str = "", photo: str = "",
                 event: str = "login", page: str = "",
                 ip: str = "", user_agent: str = ""):
    """Call this every time a user logs in / visits."""
    if not user_id:
        return
    now = _now()
    conn = sqlite3.connect(ADMIN_DB_PATH)
    cursor = conn.cursor()

    # Insert login event
    cursor.execute("""
        INSERT INTO user_logins (user_id, name, email, phone, photo, event, page, ip, user_agent, logged_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (user_id, name, email, phone, photo, event, page, ip, user_agent, now))

    # Upsert known_users
    cursor.execute("""
        INSERT INTO known_users (user_id, name, email, phone, photo, first_seen, last_seen, total_logins)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        ON CONFLICT(user_id) DO UPDATE SET
            name         = COALESCE(NULLIF(excluded.name, ''), known_users.name),
            email        = COALESCE(NULLIF(excluded.email, ''), known_users.email),
            phone        = COALESCE(NULLIF(excluded.phone, ''), known_users.phone),
            photo        = COALESCE(NULLIF(excluded.photo, ''), known_users.photo),
            last_seen    = excluded.last_seen,
            total_logins = known_users.total_logins + 1
    """, (user_id, name, email, phone, photo, now, now))

    conn.commit()
    conn.close()


# ─── Admin data queries ──────────────────────────────────────────────────────

def get_all_users():
    """Return all known users with their login counts."""
    conn = sqlite3.connect(ADMIN_DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM known_users ORDER BY last_seen DESC")
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows


def get_login_history(limit: int = 200, user_id: str = None):
    """Return recent login events."""
    conn = sqlite3.connect(ADMIN_DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    if user_id:
        cursor.execute(
            "SELECT * FROM user_logins WHERE user_id=? ORDER BY id DESC LIMIT ?",
            (user_id, limit)
        )
    else:
        cursor.execute(
            "SELECT * FROM user_logins ORDER BY id DESC LIMIT ?",
            (limit,)
        )
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows


def get_stats():
    """Return summary stats for the admin dashboard."""
    conn = sqlite3.connect(ADMIN_DB_PATH)
    cursor = conn.cursor()

    total_users  = cursor.execute("SELECT COUNT(*) FROM known_users").fetchone()[0]
    total_logins = cursor.execute("SELECT COUNT(*) FROM user_logins WHERE event='login'").fetchone()[0]

    # Active today (UTC)
    today = datetime.utcnow().strftime("%Y-%m-%d")
    today_logins = cursor.execute(
        "SELECT COUNT(DISTINCT user_id) FROM user_logins WHERE logged_at LIKE ? AND event='login'",
        (f"{today}%",)
    ).fetchone()[0]

    # Last 7 days activity per day
    weekly = cursor.execute("""
        SELECT substr(logged_at, 1, 10) as day, COUNT(*) as cnt
        FROM user_logins
        WHERE event='login'
          AND logged_at >= datetime('now', '-7 days')
        GROUP BY day
        ORDER BY day ASC
    """).fetchall()

    conn.close()
    return {
        "total_users":   total_users,
        "total_logins":  total_logins,
        "today_active":  today_logins,
        "weekly_chart":  [{"day": r[0], "logins": r[1]} for r in weekly],
    }
