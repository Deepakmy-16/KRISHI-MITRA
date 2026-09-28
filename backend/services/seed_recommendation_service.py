"""
Seed Variety Recommendation Service for Krishi Mitra
=====================================================
Reads the uploaded krishi_mitra_seed_varieties_clean.csv and provides
seed variety recommendations based on:
  - Crop name
  - State
  - Season
  - Soil type

The CSV is loaded ONCE at module import time (not per request).
"""

import os
import csv
import logging

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Path resolution
# ---------------------------------------------------------------------------
_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# CSV lives at: Krishi_mitra_main/backend/data/krishi_mitra_seed_varieties_clean.csv
_CSV_PATH = os.path.join(_BASE_DIR, "..", "data", "krishi_mitra_seed_varieties_clean.csv")

# ---------------------------------------------------------------------------
# In-memory seed database (loaded once)
# ---------------------------------------------------------------------------
_SEED_DATA: list[dict] = []
_COLUMNS: list[str] = []


def _load_seed_data():
    """Load seed varieties CSV once into memory, handling metadata headers."""
    global _SEED_DATA, _COLUMNS
    if _SEED_DATA:
        return  # already loaded

    csv_path = os.path.normpath(_CSV_PATH)
    if not os.path.exists(csv_path):
        logger.warning(f"Seed varieties CSV not found at: {csv_path}")
        return

    try:
        with open(csv_path, encoding="utf-8-sig") as f:
            lines = []
            header_found = False
            for line in f:
                if not header_found:
                    lower_line = line.lower()
                    if "crop name" in lower_line or "crop_name" in lower_line or "variety name" in lower_line:
                        header_found = True
                        lines.append(line)
                else:
                    lines.append(line)

            if not lines:
                logger.warning(f"No valid header found in {csv_path}")
                return

            reader = csv.DictReader(lines)
            _COLUMNS = [c.strip() for c in (reader.fieldnames or []) if c]
            for row in reader:
                clean = {k.strip().lower(): (v.strip() if v else "") for k, v in row.items() if k}
                # Ensure the row has at least crop name or variety name
                c_name = clean.get("crop name") or clean.get("crop_name") or clean.get("crop")
                v_name = clean.get("variety name") or clean.get("variety_name") or clean.get("variety")
                if c_name or v_name:
                    _SEED_DATA.append(clean)
        logger.info(f"Loaded {len(_SEED_DATA)} seed variety records from CSV.")
    except Exception as e:
        logger.error(f"Failed to load seed varieties CSV: {e}")


# Load immediately when module is imported
_load_seed_data()


# ---------------------------------------------------------------------------
# Column name sniffing helpers
# ---------------------------------------------------------------------------
def _find_col(candidates: list[str]) -> str | None:
    """Return first column name that exists (case-insensitive) in CSV columns."""
    lower_cols = {c.strip().lower(): c.strip().lower() for c in _COLUMNS}
    for cand in candidates:
        if cand.lower() in lower_cols:
            return cand.lower()
    return None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_seed_varieties(crop: str, state: str = "", season: str = "", soil_type: str = "",
                       limit: int = 12) -> dict:
    """
    Return seed variety recommendations for the given crop.

    Parameters
    ----------
    crop      : Crop name (e.g. "Wheat")
    state     : Indian state (e.g. "Punjab")
    season    : Season string (e.g. "Rabi")
    soil_type : Indian soil type string
    limit     : Max records to return

    Returns
    -------
    dict: {
        "found": bool,
        "crop": str,
        "columns": list,
        "varieties": list[dict],
        "total_matched": int,
        "note": str
    }
    """
    if not _SEED_DATA:
        return {
            "found": False,
            "crop": crop,
            "varieties": [],
            "total_matched": 0,
            "note": "Seed varieties database not loaded. Please ensure the CSV file is present.",
        }

    crop_lower = crop.strip().lower()
    state_lower = state.strip().lower()
    season_lower = season.strip().lower()

    # ── Detect column names dynamically ──────────────────────────────────────
    col_crop   = _find_col(["crop", "crop_name", "cropname", "crop name", "commodity"])
    col_state  = _find_col(["state", "state_name", "state name", "recommended states", "recommended_states"])
    col_season = _find_col(["season", "crop_season", "growing season"])
    col_variety = _find_col([
        "variety", "variety_name", "seed_variety", "seed variety",
        "variety name", "varieties", "cultivar"
    ])

    if not col_crop:
        return {
            "found": False,
            "crop": crop,
            "varieties": [],
            "total_matched": 0,
            "note": "Could not detect 'crop' column in seed CSV.",
        }

    # ── Filter rows ────────────────────────────────────────────────────────
    matched = []
    for row in _SEED_DATA:
        row_crop = row.get(col_crop, "").lower()
        if not _fuzzy_match(crop_lower, row_crop):
            continue

        score = 10  # base score for crop match

        if col_state and state_lower:
            row_state = row.get(col_state, "").lower()
            if state_lower in row_state or row_state in state_lower:
                score += 6

        if col_season and season_lower:
            row_season = row.get(col_season, "").lower()
            season_key = _season_key(season_lower)
            if season_key and season_key in row_season:
                score += 4

        matched.append((score, row))

    if not matched:
        # Fallback: relax to partial crop match
        for row in _SEED_DATA:
            row_crop = row.get(col_crop, "").lower()
            if crop_lower[:4] in row_crop or row_crop[:4] in crop_lower:
                matched.append((5, row))

    # Sort by score descending
    matched.sort(key=lambda x: -x[0])

    # De-duplicate by variety name
    seen_varieties = set()
    unique_varieties = []
    for _, row in matched:
        variety_val = row.get(col_variety, "").strip() if col_variety else ""
        key = variety_val.lower() if variety_val else str(row)
        if key not in seen_varieties:
            seen_varieties.add(key)
            unique_varieties.append(row)
        if len(unique_varieties) >= limit:
            break

    # Build clean output — rename columns to friendly names
    output_varieties = []
    for row in unique_varieties:
        entry = {}
        for k, v in row.items():
            friendly_key = k.replace("_", " ").title()
            entry[friendly_key] = v
        output_varieties.append(entry)

    return {
        "found": len(output_varieties) > 0,
        "crop": crop,
        "total_matched": len(matched),
        "varieties": output_varieties,
        "note": (
            f"Showing top {len(output_varieties)} of {len(matched)} matched varieties."
            if matched else "No specific varieties found for this crop."
        ),
    }


def get_available_crops() -> list[str]:
    """Return sorted unique crop names present in the seed CSV."""
    if not _SEED_DATA:
        return []
    col_crop = _find_col(["crop", "crop_name", "cropname", "crop name", "commodity"])
    if not col_crop:
        return []
    crops = sorted(set(row.get(col_crop, "").strip() for row in _SEED_DATA if row.get(col_crop, "").strip()))
    return crops


def is_loaded() -> bool:
    """Return True if seed data was successfully loaded."""
    return len(_SEED_DATA) > 0


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _fuzzy_match(query: str, target: str) -> bool:
    """Simple substring match in both directions."""
    if not query or not target:
        return False
    q = query.strip()
    t = target.strip()
    return q in t or t in q or q[:6] in t or t[:6] in q


def _season_key(season_str: str) -> str | None:
    """Extract season keyword from display string."""
    if "kharif" in season_str:
        return "kharif"
    if "rabi" in season_str:
        return "rabi"
    if "zaid" in season_str or "summer" in season_str:
        return "zaid"
    if "perennial" in season_str:
        return "perennial"
    return None
