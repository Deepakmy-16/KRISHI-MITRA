"""
Recommendation Routes — Krishi Mitra
=====================================
Blueprint that adds:
  POST /api/recommend-crop  — crop recommendation (state+district+season+soil)
  POST /api/recommend-seed  — seed variety recommendation (crop+state+season)
  GET  /api/rec-meta        — soil types, seasons, states (for frontend dropdowns)
"""

import logging
from flask import Blueprint, request, jsonify

from services.crop_recommendation_service import (
    recommend_crops,
    get_state_list,
    get_soil_types,
    get_seasons,
)
from services.seed_recommendation_service import (
    get_seed_varieties,
    get_available_crops,
    is_loaded as seed_db_loaded,
)

logger = logging.getLogger(__name__)

recommendation_bp = Blueprint("recommendation", __name__)


# ---------------------------------------------------------------------------
# GET /api/rec-meta  — dropdown data for frontend
# ---------------------------------------------------------------------------
@recommendation_bp.route("/api/rec-meta", methods=["GET"])
def get_metadata():
    """Return dropdown lists: states, soil types, seasons."""
    try:
        return jsonify({
            "states": get_state_list(),
            "soil_types": get_soil_types(),
            "seasons": get_seasons(),
            "seed_db_ready": seed_db_loaded(),
        })
    except Exception as exc:
        logger.exception("rec-meta error")
        return jsonify({"error": str(exc)}), 500


# ---------------------------------------------------------------------------
# POST /api/recommend-crop
# ---------------------------------------------------------------------------
@recommendation_bp.route("/api/recommend-crop", methods=["POST"])
def api_recommend_crop():
    """
    Request JSON:
    {
        "state":       "Karnataka",
        "district":    "Mandya",
        "season":      "Kharif (Monsoon – Jun–Oct)",
        "soil_type":   "Black Soil (Regur / Cotton Soil)",
        "temperature": 29.5   // optional — from weather API
    }

    Response JSON:
    {
        "success": true,
        "state": "Karnataka",
        "district": "Mandya",
        "season": "Kharif (Monsoon – Jun–Oct)",
        "soil_type": "Black Soil (Regur / Cotton Soil)",
        "count": 8,
        "crops": [ {name, emoji, description, score, reasons, ...}, ... ]
    }
    """
    try:
        data = request.get_json(silent=True) or {}

        state     = (data.get("state") or "").strip()
        district  = (data.get("district") or "").strip()
        season    = (data.get("season") or "").strip()
        soil_type = (data.get("soil_type") or "").strip()
        temp      = data.get("temperature")

        # ── Validation ────────────────────────────────────────────────────
        errors = []
        if not state:
            errors.append("'state' is required.")
        if not season:
            errors.append("'season' is required.")
        if not soil_type:
            errors.append("'soil_type' is required.")
        if errors:
            return jsonify({"success": False, "errors": errors}), 400

        # Optional temperature coercion
        temperature = None
        if temp is not None:
            try:
                temperature = float(temp)
            except (ValueError, TypeError):
                temperature = None

        crops = recommend_crops(
            state=state,
            district=district,
            season=season,
            soil_type=soil_type,
            temperature=temperature,
            limit=10,
        )

        # Auto-record recommendation into history
        rec_id = None
        try:
            from services.history_service import record_crop_recommendation
            rec_id = record_crop_recommendation(
                state=state,
                district=district,
                season=season,
                soil_type=soil_type,
                temperature=temperature,
                crops=crops
            )
        except Exception as h_err:
            logger.warning(f"Failed to auto-record history: {h_err}")

        return jsonify({
            "success": True,
            "id": rec_id,
            "state": state,
            "district": district,
            "season": season,
            "soil_type": soil_type,
            "count": len(crops),
            "crops": crops,
        })

    except Exception as exc:
        logger.exception("recommend-crop error")
        return jsonify({"success": False, "error": f"Server error: {str(exc)}"}), 500


# ---------------------------------------------------------------------------
# POST /api/recommend-seed
# ---------------------------------------------------------------------------
@recommendation_bp.route("/api/recommend-seed", methods=["POST"])
def api_recommend_seed():
    """
    Request JSON:
    {
        "crop":    "Rice / Paddy",
        "state":   "Karnataka",
        "season":  "Kharif (Monsoon – Jun–Oct)",
        "soil_type": "Red and Yellow Soil"
    }

    Response JSON:
    {
        "success": true,
        "crop": "Rice / Paddy",
        "found": true,
        "total_matched": 12,
        "varieties": [ {Variety: "...", ...}, ... ],
        "note": "Showing top 10 ..."
    }
    """
    try:
        data = request.get_json(silent=True) or {}

        crop      = (data.get("crop") or "").strip()
        state     = (data.get("state") or "").strip()
        season    = (data.get("season") or "").strip()
        soil_type = (data.get("soil_type") or "").strip()

        if not crop:
            return jsonify({"success": False, "error": "'crop' is required."}), 400

        result = get_seed_varieties(
            crop=crop,
            state=state,
            season=season,
            soil_type=soil_type,
            limit=12,
        )

        return jsonify({"success": True, **result})

    except Exception as exc:
        logger.exception("recommend-seed error")
        return jsonify({"success": False, "error": f"Server error: {str(exc)}"}), 500


# ---------------------------------------------------------------------------
# GET /api/seed-crops — list of crops available in seed database
# ---------------------------------------------------------------------------
@recommendation_bp.route("/api/seed-crops", methods=["GET"])
def api_seed_crops():
    """Return list of crop names present in the seed varieties CSV."""
    try:
        return jsonify({
            "success": True,
            "crops": get_available_crops(),
        })
    except Exception as exc:
        logger.exception("seed-crops error")
        return jsonify({"success": False, "error": str(exc)}), 500
