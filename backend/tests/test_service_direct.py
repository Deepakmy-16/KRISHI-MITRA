import os
import sys

TESTS_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(TESTS_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from services.plant_disease_service import predict_leaf_image, get_available_classes, get_prediction_history

def test_direct():
    print("[1] Testing available classes...")
    classes = get_available_classes()
    print(f"Total crop categories: {len(classes)}")
    assert len(classes) > 10, "Should have multiple crops"
    assert "Tomato" in classes, "Tomato should be supported"

    print("\n[2] Testing leaf image prediction...")
    test_img_path = os.path.join(TESTS_DIR, "test_images", "tomato_early_blight.JPG")
    with open(test_img_path, "rb") as f:
        img_bytes = f.read()

    res, status_code = predict_leaf_image(img_bytes, filename="tomato_early_blight.JPG")
    print(f"Status Code: {status_code}")
    print(f"Success: {res.get('success')}")
    print(f"Plant: {res.get('plant')}")
    print(f"Disease: {res.get('disease')}")
    print(f"Confidence: {res.get('confidence')}%")
    print(f"Status: {res.get('status')}")
    print(f"Message: {res.get('message')}")
    print(f"Recommendations count: {len(res.get('recommendations', []))}")
    if res.get('recommendations'):
        print(f"Sample Recommendation: {res['recommendations'][0]}")
    if res.get('supplement'):
        print(f"Supplement: {res['supplement'].get('name')}")

    assert status_code == 200, "Should return 200"
    assert res["success"] is True, "Prediction should succeed"
    assert res["plant"] == "Tomato", f"Expected Tomato, got {res['plant']}"
    assert "Early blight" in res["disease"] or "blight" in res["disease"].lower(), f"Expected Early blight, got {res['disease']}"

    print("\n[3] Testing another crop: Apple Scab...")
    apple_img_path = os.path.join(TESTS_DIR, "test_images", "Apple_scab.JPG")
    with open(apple_img_path, "rb") as f:
        apple_bytes = f.read()

    res2, status2 = predict_leaf_image(apple_bytes, filename="Apple_scab.JPG")
    print(f"Status Code: {status2}")
    print(f"Plant: {res2.get('plant')} | Disease: {res2.get('disease')} | Confidence: {res2.get('confidence')}%")
    assert status2 == 200
    assert res2["success"] is True

    print("\n[4] Testing history query...")
    history = get_prediction_history(limit=5)
    print(f"Recent history records: {len(history)}")
    assert len(history) >= 2, "History should record predictions"

    print("\n[SUCCESS] All direct service checks passed!")

if __name__ == "__main__":
    test_direct()
