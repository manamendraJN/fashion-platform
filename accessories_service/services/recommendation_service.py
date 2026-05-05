import numpy as np
import torch
import services.ml_models as ml
from config import (
    ACC_DIM,
    OCCASION_EXCLUDED_CATS, GENDER_EXCLUDED_CATS,
    GENDER_ACC_COMPAT, OCCASION_USAGE_COMPAT,
    COLOR_COMPAT, SEASON_COMPAT,
    OCCASION_PREFERRED_CATS, GENDER_PREFERRED_CATS,
    RELIGION_PREFS, NECKLINE_ACC_GUIDE, SLEEVE_ACC_GUIDE,
)
from utils.encoding_utils import encode_accessory_49


def run_dqn_recommend(base_fused: np.ndarray, wardrobe_items: list,
                      top_k: int = 3) -> list:
    """
    Sequential DQN recommendation — exactly matches notebook training.

    Steps:
      1. Encode every wardrobe item → 49-dim vector
      2. For each step (0,1,2):
         - Build state: base_fused(256) + selected_history(3×49) + step_norm(1) = 404
         - Run DQN → Q-values per item
         - Mask already-selected items
         - Pick highest Q-value item
         - Add to selected history for next step
    """
    if ml.model4 is None or not wardrobe_items:
        return []

    # Encode all wardrobe items dynamically → N × 49
    encoded = [encode_accessory_49(acc) for acc in wardrobe_items]
    wardrobe_t = torch.tensor(
        np.array(encoded, dtype=np.float32), dtype=torch.float32
    ).to(ml.device)

    selected_indices   = []
    selected_encodings = []
    results            = []

    for step in range(min(top_k, len(wardrobe_items))):
        # Build state matching training format (notebook _get_state)
        sel_history = np.zeros(3 * ACC_DIM, dtype=np.float32)
        for i, enc in enumerate(selected_encodings):
            sel_history[i * ACC_DIM:(i + 1) * ACC_DIM] = enc

        step_norm = np.array([step / 3.0], dtype=np.float32)
        state     = np.concatenate([base_fused, sel_history, step_norm])  # 404-dim
        state_t   = torch.tensor(state, dtype=torch.float32).unsqueeze(0).to(ml.device)

        with torch.no_grad():
            q_vals = ml.model4(state_t, wardrobe_t)[0]  # [N]

        # Mask already-selected items (notebook: q + (mask-1)*1e9)
        for idx in selected_indices:
            q_vals[idx] = float("-inf")

        best_idx = int(torch.argmax(q_vals).item())
        best_q   = float(q_vals[best_idx].item())

        acc = wardrobe_items[best_idx]
        selected_indices.append(best_idx)
        selected_encodings.append(encoded[best_idx])

        results.append({
            "wardrobe_index":      best_idx,
            "item_id":             str(acc.get("id", best_idx)),
            "name":                acc.get("productDisplayName", acc.get("name", f"Item #{best_idx}")),
            "category":            acc.get("category", "Unknown"),
            "color":               acc.get("mapped_color", acc.get("color", acc.get("baseColour", ""))),
            "gender":              acc.get("gender", ""),
            "usage":               acc.get("mapped_usage", acc.get("usage", "")),
            "season":              acc.get("season", ""),
            "image":               acc.get("image", acc.get("image_path", "")),
            "image_path":          acc.get("image", acc.get("image_path", "")),
            "available":           bool(acc.get("available", acc.get("isAvailable", True))),
            "usage_count":         int(acc.get("usage_count", 0)),
            "last_used_date":      acc.get("last_used_date"),
            "q_value":             round(best_q, 4),
            "compatibility_score": round(best_q, 4),
            "rank":                step + 1,
        })

    # Group by category
    cat_map = {}
    for item in results:
        cat = item["category"]
        if cat not in cat_map:
            cat_map[cat] = []
        item["rank_in_category"] = len(cat_map[cat]) + 1
        cat_map[cat].append(item)

    return [{"category": cat, "items": items} for cat, items in cat_map.items()]


# ── kept for /explain endpoint only — not used in recommendations ──────────

def is_eligible(acc, occasion, gender, dress_color, dress_season, budget):
    cat     = acc.get("category", "")
    acc_gen = acc.get("gender", "Unisex")
    acc_use = acc.get("mapped_usage", acc.get("usage", "Casual"))
    if cat in OCCASION_EXCLUDED_CATS.get(occasion, []):   return False, 0.0
    if cat in GENDER_EXCLUDED_CATS.get(gender, []):        return False, 0.0
    if acc_gen not in GENDER_ACC_COMPAT.get(gender, ["Men", "Women", "Unisex"]): return False, 0.0
    if acc_use not in OCCASION_USAGE_COMPAT.get(occasion, ["Casual"]):           return False, 0.0
    acc_col = acc.get("mapped_color", acc.get("color", acc.get("baseColour", "")))
    compat  = COLOR_COMPAT.get(dress_color, [])
    neutrals = ["Gold", "Silver", "Metallic", "Black", "White"]
    al = acc_col.strip().lower(); dl = dress_color.strip().lower()
    cl = [x.lower() for x in compat]
    score = 0.0
    if al == dl:             score += 0.45
    elif al in cl:           score += 0.45
    elif al in [x.lower() for x in neutrals]: score += 0.30
    else:                    score -= 0.10
    if cat in OCCASION_PREFERRED_CATS.get(occasion, []): score += 0.25
    else:                                                 score += 0.05
    if cat in GENDER_PREFERRED_CATS.get(gender, []):      score += 0.15
    if acc.get("season", "") in SEASON_COMPAT.get(dress_season, [dress_season]): score += 0.15
    return True, min(score, 1.0)


def full_compat_score(acc, dress_attrs, occasion, gender, religion, budget):
    eligible, score = is_eligible(acc, occasion, gender,
                                  dress_attrs.get("color", ""),
                                  dress_attrs.get("season", ""), budget)
    if not eligible:
        return -1.0
    cat = acc.get("category", "")
    if cat in RELIGION_PREFS.get(religion, {}).get("preferred_categories", []):
        score = min(score + 0.10, 1.0)
    neck = NECKLINE_ACC_GUIDE.get(dress_attrs.get("neckline", ""), {})
    if cat in neck.get("best", []):  score = min(score + 0.08, 1.0)
    if cat in neck.get("avoid", []): score = max(score - 0.15, 0.0)
    slv = SLEEVE_ACC_GUIDE.get(dress_attrs.get("sleeve_length", ""), {})
    if cat in slv.get("best", []):   score = min(score + 0.06, 1.0)
    return round(score, 4)
