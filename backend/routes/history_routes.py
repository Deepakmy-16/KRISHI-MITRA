"""
History Routes — Krishi Mitra
=============================
Unified Farmer Activity & History API
Endpoints:
  GET    /api/history                  — Fetch activity timeline and summary stats
  GET    /api/history/stats            — Fetch summary metrics only
  POST   /api/history/record-crop      — Record a new crop recommendation
  DELETE /api/history/<type>/<id>      — Delete a single activity item
  POST   /api/history/clear            — Clear history by category
"""

import logging
from flask import Blueprint, request, jsonify

from services.history_service import (
    get_unified_history,
    get_history_stats,
    record_crop_recommendation,
    update_recommendation_seed,
    delete_history_item,
    clear_history_category,
)

logger = logging.getLogger(__name__)

history_bp = Blueprint("history_bp", __name__, url_prefix="/api/history")


@history_bp.route("", methods=["GET"])
@history_bp.route("/all", methods=["GET"])
def get_history_timeline():
    """
    Fetch unified activity timeline with optional filtering.
    Query params:
      type: 'all' | 'disease' | 'crop'
      limit: integer (default 50)
      search: string (filter keywords)
    """
    try:
        activity_type = request.args.get("type", "all").strip().lower()
        limit = int(request.args.get("limit", 50))
        search = request.args.get("search", "").strip()

        activities = get_unified_history(history_type=activity_type, limit=limit, search=search)
        stats = get_history_stats()

        return jsonify({
            "success": True,
            "count": len(activities),
            "activities": activities,
            "stats": stats
        }), 200

    except Exception as exc:
        logger.exception("Error in get_history_timeline")
        return jsonify({"success": False, "error": str(exc)}), 500


@history_bp.route("/stats", methods=["GET"])
def get_stats():
    """Fetch history summary statistics."""
    try:
        stats = get_history_stats()
        return jsonify({"success": True, "stats": stats}), 200
    except Exception as exc:
        logger.exception("Error in get_stats")
        return jsonify({"success": False, "error": str(exc)}), 500


@history_bp.route("/record-crop", methods=["POST"])
def save_crop_rec():
    """
    Record or update crop recommendation event.
    Body JSON:
      {
        state, district, season, soil_type, temperature,
        crops, selected_crop, selected_variety
      }
    """
    try:
        data = request.get_json(silent=True) or {}
        state = data.get("state", "").strip()
        district = data.get("district", "").strip()
        season = data.get("season", "").strip()
        soil_type = data.get("soil_type", "").strip()
        temperature = data.get("temperature")
        crops = data.get("crops", [])
        selected_crop = data.get("selected_crop")
        selected_variety = data.get("selected_variety")

        if not state or not season or not soil_type:
            return jsonify({"success": False, "error": "state, season, and soil_type are required"}), 400

        rec_id = record_crop_recommendation(
            state=state,
            district=district,
            season=season,
            soil_type=soil_type,
            temperature=temperature,
            crops=crops,
            selected_crop=selected_crop,
            selected_variety=selected_variety
        )

        return jsonify({
            "success": True,
            "id": rec_id,
            "message": "Recommendation saved to farmer history"
        }), 201

    except Exception as exc:
        logger.exception("Error in save_crop_rec")
        return jsonify({"success": False, "error": str(exc)}), 500


@history_bp.route("/update-seed", methods=["POST"])
def save_seed_selection():
    """Update selected seed variety for a recommendation."""
    try:
        data = request.get_json(silent=True) or {}
        rec_id = data.get("id")
        crop = data.get("selected_crop", "")
        variety = data.get("selected_variety", "")

        if not rec_id:
            return jsonify({"success": False, "error": "Recommendation ID is required"}), 400

        success = update_recommendation_seed(rec_id, crop, variety)
        return jsonify({"success": success}), 200

    except Exception as exc:
        logger.exception("Error in save_seed_selection")
        return jsonify({"success": False, "error": str(exc)}), 500


@history_bp.route("/<string:item_type>/<int:raw_id>", methods=["DELETE"])
def remove_history_item(item_type, raw_id):
    """Delete a specific diagnostic or recommendation record."""
    try:
        success, msg = delete_history_item(item_type, raw_id)
        if success:
            return jsonify({"success": True, "message": msg}), 200
        return jsonify({"success": False, "error": msg}), 404
    except Exception as exc:
        logger.exception("Error in remove_history_item")
        return jsonify({"success": False, "error": str(exc)}), 500


@history_bp.route("/clear", methods=["POST", "DELETE"])
def clear_all():
    """Clear history entries for 'all', 'disease', or 'crop'."""
    try:
        data = request.get_json(silent=True) or {}
        category = data.get("category", "all")
        success, msg = clear_history_category(category)
        return jsonify({"success": success, "message": msg}), 200
    except Exception as exc:
        logger.exception("Error in clear_all")
        return jsonify({"success": False, "error": str(exc)}), 500
