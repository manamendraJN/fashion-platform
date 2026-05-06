import json
import numpy as np
import torch
from flask import Blueprint, request, jsonify
import services.ml_models as ml
from config import DRESS_ENC
from utils.encoding_utils import encode_dress_to_79, encode_metadata_20, build_dqn_fused_vector
from services.recommendation_service import run_dqn_recommend

recommend_bp = Blueprint("recommend_bp", __name__)


def _model3_compat(dress_vector: list, occasion: str, religion: str,
                   gender: str, budget: float) -> float:
    """Run model3 → compatibility score only (0-1)."""
    if ml.model3 is None:
        return 0.0
    meta = encode_metadata_20(occasion, religion, gender, budget)
    dt   = torch.tensor(dress_vector, dtype=torch.float32).unsqueeze(0).to(ml.device)
    mt   = torch.tensor(meta,         dtype=torch.float32).unsqueeze(0).to(ml.device)
    with torch.no_grad():
        out = ml.model3(dt, mt)
    return round(float(out["compatibility_score"].item()), 4)


@recommend_bp.route("/fuse-features", methods=["POST"])
def fuse_features():
    data = request.get_json()
    if not data:
        return jsonify({"error": "JSON required"}), 400

    dress_attrs  = data.get("dress_attributes", {})
    dress_vector = data.get("dress_feature_vector") or encode_dress_to_79(dress_attrs)
    if len(dress_vector) != 79:
        return jsonify({"error": f"dress_feature_vector must be 79 dims, got {len(dress_vector)}"}), 400

    occasion = data.get("occasion", "Casual")
    religion = data.get("religion", "None")
    gender   = data.get("gender",   "Unisex")
    budget   = float(data.get("budget", 5000))

    if ml.model3 is None:
        return jsonify({"error": "Model 3 not loaded"}), 503
    try:
        meta = encode_metadata_20(occasion, religion, gender, budget)
        dt   = torch.tensor(dress_vector, dtype=torch.float32).unsqueeze(0).to(ml.device)
        mt   = torch.tensor(meta,         dtype=torch.float32).unsqueeze(0).to(ml.device)
        with torch.no_grad():
            out = ml.model3(dt, mt)

        return jsonify({
            "fused_vector":        out["fused_vector"][0].tolist(),
            "dqn_fused_vector":    build_dqn_fused_vector(dress_attrs, occasion, gender, budget).tolist(),
            "compatibility_score": round(float(out["compatibility_score"].item()), 4),
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@recommend_bp.route("/recommend", methods=["POST"])
def recommend():
    data = request.get_json()
    if not data:
        return jsonify({"error": "JSON required"}), 400

    dress_attrs  = data.get("dress_attributes", {})
    dress_vector = data.get("dress_feature_vector") or encode_dress_to_79(dress_attrs)
    occasion     = data.get("occasion", "Casual")
    religion     = data.get("religion", "None")
    gender       = data.get("gender",   "Unisex")
    budget       = float(data.get("budget", 5000))
    wardrobe     = data.get("wardrobe", [])

    if ml.model4 is None:
        return jsonify({"error": "Model 4 not loaded"}), 503

    try:
        items     = wardrobe if wardrobe else (ml.wardrobe_metadata or [])
        # DQN uses build_dqn_fused_vector — exact format from training notebook
        dqn_state = build_dqn_fused_vector(dress_attrs, occasion, gender, budget)
        recs      = run_dqn_recommend(dqn_state, items, top_k=3)

        # model3 compatibility score (dress+context overall score)
        compat = _model3_compat(dress_vector, occasion, religion, gender, budget)

        by_cat = {}
        for r in recs:
            by_cat.setdefault(r["category"], []).extend(r["items"])

        return jsonify({
            "recommendations":     recs,
            "by_category":         by_cat,
            "wardrobe_checked":    len(items),
            "compatibility_score": compat,
            "occasion":            occasion,
            "gender":              gender,
            "religion":            religion,
            "budget":              budget,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@recommend_bp.route("/full-pipeline", methods=["POST"])
def full_pipeline():
    if "image" not in request.files:
        return jsonify({"error": "No dress image"}), 400

    img_bytes   = request.files["image"].read()
    occasion    = request.form.get("occasion",  "Casual")
    religion    = request.form.get("religion",  "None")
    gender      = request.form.get("gender",    "Unisex")
    budget      = float(request.form.get("budget", 5000))
    size_filter = request.form.get("size", "").strip()
    wardrobe    = json.loads(request.form.get("wardrobe", "[]"))

    if size_filter:
        wardrobe = [a for a in wardrobe if not a.get("size") or
                    a.get("size", "").strip().lower() == size_filter.lower() or
                    a.get("size", "").strip().lower() in ["one size", "free size"]]

    try:
        # Step 1 — model2: extract dress attributes from image
        if ml.model2 is not None:
            t = ml.preprocess_image(img_bytes)
            with torch.no_grad():
                m2 = ml.model2(t)
            dress_attrs = {
                attr: info["classes"][int(torch.argmax(
                    torch.softmax(m2[attr], dim=1)[0]
                ).item())]
                for attr, info in DRESS_ENC.items()
            }
        else:
            return jsonify({"error": "Model 2 not loaded"}), 503

        # Step 2 — encode dress → 79-dim
        dress_vector = encode_dress_to_79(dress_attrs)

        # Step 3 — model3: overall dress+context compatibility score
        compat_score = _model3_compat(dress_vector, occasion, religion, gender, budget)

        # Step 4 — model4 DQN: sequential accessory recommendation
        # Uses build_dqn_fused_vector (exact training format from notebook)
        dqn_state = build_dqn_fused_vector(dress_attrs, occasion, gender, budget)
        items     = wardrobe if wardrobe else (ml.wardrobe_metadata or [])
        recs      = run_dqn_recommend(dqn_state, items, top_k=3)

        return jsonify({
            "dress_attributes":    dress_attrs,
            "compatibility_score": compat_score,
            "recommendations":     recs,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
