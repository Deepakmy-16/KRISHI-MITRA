import os
import io
import sys
import sqlite3
import pandas as pd
from PIL import Image, UnidentifiedImageError

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Ensure BASE_DIR (backend/) is on sys.path so ml_models package is importable
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
DATA_DIR = os.path.join(BASE_DIR, "data")
DB_PATH = os.path.join(BASE_DIR, "users.db")
MODEL_DIR = os.path.join(BASE_DIR, "ml_models", "plant_disease")

CONFIDENCE_THRESHOLD = 60.0
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

# Model & metadata singletons
_model = None
_disease_df = None
_supplement_df = None

def init_history_db():
    """Ensure plant_disease_predictions table exists in users.db."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
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
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[PlantDiseaseService] DB init notice: {e}")

def load_metadata():
    """Load disease_info and supplement_info CSV files."""
    global _disease_df, _supplement_df
    if _disease_df is None:
        disease_csv = os.path.join(DATA_DIR, "disease_info.csv")
        try:
            _disease_df = pd.read_csv(disease_csv, encoding="cp1252")
        except Exception:
            _disease_df = pd.read_csv(disease_csv, encoding="utf-8", errors="replace")

    if _supplement_df is None:
        supp_csv = os.path.join(DATA_DIR, "supplement_info.csv")
        try:
            _supplement_df = pd.read_csv(supp_csv, encoding="cp1252")
        except Exception:
            _supplement_df = pd.read_csv(supp_csv, encoding="utf-8", errors="replace")

def get_model():
    """Lazily load PyTorch CNN model with trained weights."""
    global _model
    if _model is not None:
        return _model

    import torch
    from ml_models.plant_disease.CNN import CNN
    from ml_models.plant_disease.download_weights import ensure_model_weights

    weights_path = ensure_model_weights()
    model = CNN(K=39)
    state_dict = torch.load(weights_path, map_location=torch.device("cpu"), weights_only=True)
    model.load_state_dict(state_dict)
    model.eval()
    _model = model
    print("[PlantDiseaseService] PyTorch CNN Model successfully loaded.")
    return _model

def format_name(text: str) -> str:
    """Format underscored class name into clean human-readable text."""
    if not text:
        return ""
    return text.replace("_", " ").replace("  ", " ").strip(" ,")

def parse_class_label(raw_label: str):
    """Split 'Crop___Disease' into crop and disease names."""
    if "___" in raw_label:
        crop, _, disease = raw_label.partition("___")
        return format_name(crop), format_name(disease)
    return format_name(raw_label), "Unknown"

def predict_leaf_image(file_storage, user_id=None, filename=None):
    """
    Validate, preprocess, and diagnose leaf image.
    Returns dictionary with diagnosis, confidence, and treatment info.
    """
    init_history_db()
    load_metadata()

    if file_storage is None:
        return {"success": False, "error": "No image file provided. Please upload a leaf photo."}, 400

    orig_name = filename or getattr(file_storage, "filename", "leaf.jpg")
    ext = orig_name.rsplit(".", 1)[-1].lower() if "." in orig_name else ""
    if ext not in ALLOWED_EXTENSIONS:
        return {
            "success": False,
            "error": f"Invalid file format '.{ext}'. Allowed formats: JPG, JPEG, PNG, WEBP."
        }, 400

    # Read image bytes and validate size
    try:
        content = file_storage.read() if hasattr(file_storage, "read") else file_storage
        if len(content) > MAX_FILE_SIZE:
            return {"success": False, "error": "Image file too large. Maximum size is 10 MB."}, 400
        image = Image.open(io.BytesIO(content))
        image.verify()  # Verify image integrity
        image = Image.open(io.BytesIO(content)).convert("RGB")
    except (UnidentifiedImageError, OSError, Exception):
        return {"success": False, "error": "Corrupted or unreadable image file. Please upload a valid photo."}, 400

    # Image Preprocessing (224x224, tensor)
    try:
        import torch
        import torchvision.transforms.functional as TF
        from ml_models.plant_disease.CNN import idx_to_classes

        resized_img = image.resize((224, 224))
        input_tensor = TF.to_tensor(resized_img).view(-1, 3, 224, 224)

        model = get_model()
        with torch.no_grad():
            outputs = model(input_tensor)
            probs = torch.softmax(outputs, dim=1)[0]
            pred_idx = int(torch.argmax(probs).item())
            confidence = round(float(probs[pred_idx].item()) * 100, 2)

        raw_class = idx_to_classes.get(pred_idx, "Unknown___Unknown")
        crop_name, disease_name = parse_class_label(raw_class)

        # Determine health status
        is_healthy = "healthy" in disease_name.lower() or pred_idx in [
            3, 5, 7, 11, 15, 18, 20, 23, 24, 25, 28, 38
        ]
        status = "Healthy" if is_healthy else "Diseased"

        # Check confidence threshold
        is_low_confidence = confidence < CONFIDENCE_THRESHOLD
        if is_low_confidence:
            message = "Low-confidence prediction. Please upload a clear, well-lit image of a single leaf."
        elif is_healthy:
            message = f"Plant appears healthy! No visual symptoms of disease detected."
        else:
            message = f"Possible {disease_name} detected."

        # Fetch clinical description, steps, and supplements
        description = ""
        possible_steps = ""
        supplement_info = {}

        if _disease_df is not None and pred_idx < len(_disease_df):
            row = _disease_df.iloc[pred_idx]
            description = str(row.get("description", ""))
            possible_steps = str(row.get("Possible Steps", ""))

        if _supplement_df is not None and pred_idx < len(_supplement_df):
            srow = _supplement_df.iloc[pred_idx]
            supplement_info = {
                "name": str(srow.get("supplement name", "")),
                "image_url": str(srow.get("supplement image", "")),
                "buy_link": str(srow.get("buy link", ""))
            }

        # Format recommendations list
        recommendations = []
        if possible_steps:
            # Split bullet points or periods
            raw_steps = [s.strip() for s in possible_steps.replace("\r", "").split("\n") if s.strip()]
            if not raw_steps:
                raw_steps = [s.strip() for s in possible_steps.split(". ") if s.strip()]
            recommendations = raw_steps[:6]

        if not recommendations:
            if is_healthy:
                recommendations = [
                    "Maintain regular balanced watering schedule.",
                    "Ensure adequate sunlight and proper soil drainage.",
                    "Inspect regularly for early signs of pests or discoloration."
                ]
            else:
                recommendations = [
                    "Isolate or prune visibly infected leaves.",
                    "Avoid overhead watering to keep foliage dry.",
                    "Consult your local agricultural extension service for recommended fungicide or treatment."
                ]

        # Save to SQLite history
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO plant_disease_predictions 
                (user_id, crop, disease, confidence, status, image_name, recommendations)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (user_id, crop_name, disease_name, confidence, status, orig_name, "; ".join(recommendations)))
            conn.commit()
            conn.close()
        except Exception as db_err:
            print(f"[PlantDiseaseService] History save error: {db_err}")

        # Top 3 classes for debugging/insight
        top3_indices = torch.topk(probs, 3).indices.tolist()
        top_candidates = []
        for idx in top3_indices:
            c, d = parse_class_label(idx_to_classes.get(idx, ""))
            top_candidates.append({
                "crop": c,
                "disease": d,
                "confidence": round(float(probs[idx].item()) * 100, 2)
            })

        return {
            "success": True,
            "plant": crop_name,
            "disease": disease_name,
            "confidence": confidence,
            "status": status,
            "message": message,
            "is_low_confidence": is_low_confidence,
            "description": description,
            "recommendations": recommendations,
            "supplement": supplement_info,
            "top_candidates": top_candidates
        }, 200

    except Exception as e:
        print(f"[PlantDiseaseService] Prediction error: {e}")
        return {"success": False, "error": f"Prediction failed: {str(e)}"}, 500

def get_prediction_history(limit=20):
    """Retrieve recent predictions from SQLite."""
    init_history_db()
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, crop, disease, confidence, status, image_name, recommendations, created_at 
            FROM plant_disease_predictions 
            ORDER BY id DESC LIMIT ?
        """, (limit,))
        rows = cursor.fetchall()
        conn.close()

        history = []
        for r in rows:
            history.append({
                "id": r[0],
                "plant": r[1],
                "disease": r[2],
                "confidence": r[3],
                "status": r[4],
                "image_name": r[5],
                "recommendations": r[6].split("; ") if r[6] else [],
                "created_at": r[7]
            })
        return history
    except Exception as e:
        print(f"[PlantDiseaseService] History query error: {e}")
        return []

def get_available_classes():
    """Return dictionary of 39 recognizable classes grouped by crop."""
    from ml_models.plant_disease.CNN import idx_to_classes
    grouped = {}
    for idx, raw in idx_to_classes.items():
        crop, disease = parse_class_label(raw)
        if crop not in grouped:
            grouped[crop] = []
        grouped[crop].append({"id": idx, "disease": disease, "raw": raw})
    return grouped
