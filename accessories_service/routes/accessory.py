from flask import Blueprint, request, jsonify
from services.model_inference import predict_accessory

accessory_bp = Blueprint("accessory_bp", __name__)

@accessory_bp.route("", methods=["POST"])
def post_accessory():
    # Expect form-data: 'image'
    img = request.files.get("image")
    if img:
        image_bytes = img.read()
        result = predict_accessory(image_bytes)
        return jsonify(result)
    return jsonify({"error": "No image uploaded."}), 400