from flask import Blueprint, request, jsonify
from services.model_inference import predict_dress

dress_bp = Blueprint("dress_bp", __name__)

@dress_bp.route("", methods=["POST"])
def post_dress():
    img = request.files.get("image")
    if img:
        image_bytes = img.read()
        result = predict_dress(image_bytes)
        return jsonify(result)
    return jsonify({"error": "No image uploaded."}), 400