from flask import Blueprint, request, jsonify
from services.model_inference import recommend_accessories

recommend_bp = Blueprint("recommend_bp", __name__)

@recommend_bp.route("", methods=["POST"])
def post_recommend():
    # Expect JSON: { dress_attrs: {...}, user_metadata: {...} }
    data = request.get_json()
    if not data:
        return jsonify({"error": "No JSON found."}), 400
    result = recommend_accessories(data.get("dress_attrs", {}), data.get("user_metadata", {}))
    return jsonify(result)