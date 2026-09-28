from flask import Blueprint, request, jsonify
from services.plant_disease_service import (
    predict_leaf_image,
    get_prediction_history,
    get_available_classes
)

plant_disease_bp = Blueprint("plant_disease", __name__, url_prefix="/api/plant-disease")

@plant_disease_bp.route("/predict", methods=["POST"])
def predict():
    """Endpoint for uploading leaf image and receiving AI disease prediction."""
    if "image" not in request.files:
        return jsonify({"success": False, "error": "No image uploaded. Please attach an image in 'image' form-data."}), 400

    image_file = request.files["image"]
    user_id = request.form.get("user_id")

    result, status_code = predict_leaf_image(
        file_storage=image_file,
        user_id=user_id,
        filename=image_file.filename
    )
    return jsonify(result), status_code

@plant_disease_bp.route("/history", methods=["GET"])
def history():
    """Endpoint for fetching recent prediction history from SQLite."""
    try:
        limit = int(request.args.get("limit", 20))
        records = get_prediction_history(limit=limit)
        return jsonify({"success": True, "count": len(records), "history": records})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@plant_disease_bp.route("/classes", methods=["GET"])
def classes():
    """Endpoint for listing detectable crops and plant diseases."""
    try:
        classes_data = get_available_classes()
        return jsonify({"success": True, "classes": classes_data})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
