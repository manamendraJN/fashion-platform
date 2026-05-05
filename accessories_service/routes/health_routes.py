from flask import Blueprint, jsonify
import services.ml_models as ml
from config import (
    OCCASIONS, RELIGIONS, GENDERS, ACC_CATEGORIES,
    OCCASION_PREFERRED_CATS, OCCASION_EXCLUDED_CATS, OCCASION_USAGE_COMPAT,
    GENDER_PREFERRED_CATS, GENDER_EXCLUDED_CATS,
    COLOR_COMPAT, SEASON_COMPAT, NECKLINE_ACC_GUIDE, SLEEVE_ACC_GUIDE,
)

health_bp = Blueprint("health_bp", __name__)


@health_bp.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "running",
        "device": str(ml.device if hasattr(ml, "device") else "cpu"),
        "models": {
            "model1_accessory_classifier": ml.model1 is not None,
            "model2_dress_extractor":      ml.model2 is not None,
            "model3_fusion_mlp":           ml.model3 is not None,
            "model4_dqn_recommender":      ml.model4 is not None,
        },
        "wardrobe_size": len(ml.wardrobe_metadata) if ml.wardrobe_metadata else 0,
    })


@health_bp.route("/mappings", methods=["GET"])
def get_mappings():
    return jsonify({
        "occasions":               OCCASIONS,
        "religions":               RELIGIONS,
        "genders":                 GENDERS,
        "categories":              ACC_CATEGORIES,
        "occasion_preferred_cats": OCCASION_PREFERRED_CATS,
        "occasion_excluded_cats":  OCCASION_EXCLUDED_CATS,
        "occasion_usage_compat":   OCCASION_USAGE_COMPAT,
        "gender_preferred_cats":   GENDER_PREFERRED_CATS,
        "gender_excluded_cats":    GENDER_EXCLUDED_CATS,
        "color_compat":            COLOR_COMPAT,
        "season_compat":           SEASON_COMPAT,
        "neckline_acc_guide":      NECKLINE_ACC_GUIDE,
        "sleeve_acc_guide":        SLEEVE_ACC_GUIDE,
    })
