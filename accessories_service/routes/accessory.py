import torch
from flask import Blueprint, request, jsonify
import services.ml_models as ml
from config import ACC_CATEGORIES, ACC_COLORS, ACC_GENDERS, ACC_SEASONS, ACC_USAGES

accessory_bp = Blueprint("accessory_bp", __name__)


@accessory_bp.route("/classify-accessory", methods=["POST"])
def classify_accessory():
    if "image" not in request.files:
        return jsonify({"error": "No image provided"}), 400
    if ml.model1 is None:
        return jsonify({"error": "Model 1 not loaded"}), 503
    try:
        t = ml.preprocess_image(request.files["image"].read())
        with torch.no_grad():
            out = ml.model1(t)

        def top5(logits, classes):
            probs = torch.softmax(logits, dim=1)[0]
            idx   = int(torch.argmax(probs).item())
            probs_list = probs.tolist()
            tops  = sorted(zip(classes, probs_list), key=lambda x: -x[1])[:5]
            return classes[idx], float(probs_list[idx]), [{"label": l, "score": round(s, 4)} for l, s in tops]

        cat, cc, ct = top5(out["category"], ACC_CATEGORIES)
        col, lc, lt = top5(out["color"],    ACC_COLORS)
        gen, gc, gt = top5(out["gender"],   ACC_GENDERS)
        sea, sc, st = top5(out["season"],   ACC_SEASONS)
        use, uc, ut = top5(out["usage"],    ACC_USAGES)

        return jsonify({
            "category":       cat,
            "color":          col,
            "gender":         gen,
            "season":         sea,
            "usage":          use,
            "confidence":     round(cc, 4),
            "top_categories": ct,
            "top_colors":     lt,
            "top_genders":    gt,
            "top_seasons":    st,
            "top_usages":     ut,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
