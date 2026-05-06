import torch
from flask import Blueprint, request, jsonify
import services.ml_models as ml
from config import DRESS_ENC
from utils.encoding_utils import encode_dress_to_79

dress_bp = Blueprint("dress_bp", __name__)


@dress_bp.route("/extract-dress-attributes", methods=["POST"])
def extract_dress_attributes():
    if "image" not in request.files:
        return jsonify({"error": "No image provided"}), 400
    if ml.model2 is None:
        return jsonify({"error": "Model 2 not loaded"}), 503
    try:
        t = ml.preprocess_image(request.files["image"].read())
        with torch.no_grad():
            out = ml.model2(t)

        attrs, confs, top5s = {}, {}, {}
        for attr, info in DRESS_ENC.items():
            cls   = info["classes"]
            probs = torch.softmax(out[attr], dim=1)[0]
            idx   = int(torch.argmax(probs).item())
            probs_list = probs.tolist()
            attrs[attr] = cls[idx]
            confs[attr] = round(float(probs_list[idx]), 4)
            top5s[attr] = [
                {"label": c, "score": round(float(p), 4)}
                for c, p in sorted(zip(cls, probs_list), key=lambda x: -x[1])[:5]
            ]

        return jsonify({
            "color":                 attrs["color"],
            "neckline":              attrs["neckline"],
            "dress_length":          attrs["dress_length"],
            "fabric":                attrs["fabric"],
            "pattern":               attrs["pattern"],
            "sleeve_length":         attrs["sleeve_length"],
            "usage":                 attrs["usage"],
            "season":                attrs["season"],
            "gender":                attrs["gender"],
            "attribute_confidences": confs,
            "top_predictions":       top5s,
            "dress_feature_vector":  encode_dress_to_79(attrs),
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
