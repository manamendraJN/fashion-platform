import numpy as np
from config import (
    DRESS_ENC, DRESS_ATTRS_ORDER,
    ACC_CATEGORIES, ACC_COLORS, ACC_GENDERS, ACC_SEASONS, ACC_USAGES,
    OCCASIONS, RELIGIONS, GENDERS, BUDGET_MAX,
)


def one_hot(value, classes: list) -> list:
    v = [0.0] * len(classes)
    if value in classes:
        v[classes.index(value)] = 1.0
    return v


def encode_dress_to_79(attrs: dict) -> list:
    """79-dim dress feature vector for Model 3 — NO gender."""
    vec = []
    for attr in DRESS_ATTRS_ORDER:
        vec.extend(one_hot(attrs.get(attr, ""), DRESS_ENC[attr]["classes"]))
    assert len(vec) == 79
    return vec


def encode_metadata_20(occasion: str, religion: str, gender: str, budget: float) -> list:
    """20-dim: occasion(10) + religion(6) + gender(3) + budget(1)"""
    return (
        one_hot(occasion, OCCASIONS) +
        one_hot(religion, RELIGIONS) +
        one_hot(gender,   GENDERS)   +
        [min(float(budget) / BUDGET_MAX, 1.0)]
    )


def build_dqn_fused_vector(dress_attrs: dict, occasion: str,
                            gender: str, budget: float) -> np.ndarray:
    """
    256-dim structured vector — exact training format (notebook Cell 14).
    dims  0-23 : dress color one-hot
    dims 20-29 : occasion one-hot (intentional overlap with color range)
    dims 30-33 : season one-hot
    dims 34-36 : gender one-hot
    dim  37    : budget / 50000
    dims 38-255: zeros
    """
    fv = np.zeros(256, dtype=np.float32)
    dc = DRESS_ENC["color"]["classes"]
    c  = dress_attrs.get("color", "")
    if c in dc:
        fv[dc.index(c)] = 1.0
    if occasion in OCCASIONS:
        fv[20 + OCCASIONS.index(occasion)] = 1.0
    sc = DRESS_ENC["season"]["classes"]
    s  = dress_attrs.get("season", "")
    if s in sc:
        fv[30 + sc.index(s)] = 1.0
    if gender in GENDERS:
        fv[34 + GENDERS.index(gender)] = 1.0
    fv[37] = float(budget) / BUDGET_MAX
    return fv


def encode_accessory_49(acc: dict) -> list:
    """49-dim: category(12) + color(25) + gender(3) + season(4) + usage(5)"""
    return (
        one_hot(acc.get("category", ""), ACC_CATEGORIES) +
        one_hot(acc.get("mapped_color", acc.get("color", acc.get("baseColour", ""))), ACC_COLORS) +
        one_hot(acc.get("gender", "Unisex"), ACC_GENDERS) +
        one_hot(acc.get("season", ""), ACC_SEASONS) +
        one_hot(acc.get("mapped_usage", acc.get("usage", "Casual")), ACC_USAGES)
    )
