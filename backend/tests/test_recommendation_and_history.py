import os
import sys
import unittest

TESTS_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(TESTS_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app import app

class TestRecommendationAndHistory(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        app.config["TESTING"] = True
        cls.client = app.test_client()

    def test_01_rec_meta(self):
        """Test GET /api/rec-meta returns states, soil_types, and seasons."""
        res = self.client.get("/api/rec-meta")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("states", data)
        self.assertIn("soil_types", data)
        self.assertIn("seasons", data)
        self.assertTrue(len(data["states"]) > 0)
        self.assertTrue(len(data["soil_types"]) > 0)
        self.assertTrue(len(data["seasons"]) > 0)

    def test_02_recommend_crop_validation(self):
        """Test POST /api/recommend-crop validates missing fields."""
        res = self.client.post("/api/recommend-crop", json={})
        self.assertEqual(res.status_code, 400)
        data = res.get_json()
        self.assertFalse(data.get("success"))
        self.assertIn("errors", data)

    def test_03_recommend_crop_success(self):
        """Test POST /api/recommend-crop with valid input returns ranked crops and records history."""
        payload = {
            "state": "Karnataka",
            "district": "Mandya",
            "season": "Kharif (Monsoon – Jun–Oct)",
            "soil_type": "Black Soil (Regur / Cotton Soil)",
            "temperature": 28.5
        }
        res = self.client.post("/api/recommend-crop", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get("success"))
        self.assertIn("crops", data)
        self.assertIsInstance(data["crops"], list)
        self.assertTrue(len(data["crops"]) > 0)
        first_crop = data["crops"][0]
        self.assertIn("name", first_crop)
        self.assertIn("score", first_crop)
        self.assertIn("reasons", first_crop)

    def test_04_recommend_seed(self):
        """Test POST /api/recommend-seed returns matched seed varieties."""
        payload = {
            "crop": "Rice / Paddy",
            "state": "Karnataka",
            "season": "Kharif (Monsoon – Jun–Oct)",
            "soil_type": "Red and Yellow Soil"
        }
        res = self.client.post("/api/recommend-seed", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get("success"))
        self.assertIn("varieties", data)
        self.assertIsInstance(data["varieties"], list)

    def test_05_seed_crops(self):
        """Test GET /api/seed-crops returns crops present in seed database."""
        res = self.client.get("/api/seed-crops")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get("success"))
        self.assertIn("crops", data)
        self.assertIsInstance(data["crops"], list)
        self.assertTrue(len(data["crops"]) > 0)

    def test_06_farmer_history_crud(self):
        """Test unified farmer history API endpoints."""
        # 1. Fetch timeline
        res = self.client.get("/api/history")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get("success"))
        self.assertIn("activities", data)
        self.assertIn("stats", data)

        # 2. Record new crop recommendation
        rec_payload = {
            "state": "Punjab",
            "district": "Ludhiana",
            "season": "Rabi (Winter – Oct–Mar)",
            "soil_type": "Alluvial Soil (River Plains)",
            "temperature": 18.0,
            "crops": [{"name": "Wheat", "score": 95}],
            "selected_crop": "Wheat",
            "selected_variety": "PBW 343"
        }
        rec_res = self.client.post("/api/history/record-crop", json=rec_payload)
        self.assertEqual(rec_res.status_code, 201)
        rec_data = rec_res.get_json()
        self.assertTrue(rec_data.get("success"))
        rec_id = rec_data.get("id")
        self.assertIsNotNone(rec_id)

        # 3. Update seed selection
        update_res = self.client.post("/api/history/update-seed", json={
            "id": rec_id,
            "selected_crop": "Wheat",
            "selected_variety": "HD 2967"
        })
        self.assertEqual(update_res.status_code, 200)

        # 4. Fetch stats
        stats_res = self.client.get("/api/history/stats")
        self.assertEqual(stats_res.status_code, 200)
        stats_data = stats_res.get_json()
        self.assertTrue(stats_data.get("success"))
        self.assertIn("total_activities", stats_data.get("stats", {}))

        # 5. Delete the test item
        del_res = self.client.delete(f"/api/history/crop/{rec_id}")
        self.assertEqual(del_res.status_code, 200)

if __name__ == "__main__":
    unittest.main()
