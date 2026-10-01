from flask import Blueprint, request, jsonify
import admin_service

admin_bp = Blueprint("admin", __name__)


def _require_admin():
    """Check Authorization header: Bearer <ADMIN_SECRET_KEY>"""
    auth = request.headers.get("Authorization", "")
    token = auth.replace("Bearer ", "").strip()
    if not admin_service.verify_admin_token(token):
        return jsonify({"success": False, "error": "Unauthorized"}), 401
    return None


# ─── Admin login ────────────────────────────────────────────────────────────

@admin_bp.route("/api/admin/login", methods=["POST"])
def admin_login():
    data = request.get_json(silent=True) or {}
    username = str(data.get("username", "")).strip()
    password = str(data.get("password", "")).strip()

    if admin_service.verify_admin(username, password):
        return jsonify({
            "success": True,
            "token": admin_service.ADMIN_SECRET_KEY,
            "message": "Welcome, Admin!"
        })
    return jsonify({"success": False, "error": "Invalid username or password."}), 401


# ─── Track user login event (called by frontend on auth) ───────────────────

@admin_bp.route("/api/admin/track-login", methods=["POST"])
def track_login():
    """Frontend calls this after a user logs in via Clerk."""
    data = request.get_json(silent=True) or {}
    user_id = str(data.get("user_id", "")).strip()
    if not user_id:
        return jsonify({"success": False, "error": "user_id required"}), 400

    admin_service.record_login(
        user_id=user_id,
        name=str(data.get("name", "")),
        email=str(data.get("email", "")),
        phone=str(data.get("phone", "")),
        photo=str(data.get("photo", "")),
        event=str(data.get("event", "login")),
        page=str(data.get("page", "")),
        ip=request.remote_addr or "",
        user_agent=request.headers.get("User-Agent", ""),
    )
    return jsonify({"success": True})


# ─── Protected admin endpoints ──────────────────────────────────────────────

@admin_bp.route("/api/admin/stats", methods=["GET"])
def admin_stats():
    err = _require_admin()
    if err:
        return err
    return jsonify({"success": True, "stats": admin_service.get_stats()})


@admin_bp.route("/api/admin/users", methods=["GET"])
def admin_users():
    err = _require_admin()
    if err:
        return err
    return jsonify({"success": True, "users": admin_service.get_all_users()})


@admin_bp.route("/api/admin/history", methods=["GET"])
def admin_history():
    err = _require_admin()
    if err:
        return err
    limit = int(request.args.get("limit", 200))
    user_id = request.args.get("user_id", None)
    return jsonify({
        "success": True,
        "history": admin_service.get_login_history(limit=limit, user_id=user_id)
    })
