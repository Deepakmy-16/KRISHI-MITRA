"""
Crop Recommendation Service for Krishi Mitra
============================================
Rule-based recommendation engine using:
  - State
  - District
  - Season (Kharif / Rabi / Zaid / Perennial)
  - Soil Type (Indian classification)

NO NPK values, NO humidity input, NO rainfall input required.
Weather data is fetched automatically and used for informational context only.
"""

# ---------------------------------------------------------------------------
# INDIAN SOIL TYPES (display name → internal key)
# ---------------------------------------------------------------------------
SOIL_TYPES = [
    "Alluvial Soil (Bangar/Khadar)",
    "Black Soil (Regur / Cotton Soil)",
    "Red and Yellow Soil",
    "Laterite Soil",
    "Desert / Arid Soil",
    "Saline and Alkaline Soil",
    "Peaty and Marshy Soil",
    "Forest and Mountain Soil",
    "Sub-Mountain / Hill Soil",
]

# ---------------------------------------------------------------------------
# CROP DATABASE
# Each crop entry: name, seasons, suitable_soils, states, description, emoji
# ---------------------------------------------------------------------------
CROP_DB = [
    # ── CEREALS ──────────────────────────────────────────────────────────────
    {
        "name": "Wheat",
        "emoji": "🌾",
        "seasons": ["Rabi"],
        "suitable_soils": [
            "Alluvial Soil (Bangar/Khadar)",
            "Black Soil (Regur / Cotton Soil)",
        ],
        "states": [
            "Punjab", "Haryana", "Uttar Pradesh", "Madhya Pradesh",
            "Rajasthan", "Bihar", "Gujarat", "Himachal Pradesh",
        ],
        "description": "India's primary winter cereal. Grows best in cool dry winters with well-drained loamy soil.",
        "duration_days": "110–130",
        "water_requirement": "Moderate (4–6 irrigations)",
    },
    {
        "name": "Rice / Paddy",
        "emoji": "🍚",
        "seasons": ["Kharif", "Zaid"],
        "suitable_soils": [
            "Alluvial Soil (Bangar/Khadar)",
            "Black Soil (Regur / Cotton Soil)",
            "Red and Yellow Soil",
            "Peaty and Marshy Soil",
        ],
        "states": [
            "West Bengal", "Uttar Pradesh", "Andhra Pradesh", "Punjab",
            "Tamil Nadu", "Odisha", "Bihar", "Chhattisgarh",
            "Assam", "Jharkhand", "Karnataka", "Maharashtra",
        ],
        "description": "Staple food grain grown mainly in humid tropical regions with high water availability.",
        "duration_days": "90–150",
        "water_requirement": "High (flooded fields)",
    },
    {
        "name": "Maize (Corn)",
        "emoji": "🌽",
        "seasons": ["Kharif", "Rabi", "Zaid"],
        "suitable_soils": [
            "Alluvial Soil (Bangar/Khadar)",
            "Red and Yellow Soil",
            "Black Soil (Regur / Cotton Soil)",
        ],
        "states": [
            "Uttar Pradesh", "Bihar", "Karnataka", "Madhya Pradesh",
            "Rajasthan", "Andhra Pradesh", "Himachal Pradesh", "Punjab",
        ],
        "description": "Versatile cereal used for food, feed, and industry. Thrives in warm well-drained soils.",
        "duration_days": "75–95",
        "water_requirement": "Moderate",
    },
    {
        "name": "Sorghum (Jowar)",
        "emoji": "🌾",
        "seasons": ["Kharif", "Rabi"],
        "suitable_soils": [
            "Black Soil (Regur / Cotton Soil)",
            "Red and Yellow Soil",
            "Alluvial Soil (Bangar/Khadar)",
        ],
        "states": [
            "Maharashtra", "Karnataka", "Madhya Pradesh", "Andhra Pradesh",
            "Rajasthan", "Gujarat", "Tamil Nadu",
        ],
        "description": "Drought-tolerant coarse cereal suitable for semi-arid regions.",
        "duration_days": "90–120",
        "water_requirement": "Low to Moderate",
    },
    {
        "name": "Pearl Millet (Bajra)",
        "emoji": "🌾",
        "seasons": ["Kharif"],
        "suitable_soils": [
            "Desert / Arid Soil",
            "Red and Yellow Soil",
            "Alluvial Soil (Bangar/Khadar)",
        ],
        "states": [
            "Rajasthan", "Gujarat", "Haryana", "Uttar Pradesh",
            "Maharashtra", "Madhya Pradesh",
        ],
        "description": "Highly drought-tolerant millet ideal for arid and semi-arid zones.",
        "duration_days": "70–85",
        "water_requirement": "Low",
    },
    {
        "name": "Finger Millet (Ragi)",
        "emoji": "🌾",
        "seasons": ["Kharif"],
        "suitable_soils": [
            "Red and Yellow Soil",
            "Laterite Soil",
            "Black Soil (Regur / Cotton Soil)",
        ],
        "states": [
            "Karnataka", "Tamil Nadu", "Andhra Pradesh", "Odisha",
            "Jharkhand", "Uttarakhand",
        ],
        "description": "Nutritious millet with high calcium content, suited for hilly and plateau regions.",
        "duration_days": "100–130",
        "water_requirement": "Low to Moderate",
    },

    # ── PULSES ───────────────────────────────────────────────────────────────
    {
        "name": "Chickpea (Gram / Chana)",
        "emoji": "🫘",
        "seasons": ["Rabi"],
        "suitable_soils": [
            "Black Soil (Regur / Cotton Soil)",
            "Alluvial Soil (Bangar/Khadar)",
            "Red and Yellow Soil",
        ],
        "states": [
            "Madhya Pradesh", "Rajasthan", "Maharashtra", "Uttar Pradesh",
            "Andhra Pradesh", "Karnataka",
        ],
        "description": "Most important pulse crop in India; fixes atmospheric nitrogen improving soil health.",
        "duration_days": "90–120",
        "water_requirement": "Low",
    },
    {
        "name": "Pigeon Pea (Arhar / Tur)",
        "emoji": "🫘",
        "seasons": ["Kharif"],
        "suitable_soils": [
            "Black Soil (Regur / Cotton Soil)",
            "Red and Yellow Soil",
            "Alluvial Soil (Bangar/Khadar)",
        ],
        "states": [
            "Maharashtra", "Uttar Pradesh", "Madhya Pradesh", "Karnataka",
            "Andhra Pradesh", "Bihar",
        ],
        "description": "Drought-resistant tropical pulse; good companion crop for cereals.",
        "duration_days": "130–170",
        "water_requirement": "Low to Moderate",
    },
    {
        "name": "Green Gram (Moong)",
        "emoji": "🫘",
        "seasons": ["Kharif", "Rabi", "Zaid"],
        "suitable_soils": [
            "Alluvial Soil (Bangar/Khadar)",
            "Black Soil (Regur / Cotton Soil)",
        ],
        "states": [
            "Rajasthan", "Maharashtra", "Andhra Pradesh", "Uttar Pradesh",
            "Karnataka", "Madhya Pradesh",
        ],
        "description": "Short-duration pulse suitable as a catch crop; improves soil nitrogen.",
        "duration_days": "60–75",
        "water_requirement": "Low",
    },
    {
        "name": "Black Gram (Urad)",
        "emoji": "🫘",
        "seasons": ["Kharif", "Rabi"],
        "suitable_soils": [
            "Alluvial Soil (Bangar/Khadar)",
            "Black Soil (Regur / Cotton Soil)",
            "Red and Yellow Soil",
        ],
        "states": [
            "Uttar Pradesh", "Andhra Pradesh", "Madhya Pradesh",
            "Tamil Nadu", "West Bengal",
        ],
        "description": "High-protein pulse grown in humid subtropical conditions.",
        "duration_days": "65–90",
        "water_requirement": "Low to Moderate",
    },
    {
        "name": "Lentil (Masoor)",
        "emoji": "🫘",
        "seasons": ["Rabi"],
        "suitable_soils": [
            "Alluvial Soil (Bangar/Khadar)",
            "Red and Yellow Soil",
        ],
        "states": [
            "Uttar Pradesh", "Madhya Pradesh", "Bihar",
            "West Bengal", "Rajasthan",
        ],
        "description": "Cool season pulse with excellent protein content; good for crop rotation.",
        "duration_days": "90–110",
        "water_requirement": "Low",
    },

    # ── OILSEEDS ─────────────────────────────────────────────────────────────
    {
        "name": "Groundnut (Peanut)",
        "emoji": "🥜",
        "seasons": ["Kharif", "Rabi"],
        "suitable_soils": [
            "Red and Yellow Soil",
            "Alluvial Soil (Bangar/Khadar)",
            "Desert / Arid Soil",
        ],
        "states": [
            "Gujarat", "Andhra Pradesh", "Tamil Nadu", "Karnataka",
            "Rajasthan", "Maharashtra",
        ],
        "description": "Important oilseed crop; thrives in light sandy loam soils.",
        "duration_days": "90–130",
        "water_requirement": "Moderate",
    },
    {
        "name": "Mustard / Rapeseed",
        "emoji": "🌻",
        "seasons": ["Rabi"],
        "suitable_soils": [
            "Alluvial Soil (Bangar/Khadar)",
            "Black Soil (Regur / Cotton Soil)",
            "Desert / Arid Soil",
        ],
        "states": [
            "Rajasthan", "Haryana", "Uttar Pradesh", "Madhya Pradesh",
            "Punjab", "West Bengal",
        ],
        "description": "Key winter oilseed crop; cold and drought tolerant.",
        "duration_days": "90–110",
        "water_requirement": "Low to Moderate",
    },
    {
        "name": "Soybean",
        "emoji": "🫘",
        "seasons": ["Kharif"],
        "suitable_soils": [
            "Black Soil (Regur / Cotton Soil)",
            "Alluvial Soil (Bangar/Khadar)",
        ],
        "states": [
            "Madhya Pradesh", "Maharashtra", "Rajasthan",
            "Karnataka", "Andhra Pradesh",
        ],
        "description": "High-protein oilseed with nitrogen-fixing ability; ideal on black cotton soil.",
        "duration_days": "90–110",
        "water_requirement": "Moderate",
    },
    {
        "name": "Sunflower",
        "emoji": "🌻",
        "seasons": ["Kharif", "Rabi", "Zaid"],
        "suitable_soils": [
            "Alluvial Soil (Bangar/Khadar)",
            "Black Soil (Regur / Cotton Soil)",
        ],
        "states": [
            "Karnataka", "Andhra Pradesh", "Maharashtra", "Tamil Nadu",
            "Uttar Pradesh", "Haryana",
        ],
        "description": "Photo-insensitive oilseed crop suitable for three seasons.",
        "duration_days": "85–95",
        "water_requirement": "Moderate",
    },
    {
        "name": "Sesame (Til)",
        "emoji": "🌿",
        "seasons": ["Kharif", "Rabi"],
        "suitable_soils": [
            "Red and Yellow Soil",
            "Alluvial Soil (Bangar/Khadar)",
            "Black Soil (Regur / Cotton Soil)",
        ],
        "states": [
            "West Bengal", "Uttar Pradesh", "Rajasthan", "Gujarat",
            "Andhra Pradesh", "Tamil Nadu",
        ],
        "description": "Ancient oilseed crop; drought tolerant and suitable for marginal soils.",
        "duration_days": "75–90",
        "water_requirement": "Low",
    },

    # ── CASH CROPS ───────────────────────────────────────────────────────────
    {
        "name": "Cotton",
        "emoji": "🌿",
        "seasons": ["Kharif"],
        "suitable_soils": [
            "Black Soil (Regur / Cotton Soil)",
            "Alluvial Soil (Bangar/Khadar)",
            "Red and Yellow Soil",
        ],
        "states": [
            "Gujarat", "Maharashtra", "Andhra Pradesh", "Telangana",
            "Punjab", "Haryana", "Rajasthan", "Karnataka",
        ],
        "description": "White gold of India. Black cotton soil is the most ideal growing medium.",
        "duration_days": "160–200",
        "water_requirement": "Moderate to High",
    },
    {
        "name": "Sugarcane",
        "emoji": "🎋",
        "seasons": ["Perennial", "Kharif"],
        "suitable_soils": [
            "Alluvial Soil (Bangar/Khadar)",
            "Black Soil (Regur / Cotton Soil)",
            "Red and Yellow Soil",
        ],
        "states": [
            "Uttar Pradesh", "Maharashtra", "Karnataka", "Tamil Nadu",
            "Andhra Pradesh", "Telangana", "Bihar", "Punjab",
        ],
        "description": "Major sugar crop requiring tropical/subtropical climate and high water availability.",
        "duration_days": "300–360",
        "water_requirement": "High",
    },
    {
        "name": "Jute",
        "emoji": "🌿",
        "seasons": ["Kharif"],
        "suitable_soils": [
            "Alluvial Soil (Bangar/Khadar)",
        ],
        "states": [
            "West Bengal", "Bihar", "Assam", "Odisha",
            "Meghalaya", "Tripura",
        ],
        "description": "Natural fibre crop needing hot humid climate and well-drained alluvial soil.",
        "duration_days": "90–120",
        "water_requirement": "High",
    },

    # ── HORTICULTURE ─────────────────────────────────────────────────────────
    {
        "name": "Tomato",
        "emoji": "🍅",
        "seasons": ["Kharif", "Rabi", "Zaid"],
        "suitable_soils": [
            "Alluvial Soil (Bangar/Khadar)",
            "Red and Yellow Soil",
            "Black Soil (Regur / Cotton Soil)",
        ],
        "states": [
            "Andhra Pradesh", "Karnataka", "Maharashtra", "Uttar Pradesh",
            "Tamil Nadu", "Madhya Pradesh", "Odisha", "West Bengal",
        ],
        "description": "Versatile vegetable crop grown in all seasons; prefers well-drained fertile soil.",
        "duration_days": "60–90",
        "water_requirement": "Moderate",
    },
    {
        "name": "Onion",
        "emoji": "🧅",
        "seasons": ["Rabi", "Kharif"],
        "suitable_soils": [
            "Alluvial Soil (Bangar/Khadar)",
            "Black Soil (Regur / Cotton Soil)",
            "Red and Yellow Soil",
        ],
        "states": [
            "Maharashtra", "Karnataka", "Madhya Pradesh", "Gujarat",
            "Rajasthan", "Andhra Pradesh",
        ],
        "description": "High-value vegetable; prefers moderate temperature and well-drained medium soils.",
        "duration_days": "90–120",
        "water_requirement": "Moderate",
    },
    {
        "name": "Potato",
        "emoji": "🥔",
        "seasons": ["Rabi", "Zaid"],
        "suitable_soils": [
            "Alluvial Soil (Bangar/Khadar)",
            "Red and Yellow Soil",
        ],
        "states": [
            "Uttar Pradesh", "West Bengal", "Bihar", "Punjab",
            "Assam", "Madhya Pradesh", "Himachal Pradesh",
        ],
        "description": "Most widely cultivated vegetable crop in India; grows best in cool weather.",
        "duration_days": "70–110",
        "water_requirement": "Moderate",
    },
    {
        "name": "Brinjal (Eggplant)",
        "emoji": "🍆",
        "seasons": ["Kharif", "Rabi"],
        "suitable_soils": [
            "Alluvial Soil (Bangar/Khadar)",
            "Red and Yellow Soil",
            "Black Soil (Regur / Cotton Soil)",
        ],
        "states": [
            "West Bengal", "Odisha", "Bihar", "Andhra Pradesh",
            "Karnataka", "Maharashtra",
        ],
        "description": "Popular vegetable tolerating a wide range of soils and climates.",
        "duration_days": "120–150",
        "water_requirement": "Moderate",
    },
    {
        "name": "Okra (Bhindi/Lady's Finger)",
        "emoji": "🌿",
        "seasons": ["Kharif", "Zaid"],
        "suitable_soils": [
            "Alluvial Soil (Bangar/Khadar)",
            "Red and Yellow Soil",
            "Black Soil (Regur / Cotton Soil)",
        ],
        "states": [
            "Uttar Pradesh", "Bihar", "West Bengal", "Odisha",
            "Maharashtra", "Andhra Pradesh",
        ],
        "description": "Popular warm-season vegetable crop growing across tropical India.",
        "duration_days": "45–65",
        "water_requirement": "Moderate",
    },
    {
        "name": "Chili / Green Chilli",
        "emoji": "🌶️",
        "seasons": ["Kharif", "Rabi"],
        "suitable_soils": [
            "Red and Yellow Soil",
            "Alluvial Soil (Bangar/Khadar)",
            "Black Soil (Regur / Cotton Soil)",
        ],
        "states": [
            "Andhra Pradesh", "Karnataka", "Maharashtra", "Rajasthan",
            "Madhya Pradesh", "Gujarat", "Tamil Nadu",
        ],
        "description": "Pungent spice crop with high market value. Warm humid conditions required.",
        "duration_days": "90–110",
        "water_requirement": "Moderate",
    },
    {
        "name": "Garlic",
        "emoji": "🧄",
        "seasons": ["Rabi"],
        "suitable_soils": [
            "Alluvial Soil (Bangar/Khadar)",
            "Black Soil (Regur / Cotton Soil)",
        ],
        "states": [
            "Madhya Pradesh", "Rajasthan", "Gujarat", "Uttar Pradesh",
            "Maharashtra",
        ],
        "description": "High-value spice crop growing well in cool dry rabi season.",
        "duration_days": "120–150",
        "water_requirement": "Moderate",
    },
    {
        "name": "Ginger",
        "emoji": "🫚",
        "seasons": ["Kharif", "Perennial"],
        "suitable_soils": [
            "Red and Yellow Soil",
            "Forest and Mountain Soil",
            "Laterite Soil",
            "Alluvial Soil (Bangar/Khadar)",
        ],
        "states": [
            "Kerala", "Karnataka", "Assam", "Meghalaya",
            "Himachal Pradesh", "Uttarakhand", "Odisha",
        ],
        "description": "Tropical spice rhizome grown in warm humid regions with loose well-drained soil.",
        "duration_days": "180–210",
        "water_requirement": "High",
    },
    {
        "name": "Turmeric",
        "emoji": "🟡",
        "seasons": ["Kharif", "Perennial"],
        "suitable_soils": [
            "Red and Yellow Soil",
            "Alluvial Soil (Bangar/Khadar)",
            "Laterite Soil",
        ],
        "states": [
            "Andhra Pradesh", "Telangana", "Tamil Nadu", "Maharashtra",
            "Karnataka", "Odisha", "West Bengal",
        ],
        "description": "Valuable spice rhizome needing tropical humid conditions and well-drained fertile soil.",
        "duration_days": "180–270",
        "water_requirement": "Moderate to High",
    },
    {
        "name": "Banana",
        "emoji": "🍌",
        "seasons": ["Perennial"],
        "suitable_soils": [
            "Alluvial Soil (Bangar/Khadar)",
            "Black Soil (Regur / Cotton Soil)",
            "Red and Yellow Soil",
        ],
        "states": [
            "Tamil Nadu", "Maharashtra", "Andhra Pradesh", "Gujarat",
            "Karnataka", "West Bengal", "Assam",
        ],
        "description": "High-value perennial fruit grown across tropical India year-round.",
        "duration_days": "300–450",
        "water_requirement": "High",
    },
    {
        "name": "Mango",
        "emoji": "🥭",
        "seasons": ["Perennial"],
        "suitable_soils": [
            "Alluvial Soil (Bangar/Khadar)",
            "Red and Yellow Soil",
            "Black Soil (Regur / Cotton Soil)",
            "Laterite Soil",
        ],
        "states": [
            "Uttar Pradesh", "Andhra Pradesh", "Maharashtra", "Karnataka",
            "Bihar", "Gujarat", "Tamil Nadu", "West Bengal",
        ],
        "description": "King of fruits; perennial orchard crop requiring tropical/subtropical conditions.",
        "duration_days": "Orchard (3–5 yrs)",
        "water_requirement": "Low to Moderate",
    },
    {
        "name": "Coconut",
        "emoji": "🥥",
        "seasons": ["Perennial"],
        "suitable_soils": [
            "Laterite Soil",
            "Alluvial Soil (Bangar/Khadar)",
            "Red and Yellow Soil",
        ],
        "states": [
            "Kerala", "Karnataka", "Tamil Nadu", "Andhra Pradesh",
            "Goa", "West Bengal", "Assam",
        ],
        "description": "Coastal tropical perennial palm requiring humid conditions and sandy loam soil.",
        "duration_days": "Orchard (long-term)",
        "water_requirement": "Moderate to High",
    },

    # ── SUMMER / ZAID ─────────────────────────────────────────────────────────
    {
        "name": "Watermelon",
        "emoji": "🍉",
        "seasons": ["Zaid"],
        "suitable_soils": [
            "Desert / Arid Soil",
            "Alluvial Soil (Bangar/Khadar)",
            "Red and Yellow Soil",
        ],
        "states": [
            "Karnataka", "Andhra Pradesh", "Rajasthan", "Uttar Pradesh",
            "Maharashtra", "Madhya Pradesh",
        ],
        "description": "Summer cucurbit crop suited for light sandy soils; fast growing with high market demand.",
        "duration_days": "70–90",
        "water_requirement": "Moderate",
    },
    {
        "name": "Bitter Gourd (Karela)",
        "emoji": "🌿",
        "seasons": ["Zaid", "Kharif"],
        "suitable_soils": [
            "Alluvial Soil (Bangar/Khadar)",
            "Red and Yellow Soil",
        ],
        "states": [
            "Uttar Pradesh", "Bihar", "West Bengal", "Andhra Pradesh",
            "Karnataka", "Maharashtra",
        ],
        "description": "Warm-season cucurbit vegetable with high medicinal value.",
        "duration_days": "50–75",
        "water_requirement": "Moderate",
    },

    # ── PLANTATION ───────────────────────────────────────────────────────────
    {
        "name": "Tea",
        "emoji": "🍵",
        "seasons": ["Perennial"],
        "suitable_soils": [
            "Forest and Mountain Soil",
            "Laterite Soil",
            "Sub-Mountain / Hill Soil",
        ],
        "states": [
            "Assam", "West Bengal", "Tamil Nadu", "Kerala",
            "Himachal Pradesh", "Uttarakhand",
        ],
        "description": "Plantation crop grown on hilly acidic soils in humid cool-to-warm conditions.",
        "duration_days": "Orchard (long-term)",
        "water_requirement": "High",
    },
    {
        "name": "Coffee",
        "emoji": "☕",
        "seasons": ["Perennial"],
        "suitable_soils": [
            "Forest and Mountain Soil",
            "Laterite Soil",
            "Red and Yellow Soil",
        ],
        "states": [
            "Karnataka", "Kerala", "Tamil Nadu",
            "Andhra Pradesh",
        ],
        "description": "Shade-grown plantation crop in hilly tropical forests with red laterite soils.",
        "duration_days": "Orchard (long-term)",
        "water_requirement": "Moderate to High",
    },
]


def get_state_list():
    """Return sorted list of all states in the crop database."""
    states_set = set()
    for crop in CROP_DB:
        for state in crop.get("states", []):
            states_set.add(state)
    return sorted(states_set)


def get_soil_types():
    """Return the list of Indian soil type options."""
    return SOIL_TYPES


def get_seasons():
    return ["Kharif (Monsoon – Jun–Oct)", "Rabi (Winter – Nov–Apr)", "Zaid (Summer – Mar–Jun)", "Perennial"]


def _normalize_season(season_raw: str) -> str:
    """Map display season string to internal key."""
    s = season_raw.strip().lower()
    if "kharif" in s:
        return "Kharif"
    if "rabi" in s:
        return "Rabi"
    if "zaid" in s:
        return "Zaid"
    if "perennial" in s:
        return "Perennial"
    return season_raw.strip()


def recommend_crops(state: str, district: str, season: str, soil_type: str,
                    temperature: float = None, limit: int = 10):
    """
    Return a scored list of recommended crops.

    Parameters
    ----------
    state      : Indian state name (e.g. "Karnataka")
    district   : District name (informational; used in response context)
    season     : Season string (Kharif / Rabi / Zaid / Perennial)
    soil_type  : Indian soil type from SOIL_TYPES list
    temperature: Optional current temperature in °C (from weather API)
    limit      : Maximum number of results

    Returns
    -------
    list of dict: [{name, emoji, description, score, reasons, ...}, ...]
    """
    season_key = _normalize_season(season)
    results = []

    for crop in CROP_DB:
        score = 0
        reasons = []

        # ── Season match ──────────────────────────────────────────────────
        if season_key in crop["seasons"]:
            score += 40
            reasons.append(f"Suitable for {season_key} season")
        else:
            continue   # hard filter: skip if season does not match

        # ── State match ───────────────────────────────────────────────────
        crop_states_lower = [s.lower() for s in crop.get("states", [])]
        if state.lower() in crop_states_lower:
            score += 35
            reasons.append(f"Widely cultivated in {state}")
        else:
            score += 5
            reasons.append("Adaptable to new regions")

        # ── Soil match ────────────────────────────────────────────────────
        if soil_type and soil_type in crop.get("suitable_soils", []):
            score += 25
            reasons.append(f"Ideal for {soil_type}")
        elif soil_type:
            score += 5

        # ── Temperature hint (bonus) ──────────────────────────────────────
        if temperature is not None:
            if season_key == "Rabi" and 10 <= temperature <= 28:
                score += 5
                reasons.append("Favourable cool temperature for Rabi")
            elif season_key == "Kharif" and 25 <= temperature <= 38:
                score += 5
                reasons.append("Warm monsoon temperature favourable")
            elif season_key == "Zaid" and temperature >= 25:
                score += 5
                reasons.append("Warm summer temperature suits Zaid crop")

        results.append({
            "name": crop["name"],
            "emoji": crop["emoji"],
            "description": crop["description"],
            "duration_days": crop.get("duration_days", "N/A"),
            "water_requirement": crop.get("water_requirement", "N/A"),
            "score": score,
            "reasons": reasons,
            "suitable_soils": crop.get("suitable_soils", []),
        })

    # Sort by score descending, then alphabetically
    results.sort(key=lambda x: (-x["score"], x["name"]))
    return results[:limit]
