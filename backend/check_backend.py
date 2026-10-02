import sys
import os
import io
import json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app import app
import db_service

def test_backend_thoroughly():
    print("=" * 60)
    print("      KRISHI MITRA BACKEND COMPREHENSIVE DIAGNOSTIC      ")
    print("=" * 60)

    app.config["TESTING"] = True
    client = app.test_client()

    results = []

    def log_test(name, status, details=""):
        tag = "[PASS]" if status else "[FAIL]"
        print(f"{tag} {name} {('- ' + str(details)) if details else ''}")
        results.append((name, status, details))

    # 1. Base route
    try:
        res = client.get("/")
        log_test("GET / (Root endpoint)", res.status_code == 200, f"Status: {res.status_code}")
    except Exception as e:
        log_test("GET / (Root endpoint)", False, str(e))

    # 2. Market live price data endpoint (/api/data)
    try:
        res = client.get("/api/data")
        data = res.get_json()
        log_test("GET /api/data (Market Live Prices)", res.status_code == 200 and isinstance(data, list), f"Records count: {len(data) if isinstance(data, list) else 0}")
    except Exception as e:
        log_test("GET /api/data (Market Live Prices)", False, str(e))

    # 3. Live welfare schemes (/api/live-schemes)
    try:
        res = client.get("/api/live-schemes")
        log_test("GET /api/live-schemes (Government Schemes)", res.status_code in (200, 404), f"Status: {res.status_code}")
    except Exception as e:
        log_test("GET /api/live-schemes (Government Schemes)", False, str(e))

    # 4. Recommendation metadata (/api/rec-meta)
    try:
        res = client.get("/api/rec-meta")
        data = res.get_json()
        valid = res.status_code == 200 and "states" in data and "soil_types" in data and "seasons" in data
        log_test("GET /api/rec-meta (Crop Recommendation Metadata)", valid, f"States: {len(data.get('states', []))}")
    except Exception as e:
        log_test("GET /api/rec-meta (Crop Recommendation Metadata)", False, str(e))

    # 5. Crop Recommendation (/api/recommend-crop)
    try:
        payload = {
            "state": "Maharashtra",
            "district": "Pune",
            "season": "Kharif (Monsoon – Jun–Oct)",
            "soil_type": "Black Soil (Regur / Cotton Soil)",
            "temperature": 27.5
        }
        res = client.post("/api/recommend-crop", json=payload)
        data = res.get_json()
        valid = res.status_code == 200 and data.get("success") is True and len(data.get("crops", [])) > 0
        log_test("POST /api/recommend-crop (Recommendation Engine)", valid, f"Recommended crops: {len(data.get('crops', []))}")
    except Exception as e:
        log_test("POST /api/recommend-crop (Recommendation Engine)", False, str(e))

    # 6. Seed Variety Recommendation (/api/recommend-seed)
    try:
        payload = {
            "crop": "Wheat",
            "state": "Punjab",
            "season": "Rabi (Winter – Oct–Mar)",
            "soil_type": "Alluvial Soil (River Plains)"
        }
        res = client.post("/api/recommend-seed", json=payload)
        data = res.get_json()
        valid = res.status_code == 200 and data.get("success") is True
        log_test("POST /api/recommend-seed (Seed Variety Search)", valid, f"Varieties found: {len(data.get('varieties', []))}")
    except Exception as e:
        log_test("POST /api/recommend-seed (Seed Variety Search)", False, str(e))

    # 7. Plant Disease Classes (/api/plant-disease/classes)
    try:
        res = client.get("/api/plant-disease/classes")
        data = res.get_json()
        valid = res.status_code == 200 and data.get("success") is True and len(data.get("classes", {})) > 0
        log_test("GET /api/plant-disease/classes (PyTorch Model Classes)", valid, f"Crops supported: {len(data.get('classes', {}))}")
    except Exception as e:
        log_test("GET /api/plant-disease/classes (PyTorch Model Classes)", False, str(e))

    # 8. Plant Disease Prediction (/api/plant-disease/predict)
    try:
        sample_img = os.path.join(BASE_DIR, "tests", "test_images", "tomato_early_blight.JPG")
        if os.path.exists(sample_img):
            with open(sample_img, "rb") as f:
                img_bytes = f.read()
            data = {"image": (io.BytesIO(img_bytes), "tomato_early_blight.JPG")}
            res = client.post("/api/plant-disease/predict", data=data, content_type="multipart/form-data")
            json_data = res.get_json()
            valid = res.status_code == 200 and json_data.get("success") is True and "plant" in json_data
            log_test("POST /api/plant-disease/predict (PyTorch AI Leaf Disease Predictor)", valid, f"Plant: {json_data.get('plant')}, Disease: {json_data.get('disease')}, Conf: {json_data.get('confidence')}%")
        else:
            log_test("POST /api/plant-disease/predict (PyTorch AI Leaf Disease Predictor)", False, "Sample image not found")
    except Exception as e:
        log_test("POST /api/plant-disease/predict (PyTorch AI Leaf Disease Predictor)", False, str(e))

    # 9. History API (/api/history)
    try:
        res = client.get("/api/history")
        data = res.get_json()
        valid = res.status_code == 200 and data.get("success") is True
        log_test("GET /api/history (Farmer History Timeline)", valid, f"Activities: {len(data.get('activities', []))}")
    except Exception as e:
        log_test("GET /api/history (Farmer History Timeline)", False, str(e))

    # 10. Database tables check
    try:
        import sqlite3
        db_path = db_service.LOCAL_DB_PATH
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in cursor.fetchall()]
        conn.close()
        log_test("Database Integrity (alerts.db SQLite)", "price_alerts" in tables, f"Tables: {', '.join(tables)}")
    except Exception as e:
        log_test("Database Integrity (alerts.db SQLite)", False, str(e))

    print("=" * 60)
    passed_count = sum(1 for _, status, _ in results if status)
    total_count = len(results)
    print(f"DIAGNOSTIC SUMMARY: {passed_count}/{total_count} Subsystems Verified Successfully")
    print("=" * 60)

if __name__ == "__main__":
    test_backend_thoroughly()
