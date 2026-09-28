"""
Unified Farmer History Service — Krishi Mitra
==============================================
Manages farmer activities across:
1. Plant Disease Diagnostic Scans (SQLite: plant_disease_predictions)
2. Crop & Seed Recommendations (SQLite: crop_recommendations)
"""

import os
import sqlite3
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "users.db")

def init_history_tables():
    """Ensure both plant_disease_predictions and crop_recommendations tables exist."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        # 1. Plant Disease table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS plant_disease_predictions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER DEFAULT NULL,
                crop TEXT NOT NULL,
                disease TEXT NOT NULL,
                confidence REAL NOT NULL,
                status TEXT NOT NULL,
                image_name TEXT,
                recommendations TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # 2. Crop Recommendations table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS crop_recommendations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER DEFAULT NULL,
                state TEXT NOT NULL,
                district TEXT DEFAULT '',
                season TEXT NOT NULL,
                soil_type TEXT NOT NULL,
                temperature REAL DEFAULT NULL,
                top_crops TEXT,
                selected_crop TEXT DEFAULT '',
                selected_variety TEXT DEFAULT '',
                notes TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Seed sample crop recommendations if none exist
        cursor.execute("SELECT COUNT(*) FROM crop_recommendations")
        crop_count = cursor.fetchone()[0]
        if crop_count == 0:
            sample_recs = [
                (
                    None,
                    "Karnataka",
                    "Mandya",
                    "Kharif (Monsoon – Jun–Oct)",
                    "Red and Yellow Soil",
                    28.5,
                    json.dumps([
                        {"name": "Rice / Paddy", "emoji": "🍚", "score": 100, "duration": "120–150 days"},
                        {"name": "Finger Millet (Ragi)", "emoji": "🌾", "score": 95, "duration": "100–120 days"},
                        {"name": "Sugarcane", "emoji": "🎋", "score": 90, "duration": "300–360 days"}
                    ]),
                    "Rice / Paddy",
                    "JGL 1798 (Jadcherla Samba)",
                    "Recommended based on monsoon rainfall and red loamy soil."
                ),
                (
                    None,
                    "Punjab",
                    "Ludhiana",
                    "Rabi (Winter – Oct–Mar)",
                    "Alluvial Soil (Bangar/Khadar)",
                    18.2,
                    json.dumps([
                        {"name": "Wheat", "emoji": "🌾", "score": 100, "duration": "110–130 days"},
                        {"name": "Mustard", "emoji": "🌼", "score": 95, "duration": "105–125 days"},
                        {"name": "Chickpea (Gram)", "emoji": "🌱", "score": 85, "duration": "95–115 days"}
                    ]),
                    "Wheat",
                    "HD-3086 (Pusa Gautami)",
                    "Ideal Rabi planting window with cold dry weather."
                ),
                (
                    None,
                    "Maharashtra",
                    "Nashik",
                    "Zaid (Summer – Mar–Jun)",
                    "Black Soil (Regur / Cotton Soil)",
                    32.0,
                    json.dumps([
                        {"name": "Onion", "emoji": "🧅", "score": 98, "duration": "90–110 days"},
                        {"name": "Watermelon", "emoji": "🍉", "score": 92, "duration": "80–95 days"},
                        {"name": "Moong Dal (Green Gram)", "emoji": "🌱", "score": 88, "duration": "60–75 days"}
                    ]),
                    "Onion",
                    "Bhima Shakti",
                    "Summer Zaid crop under drip irrigation."
                )
            ]
            cursor.executemany("""
                INSERT INTO crop_recommendations 
                (user_id, state, district, season, soil_type, temperature, top_crops, selected_crop, selected_variety, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, sample_recs)

        conn.commit()
        conn.close()
    except Exception as e:
        logger.error(f"[HistoryService] DB init error: {e}")

# Call init once upon import
init_history_tables()


def record_crop_recommendation(state, district, season, soil_type, temperature, crops, selected_crop=None, selected_variety=None, user_id=None):
    """Save a generated crop recommendation into SQLite."""
    try:
        init_history_tables()
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        # Simplify crops list to top 4 for storage
        top_crops_summary = []
        if crops and isinstance(crops, list):
            for c in crops[:5]:
                top_crops_summary.append({
                    "name": c.get("name"),
                    "emoji": c.get("emoji", "🌱"),
                    "score": c.get("score", 0),
                    "duration": c.get("duration_days", "N/A"),
                    "water": c.get("water_requirement", "N/A"),
                    "reasons": c.get("reasons", [])[:2]
                })

        top_crops_json = json.dumps(top_crops_summary)

        cursor.execute("""
            INSERT INTO crop_recommendations
            (user_id, state, district, season, soil_type, temperature, top_crops, selected_crop, selected_variety)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            user_id,
            state,
            district or "",
            season,
            soil_type,
            temperature,
            top_crops_json,
            selected_crop or (top_crops_summary[0]["name"] if top_crops_summary else ""),
            selected_variety or ""
        ))
        rec_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return rec_id
    except Exception as e:
        logger.error(f"[HistoryService] Record crop recommendation error: {e}")
        return None


def update_recommendation_seed(rec_id, selected_crop, selected_variety):
    """Update user's chosen seed variety on an existing recommendation record."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE crop_recommendations
            SET selected_crop = ?, selected_variety = ?
            WHERE id = ?
        """, (selected_crop, selected_variety, rec_id))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        logger.error(f"[HistoryService] Update seed variety error: {e}")
        return False


def get_unified_history(history_type="all", limit=50, search=""):
    """
    Fetch unified timeline combining plant disease diagnostics and crop recommendations.
    Sorts chronologically descending.
    """
    init_history_tables()
    activities = []
    search_term = (search or "").strip().lower()

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        # 1. Fetch Disease Diagnostics
        if history_type in ("all", "disease", "plant_disease"):
            cursor.execute("""
                SELECT id, crop, disease, confidence, status, image_name, recommendations, created_at
                FROM plant_disease_predictions
                ORDER BY id DESC LIMIT ?
            """, (limit,))
            disease_rows = cursor.fetchall()
            for r in disease_rows:
                raw_id, crop, disease, confidence, status, image_name, recs_text, created_at = r
                recs = recs_text.split("; ") if recs_text else []
                
                is_healthy = str(status).strip().lower() == "healthy" or "healthy" in disease.lower()

                # Filter if search term given
                match_text = f"{crop} {disease} {status}".lower()
                if search_term and search_term not in match_text:
                    continue

                activities.append({
                    "id": f"disease_{raw_id}",
                    "raw_id": raw_id,
                    "type": "disease",
                    "type_label": "Plant Health Diagnostic",
                    "title": f"{crop} — {disease}",
                    "subtitle": f"Confidence: {confidence:.1f}%",
                    "badge": "Healthy Leaf" if is_healthy else "Disease Detected",
                    "badge_type": "success" if is_healthy else "danger",
                    "status": status,
                    "confidence": confidence,
                    "crop": crop,
                    "disease": disease,
                    "image_name": image_name,
                    "recommendations": recs,
                    "created_at": created_at,
                    "timestamp": created_at
                })

        # 2. Fetch Crop Recommendations
        if history_type in ("all", "crop", "crop_recommendation"):
            cursor.execute("""
                SELECT id, state, district, season, soil_type, temperature, top_crops, selected_crop, selected_variety, notes, created_at
                FROM crop_recommendations
                ORDER BY id DESC LIMIT ?
            """, (limit,))
            crop_rows = cursor.fetchall()
            for r in crop_rows:
                raw_id, state, district, season, soil_type, temperature, top_crops_json, selected_crop, selected_variety, notes, created_at = r
                
                try:
                    top_crops = json.loads(top_crops_json) if top_crops_json else []
                except Exception:
                    top_crops = []

                location_str = f"{district}, {state}" if district else state
                match_text = f"{state} {district} {season} {soil_type} {selected_crop} {selected_variety}".lower()
                if search_term and search_term not in match_text:
                    continue

                lead_crop = selected_crop or (top_crops[0]["name"] if top_crops else "Crop Advisory")

                activities.append({
                    "id": f"crop_{raw_id}",
                    "raw_id": raw_id,
                    "type": "crop",
                    "type_label": "Crop & Seed Advisory",
                    "title": f"{lead_crop} — {location_str}",
                    "subtitle": f"{season} • {soil_type}",
                    "badge": season.split(" ")[0] if season else "Seasonal",
                    "badge_type": "info",
                    "state": state,
                    "district": district,
                    "season": season,
                    "soil_type": soil_type,
                    "temperature": temperature,
                    "top_crops": top_crops,
                    "selected_crop": selected_crop,
                    "selected_variety": selected_variety,
                    "notes": notes,
                    "created_at": created_at,
                    "timestamp": created_at
                })

        conn.close()

        # Sort combined activities descending by timestamp
        activities.sort(key=lambda x: str(x.get("created_at") or ""), reverse=True)
        return activities[:limit]

    except Exception as e:
        logger.error(f"[HistoryService] Query error: {e}")
        return []


def get_history_stats():
    """Calculate summary metrics for farmer history dashboard."""
    init_history_tables()
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        # Total disease scans
        cursor.execute("SELECT COUNT(*) FROM plant_disease_predictions")
        total_scans = cursor.fetchone()[0]

        # Healthy vs Diseased
        cursor.execute("""
            SELECT COUNT(*) FROM plant_disease_predictions 
            WHERE LOWER(status) = 'healthy' OR LOWER(disease) LIKE '%healthy%'
        """)
        healthy_scans = cursor.fetchone()[0]
        diseased_scans = total_scans - healthy_scans

        # Total crop recommendations
        cursor.execute("SELECT COUNT(*) FROM crop_recommendations")
        total_crop_recs = cursor.fetchone()[0]

        # Top crop scanned
        cursor.execute("""
            SELECT crop, COUNT(*) as c FROM plant_disease_predictions 
            GROUP BY crop ORDER BY c DESC LIMIT 1
        """)
        top_crop_row = cursor.fetchone()
        top_crop_scanned = top_crop_row[0] if top_crop_row else "Tomato"

        # Top state recommended
        cursor.execute("""
            SELECT state, COUNT(*) as c FROM crop_recommendations 
            GROUP BY state ORDER BY c DESC LIMIT 1
        """)
        top_state_row = cursor.fetchone()
        top_state = top_state_row[0] if top_state_row else "Karnataka"

        conn.close()

        total_activities = total_scans + total_crop_recs
        health_rate = round((healthy_scans / total_scans * 100), 1) if total_scans > 0 else 100.0

        return {
            "total_activities": total_activities,
            "total_scans": total_scans,
            "healthy_scans": healthy_scans,
            "diseased_scans": diseased_scans,
            "health_rate": health_rate,
            "total_crop_recs": total_crop_recs,
            "top_crop_scanned": top_crop_scanned,
            "top_state": top_state
        }
    except Exception as e:
        logger.error(f"[HistoryService] Stats error: {e}")
        return {
            "total_activities": 0,
            "total_scans": 0,
            "healthy_scans": 0,
            "diseased_scans": 0,
            "health_rate": 100,
            "total_crop_recs": 0,
            "top_crop_scanned": "None",
            "top_state": "All-India"
        }


def delete_history_item(item_type, raw_id):
    """Delete a specific diagnostic or recommendation record."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        if item_type in ("disease", "plant_disease"):
            cursor.execute("DELETE FROM plant_disease_predictions WHERE id = ?", (raw_id,))
        elif item_type in ("crop", "crop_recommendation"):
            cursor.execute("DELETE FROM crop_recommendations WHERE id = ?", (raw_id,))
        else:
            conn.close()
            return False, "Invalid type"
        conn.commit()
        deleted = cursor.rowcount > 0
        conn.close()
        return deleted, "Deleted successfully" if deleted else "Record not found"
    except Exception as e:
        logger.error(f"[HistoryService] Delete error: {e}")
        return False, str(e)


def clear_history_category(category="all"):
    """Clear all records from selected or all tables."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        if category in ("all", "disease"):
            cursor.execute("DELETE FROM plant_disease_predictions")
        if category in ("all", "crop"):
            cursor.execute("DELETE FROM crop_recommendations")
        conn.commit()
        conn.close()
        return True, "History cleared successfully"
    except Exception as e:
        logger.error(f"[HistoryService] Clear error: {e}")
        return False, str(e)
