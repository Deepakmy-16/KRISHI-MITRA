import os
import sys
import unittest
import io

# Setup path so tests can run directly
TESTS_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(TESTS_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app import app

class TestPlantDiseaseIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        app.config["TESTING"] = True
        cls.client = app.test_client()

    def test_01_classes_endpoint(self):
        """Test GET /api/plant-disease/classes returns 39 classes grouped by crop."""
        res = self.client.get("/api/plant-disease/classes")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get("success"))
        self.assertIn("Tomato", data.get("classes", {}))
        self.assertIn("Apple", data.get("classes", {}))
        self.assertIn("Corn", data.get("classes", {}))

    def test_02_predict_missing_file(self):
        """Test POST /api/plant-disease/predict with no file."""
        res = self.client.post("/api/plant-disease/predict")
        self.assertEqual(res.status_code, 400)
        data = res.get_json()
        self.assertFalse(data.get("success"))
        self.assertIn("error", data)

    def test_03_predict_invalid_extension(self):
        """Test POST /api/plant-disease/predict with invalid file type."""
        data = {
            "image": (io.BytesIO(b"dummy text"), "notes.txt")
        }
        res = self.client.post("/api/plant-disease/predict", data=data, content_type="multipart/form-data")
        self.assertEqual(res.status_code, 400)
        json_data = res.get_json()
        self.assertFalse(json_data.get("success"))
        self.assertIn("Invalid file format", json_data.get("error", ""))

    def test_04_predict_corrupted_image(self):
        """Test POST /api/plant-disease/predict with corrupted image."""
        data = {
            "image": (io.BytesIO(b"\xff\xd8\xff\xe0not-a-real-jpeg"), "leaf.jpg")
        }
        res = self.client.post("/api/plant-disease/predict", data=data, content_type="multipart/form-data")
        self.assertEqual(res.status_code, 400)
        json_data = res.get_json()
        self.assertFalse(json_data.get("success"))
        self.assertIn("Corrupted or unreadable", json_data.get("error", ""))

    def test_05_predict_valid_leaf(self):
        """Test POST /api/plant-disease/predict with a valid leaf image."""
        sample_img = os.path.join(TESTS_DIR, "test_images", "tomato_early_blight.JPG")
        if not os.path.exists(sample_img):
            self.skipTest(f"Test image not found at {sample_img}")

        with open(sample_img, "rb") as f:
            img_bytes = f.read()

        data = {
            "image": (io.BytesIO(img_bytes), "tomato_early_blight.JPG")
        }
        res = self.client.post("/api/plant-disease/predict", data=data, content_type="multipart/form-data")
        self.assertEqual(res.status_code, 200)
        json_data = res.get_json()

        self.assertTrue(json_data.get("success"))
        self.assertIn("plant", json_data)
        self.assertIn("disease", json_data)
        self.assertIn("confidence", json_data)
        self.assertIn("status", json_data)
        self.assertIn("recommendations", json_data)
        self.assertIsInstance(json_data["confidence"], (int, float))
        self.assertGreater(json_data["confidence"], 0)
        print(f"\n[Test Result] Plant: {json_data['plant']} | Disease: {json_data['disease']} | Confidence: {json_data['confidence']}% | Status: {json_data['status']}")

    def test_06_history_endpoint(self):
        """Test GET /api/plant-disease/history returns records."""
        res = self.client.get("/api/plant-disease/history")
        self.assertEqual(res.status_code, 200)
        json_data = res.get_json()
        self.assertTrue(json_data.get("success"))
        self.assertIsInstance(json_data.get("history"), list)

    def test_07_existing_routes_regression(self):
        """Verify that existing Smart Price Analysis routes still work properly."""
        res_home = self.client.get("/")
        self.assertEqual(res_home.status_code, 200)

        res_data = self.client.get("/api/data")
        self.assertEqual(res_data.status_code, 200)

if __name__ == "__main__":
    unittest.main()
