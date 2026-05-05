from flask import Blueprint, request, jsonify
from services.recommendation_service import full_compat_score
from services.explainability_service import generate_chat_response, explain_recommendation
from config import OCCASION_PREFERRED_CATS, OCCASION_EXCLUDED_CATS, NECKLINE_ACC_GUIDE, SLEEVE_ACC_GUIDE, COLOR_COMPAT

chat_bp = Blueprint("chat_bp", __name__)


@chat_bp.route("/chat", methods=["POST"])
def chat():
    data    = request.get_json()
    msg     = data.get("message", "")
    context = data.get("context", {})
    return jsonify({"response": generate_chat_response(msg, context)})


@chat_bp.route("/explain", methods=["POST"])
def explain():
    data        = request.get_json()
    acc         = data.get("accessory", {})
    dress_attrs = data.get("dress_attributes", {})
    occasion    = data.get("occasion", "Casual")
    gender      = data.get("gender",   "Unisex")
    religion    = data.get("religion", "None")
    budget      = float(data.get("budget", 5000))

    score = full_compat_score(acc, dress_attrs, occasion, gender, religion, budget)
    expl  = explain_recommendation(acc, dress_attrs, occasion, gender, religion, budget)

    return jsonify({
        "explanation":           expl,
        "compatibility_score":   max(score, 0.0),
        "preferred_categories":  OCCASION_PREFERRED_CATS.get(occasion, []),
        "excluded_categories":   OCCASION_EXCLUDED_CATS.get(occasion, []),
        "neckline_guide":        NECKLINE_ACC_GUIDE.get(dress_attrs.get("neckline", ""), {}),
        "sleeve_guide":          SLEEVE_ACC_GUIDE.get(dress_attrs.get("sleeve_length", ""), {}),
        "color_compatible_with": COLOR_COMPAT.get(dress_attrs.get("color", ""), []),
    })
