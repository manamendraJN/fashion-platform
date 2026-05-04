"""
AuraStyle Flask Backend - Complete Implementation
IT22590794 - Rajapaksha P D P P

FIXES APPLIED:
- Occasion→Category hard exclusions (Formal/Office → NO Sunglasses, Hats)
- Exact occasion-based category filtering (only wardrobe-relevant items)
- Gender-specific category filtering  
- Correct 79-dim dress vector (no gender) for Model 3
- Correct DQN fused vector format (structured 256-dim, exact training format)
- Accurate color compatibility mappings
- Full explainability / chat endpoint with style + neckline + sleeve advice
- Religion-aware filtering
"""

import os, io, json, sqlite3
from contextlib import contextmanager
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import torch
import torch.nn as nn
import torchvision.models as models
import torchvision.transforms as transforms

# ─────────────────────────────────────────────────────────────
# APP SETUP
# ─────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
DB_PATH    = os.path.join(BASE_DIR, "aurastyle.db")
device     = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ─────────────────────────────────────────────────────────────
# SQLite DATABASE SETUP
# ─────────────────────────────────────────────────────────────
@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db():
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS wardrobe (
                id          TEXT PRIMARY KEY,
                name        TEXT NOT NULL,
                category    TEXT,
                color       TEXT,
                gender      TEXT,
                usage       TEXT,
                season      TEXT,
                brand       TEXT,
                size        TEXT,
                price       REAL DEFAULT 0,
                image       TEXT,
                is_favourite INTEGER DEFAULT 0,
                is_available INTEGER DEFAULT 1,
                usage_count INTEGER DEFAULT 0,
                last_used_date TEXT DEFAULT NULL,
                added_date  TEXT DEFAULT (date('now')),
                updated_at  TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS saved_looks (
                id              TEXT PRIMARY KEY,
                name            TEXT NOT NULL,
                occasion        TEXT,
                gender          TEXT,
                dress_image     TEXT,
                accessory_ids   TEXT,
                accessory_data  TEXT,
                created_at      TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS activity_log (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                action      TEXT NOT NULL,
                description TEXT,
                item_id     TEXT,
                created_at  TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS recommendation_log (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                occasion        TEXT,
                gender          TEXT,
                religion        TEXT,
                budget          REAL,
                recommended_ids TEXT,
                selected_id     TEXT,
                accepted        INTEGER DEFAULT 0,
                created_at      TEXT DEFAULT (datetime('now'))
            );
        """)
    print("✅ SQLite database initialised:", DB_PATH)

def row_to_dict(row):
    if row is None:
        return None
    d = dict(row)
    d["isFavourite"] = bool(d.pop("is_favourite", 0))
    d["isAvailable"] = bool(d.pop("is_available", 1))
    d.setdefault("last_used_date", None)
    return d

# ─────────────────────────────────────────────────────────────
# LABEL ENCODERS
# ─────────────────────────────────────────────────────────────
with open(os.path.join(MODELS_DIR, "accessory_label_encoders.json")) as f:
    ACC_ENC = json.load(f)
with open(os.path.join(MODELS_DIR, "dress_label_encoders.json")) as f:
    DRESS_ENC = json.load(f)
with open(os.path.join(MODELS_DIR, "fusion_metadata_schema.json")) as f:
    FUSION_SCHEMA = json.load(f)

OCCASIONS  = FUSION_SCHEMA["occasions"]   # 10
RELIGIONS  = FUSION_SCHEMA["religions"]   # 6
GENDERS    = FUSION_SCHEMA["genders"]     # ['Men','Women','Unisex']
BUDGET_MAX = float(FUSION_SCHEMA["budget_max"])  # 50000

ACC_CATEGORIES = ACC_ENC["categories"]  # 12
ACC_COLORS     = ACC_ENC["colors"]      # 25
ACC_GENDERS    = ACC_ENC["genders"]     # ['Men','Unisex','Women']
ACC_SEASONS    = ACC_ENC["seasons"]     # 4
ACC_USAGES     = ACC_ENC["usages"]      # ['Casual','Festive/Religious','Formal','Party','Sports']

DRESS_ATTRS_ORDER = ["color","neckline","dress_length","fabric",
                     "pattern","sleeve_length","usage","season"]  # 79 dims, NO gender
ACC_DIM   = 49   # category(12)+color(25)+gender(3)+season(4)+usage(5)
STATE_DIM = 404  # 256 fused + 3×49 history + 1 step

# ─────────────────────────────────────────────────────────────
# ALL COMPATIBILITY MAPPINGS  (exact from training notebooks)
# ─────────────────────────────────────────────────────────────

# Occasion → allowed accessory usage values
OCCASION_USAGE_COMPAT = {
    "Casual":            ["Casual"],
    "Formal":            ["Formal", "Casual"],
    "Party":             ["Party", "Casual"],
    "Wedding":           ["Festive/Religious", "Party", "Formal"],
    "Festive/Religious": ["Festive/Religious", "Formal"],
    "Sports":            ["Sports", "Casual"],
    "Beach":             ["Casual", "Sports"],
    "Date Night":        ["Party", "Casual", "Formal"],
    "Office":            ["Formal", "Casual"],
    "Interview":         ["Formal"],
}

# Occasion → preferred/best accessory categories
OCCASION_PREFERRED_CATS = {
    "Casual":            ["Watches", "Sunglasses & Eyewear", "Belts", "Hats & Headwear"],
    "Formal":            ["Watches", "Cufflinks", "Ties", "Belts"],
    "Party":             ["Earrings", "Necklaces & Chains", "Bracelets & Bangles", "Handbags & Clutches"],
    "Wedding":           ["Necklaces & Chains", "Earrings", "Bracelets & Bangles", "Rings"],
    "Festive/Religious": ["Necklaces & Chains", "Earrings", "Bracelets & Bangles", "Rings"],
    "Sports":            ["Sunglasses & Eyewear", "Hats & Headwear"],
    "Beach":             ["Sunglasses & Eyewear", "Hats & Headwear", "Bracelets & Bangles"],
    "Office":            ["Watches", "Belts", "Cufflinks", "Ties"],
    "Interview":         ["Watches", "Belts", "Cufflinks"],
    "Date Night":        ["Earrings", "Necklaces & Chains", "Watches", "Bracelets & Bangles"],
}

# Occasion → HARD-EXCLUDED categories (never recommend these for this occasion)
OCCASION_EXCLUDED_CATS = {
    "Formal":    ["Sunglasses & Eyewear", "Hats & Headwear"],
    "Office":    ["Sunglasses & Eyewear", "Hats & Headwear"],
    "Interview": ["Sunglasses & Eyewear", "Hats & Headwear", "Handbags & Clutches",
                  "Earrings", "Bracelets & Bangles", "Rings",
                  "Necklaces & Chains"],
    "Wedding":   ["Sunglasses & Eyewear", "Hats & Headwear"],
    "Sports":    ['Belts', 'Bracelets & Bangles', 'Cufflinks', 'Earrings', 'Handbags & Clutches', 'Necklaces & Chains', 'Rings', 'Ties', 'Watches'],
    "Beach":     ["Cufflinks", "Ties"],
}

# Gender → allowed accessory genders
GENDER_ACC_COMPAT = {
    "Men":    ["Men", "Unisex"],
    "Women":  ["Women", "Unisex"],
    "Unisex": ["Men", "Women", "Unisex"],
}

# Gender → preferred categories
GENDER_PREFERRED_CATS = {
    "Men":    ["Watches", "Belts", "Ties", "Cufflinks",
               "Sunglasses & Eyewear", "Hats & Headwear", "Rings", "Bracelets & Bangles"],
    "Women":  ["Necklaces & Chains", "Earrings", "Bracelets & Bangles", "Rings",
               "Handbags & Clutches", "Sunglasses & Eyewear",
               "Watches", "Hats & Headwear"],
    "Unisex": ["Watches", "Belts", "Sunglasses & Eyewear", "Hats & Headwear",
               "Bracelets & Bangles"],
}

# Gender → hard-excluded categories
GENDER_EXCLUDED_CATS = {
    "Men":    ["Earrings", "Necklaces & Chains", "Handbags & Clutches"],
    "Women":  ["Cufflinks", "Ties"],
    "Unisex": [],
}

# Dress color → compatible accessory colors
# Rules: neutral metallics (Gold/Silver/Metallic) go with almost everything
# Complementary colors, analogous colors, and classic combinations
COLOR_COMPAT = {
    "Black":      ["Silver", "Gold", "Red", "White", "Pink", "Blue", "Purple",
                   "Multi-color", "Metallic", "Grey", "Copper", "Burgundy", "Teal"],
    "White":      ["Gold", "Silver", "Blue", "Red", "Black", "Teal", "Navy Blue",
                   "Multi-color", "Copper", "Pink", "Purple", "Beige", "Metallic"],
    "Blue":       ["Silver", "White", "Gold", "Teal", "Navy Blue", "Copper",
                   "Metallic", "Grey", "Black", "Brown"],
    "Navy Blue":  ["Silver", "Gold", "White", "Copper", "Red", "Metallic",
                   "Beige", "Off White", "Grey"],
    "Red":        ["Gold", "Black", "Silver", "White", "Copper", "Metallic",
                   "Navy Blue", "Burgundy"],
    "Green":      ["Gold", "Brown", "Copper", "Beige", "Tan", "Silver",
                   "White", "Metallic", "Black"],
    "Pink":       ["Silver", "Gold", "White", "Purple", "Rose Gold",
                   "Metallic", "Nude", "Beige", "Black"],
    "Purple":     ["Silver", "Gold", "White", "Pink", "Metallic",
                   "Black", "Grey", "Copper"],
    "Yellow":     ["Gold", "Brown", "Black", "White", "Copper",
                   "Tan", "Beige", "Silver"],
    "Orange":     ["Gold", "Brown", "Copper", "Black", "Tan",
                   "Beige", "White", "Silver"],
    "Brown":      ["Gold", "Copper", "Beige", "Tan", "White", "Coffee",
                   "Off White", "Cream", "Silver", "Black"],
    "Grey":       ["Silver", "Black", "Blue", "Metallic", "White",
                   "Navy Blue", "Purple", "Gold"],
    "Beige":      ["Gold", "Brown", "Copper", "White", "Tan", "Coffee",
                   "Silver", "Nude", "Off White", "Metallic"],
    "Maroon":     ["Gold", "Silver", "Copper", "Black", "Beige",
                   "Off White", "Metallic", "White"],
    "Burgundy":   ["Gold", "Silver", "Black", "White", "Copper",
                   "Beige", "Metallic", "Off White"],
    "Teal":       ["Silver", "Gold", "White", "Blue", "Copper",
                   "Metallic", "Navy Blue", "Black"],
    "Gold":       ["Black", "White", "Red", "Navy Blue", "Maroon", "Brown",
                   "Burgundy", "Purple", "Beige", "Coffee"],
    "Silver":     ["Black", "Blue", "White", "Navy Blue", "Purple", "Grey",
                   "Teal", "Maroon", "Burgundy"],
    "Copper":     ["Brown", "Green", "Beige", "Maroon", "Burgundy",
                   "Orange", "Yellow", "Coffee", "Tan"],
    "Metallic":   ["Black", "Grey", "White", "Navy Blue", "Blue",
                   "Burgundy", "Maroon", "Purple", "Red"],
    "Multi-color":["Gold", "Silver", "Black", "White", "Metallic",
                   "Beige", "Brown", "Nude"],
    "Tan":        ["Brown", "Gold", "Beige", "Copper", "Coffee",
                   "Off White", "White", "Green"],
    "Off White":  ["Gold", "Silver", "Blue", "Brown", "Beige",
                   "Nude", "Copper", "Navy Blue", "Black"],
    "Nude":       ["Gold", "Brown", "Beige", "Copper", "Pink",
                   "Off White", "Silver", "Tan", "White"],
    "Coffee":     ["Gold", "Copper", "Brown", "Beige", "Tan",
                   "Off White", "Silver", "White"],
    "Navy":       ["Silver", "Gold", "White", "Copper", "Red", "Metallic",
                   "Beige", "Off White", "Grey"],
    "Cream":      ["Gold", "Brown", "Beige", "Copper", "Silver",
                   "Blue", "Black", "Pink"],
    "Olive":      ["Gold", "Brown", "Copper", "Tan", "Beige",
                   "Black", "White", "Silver"],
    "Mustard":    ["Brown", "Black", "Copper", "Gold", "Tan",
                   "Beige", "White", "Silver"],
    "Lavender":   ["Silver", "White", "Gold", "Purple", "Pink",
                   "Metallic", "Grey", "Black"],
    "Mint":       ["Silver", "White", "Gold", "Teal", "Blue",
                   "Metallic", "Black", "Copper"],
    "Coral":      ["Gold", "White", "Copper", "Beige", "Silver",
                   "Black", "Tan", "Brown"],
}

# Dress season → compatible accessory seasons
SEASON_COMPAT = {
    "Summer": ["Summer", "Spring", "All Seasons"],
    "Winter": ["Winter", "Fall", "All Seasons"],
    "Spring": ["Spring", "Summer", "All Seasons"],
    "Fall":   ["Fall", "Winter", "All Seasons"],
}

# Religion → preferences
RELIGION_PREFS = {
    "Muslim":    {"preferred_categories": ["Watches", "Rings"]},
    "Hindu":     {"preferred_categories": ["Necklaces & Chains", "Earrings", "Bracelets & Bangles", "Rings"]},
    "Buddhist":  {"preferred_categories": ["Bracelets & Bangles", "Necklaces & Chains"]},
    "Christian": {"preferred_categories": ["Necklaces & Chains", "Earrings", "Rings"]},
}

# Neckline → best/avoid accessory categories
NECKLINE_ACC_GUIDE = {
    "V-Neck":       {"best": ["Necklaces & Chains"],                        "avoid": []},
    "Crew Neck":    {"best": ["Necklaces & Chains", "Earrings"],            "avoid": []},
    "Scoop Neck":   {"best": ["Necklaces & Chains", "Earrings"],            "avoid": []},
    "Off-Shoulder": {"best": ["Earrings", "Bracelets & Bangles"],           "avoid": ["Necklaces & Chains"]},
    "Sweetheart":   {"best": ["Necklaces & Chains", "Earrings"],            "avoid": []},
    "Halter":       {"best": ["Earrings", "Bracelets & Bangles"],           "avoid": ["Necklaces & Chains"]},
    "High Neck":    {"best": ["Earrings", "Rings"],                         "avoid": ["Necklaces & Chains"]},
    "Turtleneck":   {"best": ["Earrings", "Rings", "Belts"],                "avoid": ["Necklaces & Chains"]},
    "Collared":     {"best": ["Watches", "Belts", "Cufflinks"],             "avoid": []},
    "Square Neck":  {"best": ["Necklaces & Chains", "Earrings"],            "avoid": []},
    "Boat Neck":    {"best": ["Earrings", "Bracelets & Bangles"],           "avoid": []},
    "Keyhole":      {"best": ["Earrings", "Necklaces & Chains"],            "avoid": []},
    "One-Shoulder": {"best": ["Earrings", "Bracelets & Bangles"],           "avoid": []},
    "Cowl Neck":    {"best": ["Earrings", "Belts"],                         "avoid": ["Necklaces & Chains"]},
    "Mock Neck":    {"best": ["Earrings", "Rings"],                         "avoid": ["Necklaces & Chains"]},
}

# Sleeve length → best accessory categories
SLEEVE_ACC_GUIDE = {
    "Sleeveless":   {"best": ["Bracelets & Bangles", "Watches"]},
    "Short Sleeve": {"best": ["Bracelets & Bangles", "Watches"]},
    "3/4 Sleeve":   {"best": ["Watches", "Rings"]},
    "Long Sleeve":  {"best": ["Watches", "Rings", "Cufflinks"]},
    "Bell Sleeve":  {"best": ["Rings", "Earrings"]},
    "Cap Sleeve":   {"best": ["Bracelets & Bangles", "Watches"]},
}


# ─────────────────────────────────────────────────────────────
# IMAGE PREPROCESSING
# ─────────────────────────────────────────────────────────────
INFERENCE_TRANSFORM = transforms.Compose([
    transforms.Resize((256, 256)),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std =[0.229, 0.224, 0.225]),
])

def preprocess_image(image_bytes: bytes) -> torch.Tensor:
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    return INFERENCE_TRANSFORM(img).unsqueeze(0).to(device)


# ─────────────────────────────────────────────────────────────
# MODEL ARCHITECTURES
# ─────────────────────────────────────────────────────────────
class AccessoryClassifier(nn.Module):
    """
    Exact architecture matching training notebook (Cell 9).
    Uses separate named heads: category_head, gender_head, color_head, season_head, usage_head
    """
    def __init__(self, num_categories=12, num_genders=3, num_colors=25,
                 num_seasons=4, num_usages=5):
        super().__init__()
        self.backbone = models.resnet152(weights=None)
        nf = self.backbone.fc.in_features  # 2048
        self.backbone.fc = nn.Identity()

        # Shared feature layers
        self.shared_fc = nn.Sequential(
            nn.Linear(nf, 1024), nn.ReLU(inplace=True), nn.BatchNorm1d(1024), nn.Dropout(0.3),
            nn.Linear(1024, 512), nn.ReLU(inplace=True), nn.BatchNorm1d(512), nn.Dropout(0.2),
        )

        # Classification heads — exact names from training notebook
        self.category_head = nn.Sequential(
            nn.Linear(512, 256), nn.ReLU(inplace=True), nn.Dropout(0.2), nn.Linear(256, num_categories)
        )
        self.gender_head = nn.Sequential(
            nn.Linear(512, 128), nn.ReLU(inplace=True), nn.Linear(128, num_genders)
        )
        self.color_head = nn.Sequential(
            nn.Linear(512, 256), nn.ReLU(inplace=True), nn.Dropout(0.2), nn.Linear(256, num_colors)
        )
        self.season_head = nn.Sequential(
            nn.Linear(512, 128), nn.ReLU(inplace=True), nn.Linear(128, num_seasons)
        )
        self.usage_head = nn.Sequential(
            nn.Linear(512, 128), nn.ReLU(inplace=True), nn.Linear(128, num_usages)
        )

    def forward(self, x):
        features = self.backbone(x)
        shared   = self.shared_fc(features)
        return {
            "category": self.category_head(shared),
            "gender":   self.gender_head(shared),
            "color":    self.color_head(shared),
            "season":   self.season_head(shared),
            "usage":    self.usage_head(shared),
            "features": shared,
        }


class DressAttributeExtractor(nn.Module):
    def __init__(self):
        super().__init__()
        self.backbone = models.resnet152(weights=None)
        nf = self.backbone.fc.in_features
        self.backbone.fc = nn.Identity()
        self.shared_fc = nn.Sequential(
            nn.Linear(nf, 1024), nn.ReLU(inplace=True), nn.BatchNorm1d(1024), nn.Dropout(0.3),
            nn.Linear(1024, 512), nn.ReLU(inplace=True), nn.BatchNorm1d(512), nn.Dropout(0.2),
        )
        self.heads = nn.ModuleDict()
        for attr, info in DRESS_ENC.items():
            n = info["num_classes"]
            if n >= 10:
                self.heads[attr] = nn.Sequential(nn.Linear(512,256), nn.ReLU(), nn.Dropout(0.2), nn.Linear(256,n))
            else:
                self.heads[attr] = nn.Sequential(nn.Linear(512,128), nn.ReLU(), nn.Linear(128,n))
    def forward(self, x):
        s = self.shared_fc(self.backbone(x))
        out = {k: h(s) for k, h in self.heads.items()}
        out["features"] = s
        return out


class MultimodalFusionMLP(nn.Module):
    def __init__(self, dress_feat_dim=79, metadata_dim=20):
        super().__init__()
        total = dress_feat_dim + metadata_dim
        self.network = nn.Sequential(
            nn.Linear(total, 512), nn.LeakyReLU(0.1), nn.Dropout(0.3),
            nn.Linear(512, 512),   nn.LeakyReLU(0.1), nn.Dropout(0.3),
            nn.Linear(512, 256),   nn.LeakyReLU(0.1), nn.Dropout(0.2),
            nn.Linear(256, 256),   nn.LeakyReLU(0.1),
        )
        self.compatibility_head = nn.Sequential(
            nn.Linear(256, 64), nn.LeakyReLU(0.1),
            nn.Linear(64, 1),   nn.Sigmoid(),
        )
    def forward(self, dress_feat, meta):
        x     = torch.cat([dress_feat, meta], dim=1)
        fused = self.network(x)
        score = self.compatibility_head(fused).squeeze(-1)
        return {"fused_vector": fused, "compatibility_score": score}


class DuelingDQN(nn.Module):
    def __init__(self, state_dim=404, query_dim=128, accessory_dim=49):
        super().__init__()
        self.state_encoder = nn.Sequential(
            nn.Linear(state_dim, 512), nn.ReLU(inplace=True), nn.LayerNorm(512), nn.Dropout(0.1),
            nn.Linear(512, 256),       nn.ReLU(inplace=True), nn.LayerNorm(256), nn.Dropout(0.1),
        )
        self.value_stream     = nn.Sequential(nn.Linear(256,128), nn.ReLU(), nn.Linear(128,1))
        self.advantage_stream = nn.Sequential(nn.Linear(256,128), nn.ReLU(), nn.Linear(128,query_dim))
        self.accessory_encoder= nn.Sequential(nn.Linear(accessory_dim,query_dim), nn.ReLU(), nn.LayerNorm(query_dim))
    def forward(self, state, wardrobe):
        enc     = self.state_encoder(state)
        value   = self.value_stream(enc)
        query   = self.advantage_stream(enc)
        acc_enc = self.accessory_encoder(wardrobe)
        scores  = torch.matmul(query, acc_enc.T)
        return value + scores - scores.mean(dim=1, keepdim=True)


# ─────────────────────────────────────────────────────────────
# MODEL GLOBALS
# ─────────────────────────────────────────────────────────────
model1 = model2 = model3 = model4 = None
wardrobe_tensor   = None
wardrobe_metadata = None


def load_models():
    global model1, model2, model3, model4, wardrobe_tensor, wardrobe_metadata
    print("\n" + "="*60 + "\n🔄  Loading models...\n" + "="*60)

    # Model 1
    try:
        path = os.path.join(MODELS_DIR, "accessory_classifier_resnet152_inference.pth")
        ckpt = torch.load(path, map_location=device, weights_only=False)
        # Read num_classes from checkpoint (saved during training)
        m = AccessoryClassifier(
            num_categories=ckpt.get("num_categories", 12),
            num_genders   =ckpt.get("num_genders",    3),
            num_colors    =ckpt.get("num_colors",     25),
            num_seasons   =ckpt.get("num_seasons",    4),
            num_usages    =ckpt.get("num_usages",     5),
        ).to(device)
        sd = ckpt.get("model_state_dict") or ckpt.get("state_dict") or ckpt
        m.load_state_dict(sd); m.eval()
        model1 = m
        print("✅ Model 1 (Accessory Classifier) loaded")
    except Exception as e:
        print(f"⚠️  Model 1: {e}")

    # Model 2
    try:
        path = os.path.join(MODELS_DIR, "dress_attribute_extractor_inference.pth")
        ckpt = torch.load(path, map_location=device, weights_only=False)
        m    = DressAttributeExtractor().to(device)
        sd   = ckpt.get("model_state_dict") or ckpt.get("state_dict") or ckpt
        m.load_state_dict(sd); m.eval()
        model2 = m
        print("✅ Model 2 (Dress Extractor) loaded")
    except Exception as e:
        print(f"⚠️  Model 2: {e}")

    # Model 3
    try:
        path = os.path.join(MODELS_DIR, "fusion_transformer_inference.pth")
        ckpt = torch.load(path, map_location=device, weights_only=False)
        m    = MultimodalFusionMLP(
            dress_feat_dim=ckpt.get("dress_feat_dim", 79),
            metadata_dim  =ckpt.get("metadata_dim",   20),
        ).to(device)
        m.load_state_dict(ckpt["model_state_dict"]); m.eval()
        model3 = m
        print("✅ Model 3 (Fusion MLP) loaded")
    except Exception as e:
        print(f"⚠️  Model 3: {e}")

    # Model 4
    try:
        path = os.path.join(MODELS_DIR, "dqn_recommender_inference.pth")
        ckpt = torch.load(path, map_location=device, weights_only=False)
        sd   = ckpt["policy_state_dict"]
        sdim = sd["state_encoder.0.weight"].shape[1]
        m    = DuelingDQN(state_dim=sdim).to(device)
        m.load_state_dict(sd); m.eval()
        model4            = m
        wardrobe_tensor   = ckpt["wardrobe_tensor"].to(device)
        wardrobe_metadata = ckpt["wardrobe_metadata"]
        print(f"✅ Model 4 (DQN) loaded | wardrobe={len(wardrobe_metadata)} items | state_dim={sdim}")
    except Exception as e:
        print(f"⚠️  Model 4: {e}")

    print("="*60 + "\n")


# ─────────────────────────────────────────────────────────────
# ENCODING HELPERS
# ─────────────────────────────────────────────────────────────
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


def encode_metadata_20(occasion, religion, gender, budget) -> list:
    """20-dim: occasion(10)+religion(6)+gender(3)+budget(1)"""
    return (one_hot(occasion, OCCASIONS) +
            one_hot(religion, RELIGIONS) +
            one_hot(gender,   GENDERS)   +
            [min(float(budget) / BUDGET_MAX, 1.0)])


def build_dqn_fused_vector(dress_attrs: dict, occasion: str,
                            gender: str, budget: float) -> np.ndarray:
    """
    256-dim structured vector — EXACT training format (notebook Cell 14).
    dims  0-23 : dress color one-hot
    dims 20-29 : occasion one-hot   (intentional overlap with color range)
    dims 30-33 : season one-hot
    dims 34-36 : gender one-hot
    dim  37    : budget/50000
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
    """49-dim: category(12)+color(25)+gender(3)+season(4)+usage(5)"""
    return (one_hot(acc.get("category", ""), ACC_CATEGORIES) +
            one_hot(acc.get("mapped_color", acc.get("color", acc.get("baseColour", ""))), ACC_COLORS) +
            one_hot(acc.get("gender", "Unisex"), ACC_GENDERS) +
            one_hot(acc.get("season", ""), ACC_SEASONS) +
            one_hot(acc.get("mapped_usage", acc.get("usage", "Casual")), ACC_USAGES))


# ─────────────────────────────────────────────────────────────
# ELIGIBILITY CHECK  (core filtering logic)
# ─────────────────────────────────────────────────────────────
def is_eligible(acc: dict, occasion: str, gender: str,
                dress_color: str, dress_season: str,
                budget: float) -> tuple:
    """
    Returns (eligible: bool, base_score: float 0-1).
    Hard blocks checked in order:
      1. Category excluded for this occasion
      2. Category excluded for this gender
      3. Accessory gender incompatible
      4. Accessory usage incompatible with occasion
    """
    cat     = acc.get("category", "")
    acc_gen = acc.get("gender", "Unisex")
    acc_use = acc.get("mapped_usage", acc.get("usage", "Casual"))
    acc_col = acc.get("mapped_color", acc.get("color", acc.get("baseColour", "")))
    acc_sea = acc.get("season", "")

    # Hard block 1: occasion exclusion
    if cat in OCCASION_EXCLUDED_CATS.get(occasion, []):
        return False, 0.0

    # Hard block 2: gender category exclusion
    if cat in GENDER_EXCLUDED_CATS.get(gender, []):
        return False, 0.0

    # Hard block 3: accessory gender incompatibility
    if acc_gen not in GENDER_ACC_COMPAT.get(gender, ["Men","Women","Unisex"]):
        return False, 0.0

    # Hard block 4: usage incompatibility
    if acc_use not in OCCASION_USAGE_COMPAT.get(occasion, ["Casual"]):
        return False, 0.0

    # Soft score
    score = 0.0

    # Color match (0.45) — highest weight factor
    compatible_colors = COLOR_COMPAT.get(dress_color, [])
    universal_neutrals = ["Gold", "Silver", "Metallic", "Black", "White"]
    # Normalize for comparison
    acc_col_lower   = (acc_col or "").strip().lower()
    dress_col_lower = (dress_color or "").strip().lower()
    compat_lower    = [x.lower() for x in compatible_colors]
    if acc_col_lower == dress_col_lower:
        score += 0.45                    # monochromatic — same color ✅
    elif acc_col_lower in compat_lower:
        score += 0.45                    # compatible color ✅
    elif acc_col_lower in [x.lower() for x in universal_neutrals]:
        score += 0.30                    # universal neutral ✅
    else:
        score -= 0.10                    # color mismatch penalty

    # Preferred category for occasion (0.25)
    if cat in OCCASION_PREFERRED_CATS.get(occasion, []):
        score += 0.25
    else:
        score += 0.05

    # Preferred category for gender (0.15)
    if cat in GENDER_PREFERRED_CATS.get(gender, []):
        score += 0.15

    # Season match (0.15)
    if acc_sea in SEASON_COMPAT.get(dress_season, [dress_season]):
        score += 0.15

    return True, min(score, 1.0)


def full_compat_score(acc: dict, dress_attrs: dict,
                      occasion: str, gender: str,
                      religion: str, budget: float) -> float:
    """Full 0-1 score including religion, neckline, sleeve bonuses."""
    eligible, score = is_eligible(
        acc, occasion, gender,
        dress_attrs.get("color", ""),
        dress_attrs.get("season", ""),
        budget
    )
    if not eligible:
        return -1.0

    cat = acc.get("category", "")

    # Religion bonus (+0.10)
    if cat in RELIGION_PREFS.get(religion, {}).get("preferred_categories", []):
        score = min(score + 0.10, 1.0)

    # Neckline guide (+0.08 / -0.15)
    neck_guide = NECKLINE_ACC_GUIDE.get(dress_attrs.get("neckline", ""), {})
    if cat in neck_guide.get("best", []):
        score = min(score + 0.08, 1.0)
    if cat in neck_guide.get("avoid", []):
        score = max(score - 0.15, 0.0)

    # Sleeve guide (+0.06)
    sleeve_guide = SLEEVE_ACC_GUIDE.get(dress_attrs.get("sleeve_length", ""), {})
    if cat in sleeve_guide.get("best", []):
        score = min(score + 0.06, 1.0)

    return round(score, 4)


# ─────────────────────────────────────────────────────────────
# DQN RECOMMENDATION ENGINE
# ─────────────────────────────────────────────────────────────
def run_dqn_recommend(fused_vec: np.ndarray, wardrobe_items: list,
                      dress_attrs: dict, occasion: str, gender: str,
                      religion: str, budget: float, top_k: int = 3) -> list:
    """
    Runs Model 4 DQN over the pre-filtered wardrobe.
    Returns best 1 item per eligible category (no hard top_k limit).
    Only categories that have matching items in the wardrobe are returned.
    """
    if model4 is None or wardrobe_tensor is None:
        return _fallback_recommend(wardrobe_items, dress_attrs, occasion, gender, religion, budget)

    dress_color  = dress_attrs.get("color", "")
    dress_season = dress_attrs.get("season", "")

    # Pre-filter: keep eligible items + compute base scores, grouped by category
    cat_eligible = {}  # category -> list of (idx, acc, base_score)
    for i, acc in enumerate(wardrobe_items):
        if not acc.get("available", True) and not acc.get("isAvailable", True):
            continue
        ok, base = is_eligible(acc, occasion, gender, dress_color, dress_season, budget)
        if ok:
            cat = acc.get("category", "")
            cat_eligible.setdefault(cat, []).append((i, acc, base))

    if not cat_eligible:
        return []

    # Get DQN Q-values for all wardrobe items
    sel_history = np.zeros(3 * ACC_DIM, dtype=np.float32)
    step_norm   = np.array([0.0], dtype=np.float32)
    state       = np.concatenate([fused_vec, sel_history, step_norm])
    state_t     = torch.tensor(state, dtype=torch.float32).unsqueeze(0).to(device)

    with torch.no_grad():
        q_vals = model4(state_t, wardrobe_tensor)[0].cpu().numpy()

    # For each eligible category, pick top 3 scoring items
    results = []
    for cat, candidates in cat_eligible.items():
        # Score all candidates in this category
        scored = sorted(
            candidates,
            key=lambda x: (float(q_vals[x[0]]) if x[0] < len(q_vals) else 0) + x[2] * 2.0,
            reverse=True
        )[:3]  # top 3 per category

        cat_items = []
        for rank, (idx, acc, base) in enumerate(scored):
            compat = full_compat_score(acc, dress_attrs, occasion, gender, religion, budget)
            cat_items.append({
                "wardrobe_index":      idx,
                "item_id":             str(acc.get("id", idx)),
                "name":                acc.get("productDisplayName", acc.get("name", f"Item #{idx}")),
                "category":            cat,
                "color":               acc.get("mapped_color", acc.get("color", acc.get("baseColour", ""))),
                "gender":              acc.get("gender", ""),
                "usage":               acc.get("mapped_usage", acc.get("usage", "")),
                "season":              acc.get("season", ""),
                "image":               acc.get("image", acc.get("image_path", "")),
                "image_path":          acc.get("image", acc.get("image_path", "")),
                "available":           bool(acc.get("available", acc.get("isAvailable", True))),
                "usage_count":         int(acc.get("usage_count", 0)),
                "last_used_date":      acc.get("last_used_date"),
                "q_value":             round(float(q_vals[idx]) if idx < len(q_vals) else 0, 4),
                "compatibility_score": compat,
                "rank_in_category":    rank + 1,
            })
        results.append({"category": cat, "items": cat_items})

    # Sort category groups by best item's score
    results.sort(key=lambda x: x["items"][0]["compatibility_score"] if x["items"] else 0, reverse=True)
    return results


def _fallback_recommend(wardrobe_items, dress_attrs, occasion, gender, religion, budget):
    """Fallback when Model 4 not loaded: rule-based best-per-category."""
    dress_color  = dress_attrs.get("color", "")
    dress_season = dress_attrs.get("season", "")
    cat_candidates = {}
    for i, acc in enumerate(wardrobe_items):
        if not acc.get("available", True) and not acc.get("isAvailable", True):
            continue
        ok, base = is_eligible(acc, occasion, gender, dress_color, dress_season, budget)
        if not ok:
            continue
        cat = acc.get("category", "")
        compat = full_compat_score(acc, dress_attrs, occasion, gender, religion, budget)
        cat_candidates.setdefault(cat, []).append((acc, compat, i))

    results = []
    for cat, candidates in cat_candidates.items():
        candidates.sort(key=lambda x: x[1], reverse=True)
        top3 = candidates[:3]
        cat_items = []
        for rank, (acc, compat, idx) in enumerate(top3):
            cat_items.append({
                "wardrobe_index":      idx,
                "item_id":             str(acc.get("id", idx)),
                "name":                acc.get("name", f"Item #{idx}"),
                "category":            cat,
                "color":               acc.get("mapped_color", acc.get("color", "")),
                "gender":              acc.get("gender", ""),
                "usage":               acc.get("mapped_usage", acc.get("usage", "")),
                "season":              acc.get("season", ""),
                "image":               acc.get("image", acc.get("image_path", "")),
                "image_path":          acc.get("image", acc.get("image_path", "")),
                "available":           bool(acc.get("isAvailable", True)),
                "usage_count":         int(acc.get("usage_count", 0)),
                "last_used_date":      acc.get("last_used_date"),
                "q_value":             0.0,
                "compatibility_score": compat,
                "rank_in_category":    rank + 1,
            })
        results.append({"category": cat, "items": cat_items})

    results.sort(key=lambda x: x["items"][0]["compatibility_score"] if x["items"] else 0, reverse=True)
    return results


# ─────────────────────────────────────────────────────────────
# EXPLAINABILITY
# ─────────────────────────────────────────────────────────────
def explain_recommendation(acc: dict, dress_attrs: dict,
                            occasion: str, gender: str,
                            religion: str, budget: float) -> dict:
    reasons  = []
    warnings = []

    cat       = acc.get("category", "")
    acc_color = acc.get("mapped_color", acc.get("color", acc.get("baseColour", "")))
    d_color   = dress_attrs.get("color", "")
    d_season  = dress_attrs.get("season", "")
    neckline  = dress_attrs.get("neckline", "")
    sleeve    = dress_attrs.get("sleeve_length", "")
    usage_cnt = int(acc.get("usage_count", 0))

    if acc_color in COLOR_COMPAT.get(d_color, []):
        reasons.append(f"{acc_color} perfectly complements your {d_color} outfit")
    elif acc_color in ["Gold", "Silver", "Metallic"]:
        reasons.append(f"{acc_color} is a universal metallic that pairs with almost any outfit")

    if cat in OCCASION_PREFERRED_CATS.get(occasion, []):
        reasons.append(f"Ideal category for a {occasion} occasion")

    neck_guide = NECKLINE_ACC_GUIDE.get(neckline, {})
    if cat in neck_guide.get("best", []):
        reasons.append(f"Recommended with a {neckline} neckline")
    if cat in neck_guide.get("avoid", []):
        warnings.append(f"Usually avoided with {neckline} — consider carefully")

    sleeve_guide = SLEEVE_ACC_GUIDE.get(sleeve, {})
    if cat in sleeve_guide.get("best", []):
        reasons.append(f"Great choice for {sleeve} attire")

    if acc.get("season") in SEASON_COMPAT.get(d_season, []):
        reasons.append(f"Season-appropriate for {d_season}")

    if cat in RELIGION_PREFS.get(religion, {}).get("preferred_categories", []):
        reasons.append(f"A traditional favourite for {religion} occasions")

    if usage_cnt == 0:
        reasons.append("Brand new — you haven't worn this yet!")
    elif usage_cnt <= 2:
        reasons.append(f"Only worn {usage_cnt} time(s) — good for rotation")

    if not reasons:
        reasons.append(f"Good match for your {occasion} look")

    return {
        "reasons":  reasons,
        "warnings": warnings,
        "summary":  " • ".join(reasons[:2]),
    }


def generate_chat_response(user_msg: str, context: dict) -> str:
    msg  = user_msg.lower().strip()
    occ  = context.get("occasion", "")
    gen  = context.get("gender",   "")
    rel  = context.get("religion", "None")
    bud  = float(context.get("budget", 5000))
    dress= context.get("dress_attributes", {})
    item = context.get("selected_item", {})

    # Why recommended?
    if any(w in msg for w in ["why", "reason", "explain", "how", "kelak", "kiyanna"]):
        expl = explain_recommendation(item, dress, occ, gen, rel, bud)
        resp = f"**Why {item.get('name', 'this item')}?**\n\n"
        for r in expl["reasons"]:
            resp += f"• {r}\n"
        if expl["warnings"]:
            resp += f"\n⚠️ Note: {expl['warnings'][0]}"
        return resp

    # Market alternative
    if any(w in msg for w in ["alternative", "another", "market", "buy", "where",
                               "shop", "daraz", "unavailable", "not available", "cannot find"]):
        cat    = item.get("category", "Accessories")
        color  = item.get("color", "")
        q      = f"{cat} {color} {occ}".replace("&", "and")
        url    = f"https://www.daraz.lk/catalog/?q={q.replace(' ','+')}&price=0-{int(bud)}"
        compat = ", ".join(COLOR_COMPAT.get(dress.get("color",""), [])[:3])
        return (f"Looking for a **{cat}** within Rs. {bud:,.0f}?\n\n"
                f"👉 Search on Daraz: {url}\n\n"
                f"**Color tip:** Look for {compat} options to match your {dress.get('color','')} dress.")

    # Occasion advice
    if any(w in msg for w in ["occasion", "what should", "suitable", "appropriate",
                               "recommend for", "suggest"]):
        pref = OCCASION_PREFERRED_CATS.get(occ, [])
        excl = OCCASION_EXCLUDED_CATS.get(occ, [])
        return (f"**For {occ}:**\n\n"
                f"✅ Best categories: {', '.join(pref)}\n"
                + (f"❌ Avoid: {', '.join(excl)}\n" if excl else "")
                + f"\n**Color tip:** With your {dress.get('color','')} dress, look for "
                + ", ".join(COLOR_COMPAT.get(dress.get("color",""), ["Gold","Silver"])[:4]))

    # Style tips
    if any(w in msg for w in ["style", "tip", "advice", "neckline", "sleeve"]):
        neck    = dress.get("neckline", "")
        sleeve  = dress.get("sleeve_length", "")
        ng      = NECKLINE_ACC_GUIDE.get(neck, {})
        sg      = SLEEVE_ACC_GUIDE.get(sleeve, {})
        resp    = "**Style tips for your dress:**\n\n"
        if neck:
            resp += f"👗 Neckline ({neck}): Best with {', '.join(ng.get('best',[])[:3])}"
            if ng.get("avoid"):
                resp += f" | Avoid: {', '.join(ng['avoid'])}"
            resp += "\n"
        if sleeve:
            resp += f"💪 Sleeves ({sleeve}): Best with {', '.join(sg.get('best',[])[:3])}\n"
        resp += f"\n🎨 Color ({dress.get('color','')}): Pair with "
        resp += ", ".join(COLOR_COMPAT.get(dress.get("color",""), [])[:4])
        return resp

    # Budget
    if any(w in msg for w in ["budget", "price", "cost", "rs", "expensive", "afford"]):
        return (f"Your budget is **Rs. {bud:,.0f}**.\n\n"
                f"Tip: Gold and Silver accessories offer great value for {occ} occasions.\n"
                f"Check Daraz for options within your budget.")

    # Default
    pref = OCCASION_PREFERRED_CATS.get(occ, [])
    return (f"For your **{occ}** look, focus on: {', '.join(pref[:3])}.\n\n"
            f"Ask me why any item was recommended, style tips, or where to buy alternatives!")


# ─────────────────────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────────────────────


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "running",
        "device": str(device),
        "models": {
            "model1_accessory_classifier": model1 is not None,
            "model2_dress_extractor":      model2 is not None,
            "model3_fusion_mlp":           model3 is not None,
            "model4_dqn_recommender":      model4 is not None,
        },
        "wardrobe_size": len(wardrobe_metadata) if wardrobe_metadata else 0,
    })


@app.route("/api/mappings", methods=["GET"])
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


@app.route("/api/classify-accessory", methods=["POST"])
def classify_accessory():
    if "image" not in request.files:
        return jsonify({"error": "No image provided"}), 400
    if model1 is None:
        return jsonify({"error": "Model 1 not loaded"}), 503
    try:
        t = preprocess_image(request.files["image"].read())
        with torch.no_grad():
            out = model1(t)

        def top5(logits, classes):
            probs = torch.softmax(logits, dim=1)[0].cpu().numpy()
            idx   = int(np.argmax(probs))
            tops  = sorted(zip(classes, probs.tolist()), key=lambda x:-x[1])[:5]
            return classes[idx], float(probs[idx]), [{"label":l,"score":round(s,4)} for l,s in tops]

        cat,  cc, ct = top5(out["category"], ACC_CATEGORIES)
        col,  lc, lt = top5(out["color"],    ACC_COLORS)
        gen,  gc, gt = top5(out["gender"],   ACC_GENDERS)
        sea,  sc, st = top5(out["season"],   ACC_SEASONS)
        use,  uc, ut = top5(out["usage"],    ACC_USAGES)

        return jsonify({
            "category":cc and cat, "color":col, "gender":gen, "season":sea, "usage":use,
            "confidence":round(cc,4),
            "top_categories":ct, "top_colors":lt,
            "top_genders":gt,   "top_seasons":st, "top_usages":ut,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/extract-dress-attributes", methods=["POST"])
def extract_dress_attributes():
    if "image" not in request.files:
        return jsonify({"error": "No image provided"}), 400
    if model2 is None:
        return jsonify({"error": "Model 2 not loaded"}), 503
    try:
        t = preprocess_image(request.files["image"].read())
        with torch.no_grad():
            out = model2(t)

        attrs, confs, top5s = {}, {}, {}
        for attr, info in DRESS_ENC.items():
            cls   = info["classes"]
            probs = torch.softmax(out[attr], dim=1)[0].cpu().numpy()
            idx   = int(np.argmax(probs))
            attrs[attr] = cls[idx]
            confs[attr] = round(float(probs[idx]), 4)
            top5s[attr] = [{"label":c,"score":round(float(p),4)}
                           for c,p in sorted(zip(cls, probs.tolist()), key=lambda x:-x[1])[:5]]

        return jsonify({
            "color":         attrs["color"],
            "neckline":      attrs["neckline"],
            "dress_length":  attrs["dress_length"],
            "fabric":        attrs["fabric"],
            "pattern":       attrs["pattern"],
            "sleeve_length": attrs["sleeve_length"],
            "usage":         attrs["usage"],
            "season":        attrs["season"],
            "gender":        attrs["gender"],  # display only
            "attribute_confidences": confs,
            "top_predictions":       top5s,
            "dress_feature_vector":  encode_dress_to_79(attrs),  # 79-dim for Model 3
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/fuse-features", methods=["POST"])
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

    if model3 is None:
        return jsonify({"error": "Model 3 not loaded"}), 503
    try:
        meta = encode_metadata_20(occasion, religion, gender, budget)
        dt   = torch.tensor(dress_vector, dtype=torch.float32).unsqueeze(0).to(device)
        mt   = torch.tensor(meta,         dtype=torch.float32).unsqueeze(0).to(device)
        with torch.no_grad():
            m3 = model3(dt, mt)

        return jsonify({
            "fused_vector":          m3["fused_vector"][0].cpu().numpy().tolist(),
            "dqn_fused_vector":      build_dqn_fused_vector(dress_attrs, occasion, gender, budget).tolist(),
            "compatibility_score":   round(float(m3["compatibility_score"].item()), 4),
            "preferred_categories":  OCCASION_PREFERRED_CATS.get(occasion, []),
            "excluded_categories":   OCCASION_EXCLUDED_CATS.get(occasion, []),
            "color_compatible_with": COLOR_COMPAT.get(dress_attrs.get("color",""), []),
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/recommend", methods=["POST"])
def recommend():
    data = request.get_json()
    if not data:
        return jsonify({"error": "JSON required"}), 400

    dress_attrs = data.get("dress_attributes", {})
    dqn_fused   = data.get("dqn_fused_vector") or \
                  build_dqn_fused_vector(dress_attrs,
                                         data.get("occasion","Casual"),
                                         data.get("gender","Unisex"),
                                         float(data.get("budget",5000))).tolist()
    occasion = data.get("occasion", "Casual")
    religion = data.get("religion", "None")
    gender   = data.get("gender",   "Unisex")
    budget   = float(data.get("budget", 5000))
    wardrobe = data.get("wardrobe", [])

    items = wardrobe if wardrobe else (wardrobe_metadata or [])
    if model4 is None:
        return jsonify({"error": "Model 4 not loaded"}), 503

    try:
        fused_np = np.array(dqn_fused, dtype=np.float32)
        recs     = run_dqn_recommend(fused_np, items, dress_attrs,
                                     occasion, gender, religion, budget, top_k=3)
        for rec in recs:
            idx = rec["wardrobe_index"]
            acc = items[idx] if idx < len(items) else {}
            rec["explanation"] = explain_recommendation(acc, dress_attrs, occasion, gender, religion, budget)

        by_cat = {}
        for r in recs:
            by_cat.setdefault(r["category"], []).append(r)

        return jsonify({
            "recommendations":      recs,
            "by_category":          by_cat,
            "wardrobe_checked":     len(items),
            "occasion":             occasion,
            "gender":               gender,
            "religion":             religion,
            "budget":               budget,
            "preferred_categories": OCCASION_PREFERRED_CATS.get(occasion, []),
            "excluded_categories":  OCCASION_EXCLUDED_CATS.get(occasion, []),
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/full-pipeline", methods=["POST"])
def full_pipeline():
    if "image" not in request.files:
        return jsonify({"error": "No dress image"}), 400

    img_bytes = request.files["image"].read()
    occasion  = request.form.get("occasion",  "Casual")
    religion  = request.form.get("religion",  "None")
    gender    = request.form.get("gender",    "Unisex")
    budget      = float(request.form.get("budget", 5000))
    size_filter = request.form.get("size", "").strip()
    wardrobe    = json.loads(request.form.get("wardrobe", "[]"))
    # Filter by size if user specified (allow "One Size"/"Free Size" always)
    if size_filter:
        wardrobe = [a for a in wardrobe if not a.get("size") or
                    a.get("size","").strip().lower() == size_filter.lower() or
                    a.get("size","").strip().lower() in ["one size","free size"]]

    try:
        # Step 1: Model 2
        if model2 is not None:
            t = preprocess_image(img_bytes)
            with torch.no_grad():
                m2 = model2(t)
            dress_attrs = {attr: info["classes"][int(np.argmax(
                torch.softmax(m2[attr], dim=1)[0].cpu().numpy()))]
                for attr, info in DRESS_ENC.items()}
        else:
            dress_attrs = {"color":"Black","neckline":"V-Neck","dress_length":"Midi",
                           "fabric":"Cotton","pattern":"Solid","sleeve_length":"Sleeveless",
                           "usage":"Formal","season":"Summer","gender":"Women"}

        dress_vector = encode_dress_to_79(dress_attrs)

        # Step 2: Model 3
        compat_score = 0.5
        if model3 is not None:
            meta = encode_metadata_20(occasion, religion, gender, budget)
            dt   = torch.tensor(dress_vector, dtype=torch.float32).unsqueeze(0).to(device)
            mt   = torch.tensor(meta,         dtype=torch.float32).unsqueeze(0).to(device)
            with torch.no_grad():
                compat_score = float(model3(dt, mt)["compatibility_score"].item())

        # Step 3: DQN
        dqn_fused = build_dqn_fused_vector(dress_attrs, occasion, gender, budget)
        items     = wardrobe if wardrobe else (wardrobe_metadata or [])
        recs      = run_dqn_recommend(dqn_fused, items, dress_attrs,
                                      occasion, gender, religion, budget, top_k=3)
        for rec in recs:
            idx = rec["wardrobe_index"]
            acc = items[idx] if idx < len(items) else {}
            rec["explanation"] = explain_recommendation(acc, dress_attrs, occasion, gender, religion, budget)

        return jsonify({
            "dress_attributes":      dress_attrs,
            "compatibility_score":   round(compat_score, 4),
            "recommendations":       recs,
            "preferred_categories":  OCCASION_PREFERRED_CATS.get(occasion, []),
            "excluded_categories":   OCCASION_EXCLUDED_CATS.get(occasion, []),
            "color_compatible_with": COLOR_COMPAT.get(dress_attrs.get("color",""), []),
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/chat", methods=["POST"])
def chat():
    data    = request.get_json()
    msg     = data.get("message", "")
    context = data.get("context", {})
    return jsonify({"response": generate_chat_response(msg, context)})


@app.route("/api/explain", methods=["POST"])
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
        "neckline_guide":        NECKLINE_ACC_GUIDE.get(dress_attrs.get("neckline",""), {}),
        "sleeve_guide":          SLEEVE_ACC_GUIDE.get(dress_attrs.get("sleeve_length",""), {}),
        "color_compatible_with": COLOR_COMPAT.get(dress_attrs.get("color",""), []),
    })


# ─────────────────────────────────────────────────────────────
# WARDROBE CRUD ENDPOINTS
# ─────────────────────────────────────────────────────────────

@app.route("/api/wardrobe", methods=["GET"])
def get_wardrobe():
    """Return all wardrobe items. Optional ?category=&gender=&search= filters."""
    category = request.args.get("category", "")
    gender   = request.args.get("gender",   "")
    search   = request.args.get("search",   "").lower()
    fav_only = request.args.get("favourites", "false").lower() == "true"

    sql    = "SELECT * FROM wardrobe WHERE 1=1"
    params = []
    if category:
        sql += " AND category = ?"; params.append(category)
    if gender:
        sql += " AND gender = ?";   params.append(gender)
    if search:
        sql += " AND (LOWER(name) LIKE ? OR LOWER(category) LIKE ?)";
        params += [f"%{search}%", f"%{search}%"]
    if fav_only:
        sql += " AND is_favourite = 1"
    sql += " ORDER BY added_date DESC"

    with get_db() as conn:
        rows = conn.execute(sql, params).fetchall()
    return jsonify([row_to_dict(r) for r in rows])


@app.route("/api/wardrobe", methods=["POST"])
def add_wardrobe_item():
    """Add a new accessory to the wardrobe."""
    data = request.get_json()
    if not data or not data.get("name"):
        return jsonify({"error": "name is required"}), 400

    import uuid
    item_id = data.get("id") or str(uuid.uuid4())

    with get_db() as conn:
        conn.execute("""
            INSERT OR REPLACE INTO wardrobe
              (id, name, category, color, gender, usage, season,
               brand, size, price, image, is_favourite, is_available,
               usage_count, added_date)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (
            item_id,
            data.get("name", ""),
            data.get("category", ""),
            data.get("color", ""),
            data.get("gender", ""),
            data.get("usage", ""),
            data.get("season", ""),
            data.get("brand", ""),
            data.get("size", ""),
            float(data.get("price", 0)),
            data.get("image", ""),
            1 if data.get("isFavourite") else 0,
            1 if data.get("isAvailable", True) else 0,
            int(data.get("usage_count", 0)),
            data.get("addedDate") or "now",
        ))
        conn.execute(
            "INSERT INTO activity_log (action, description, item_id) VALUES (?,?,?)",
            ("ADD", f"Added '{data.get('name')}' to wardrobe", item_id)
        )
        row = conn.execute("SELECT * FROM wardrobe WHERE id=?", (item_id,)).fetchone()
    return jsonify(row_to_dict(row)), 201


@app.route("/api/wardrobe/<item_id>", methods=["GET"])
def get_wardrobe_item(item_id):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM wardrobe WHERE id=?", (item_id,)).fetchone()
    if row is None:
        return jsonify({"error": "Item not found"}), 404
    return jsonify(row_to_dict(row))


@app.route("/api/wardrobe/<item_id>", methods=["PUT"])
def update_wardrobe_item(item_id):
    """Update any fields of a wardrobe item."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data"}), 400

    with get_db() as conn:
        existing = conn.execute("SELECT * FROM wardrobe WHERE id=?", (item_id,)).fetchone()
        if existing is None:
            return jsonify({"error": "Item not found"}), 404

        fields = []
        params = []
        allowed = ["name","category","color","gender","usage","season",
                   "brand","size","price","image","usage_count"]
        for f in allowed:
            if f in data:
                fields.append(f"{f}=?")
                params.append(data[f])
        if "isFavourite" in data:
            fields.append("is_favourite=?")
            params.append(1 if data["isFavourite"] else 0)
        if "isAvailable" in data:
            fields.append("is_available=?")
            params.append(1 if data["isAvailable"] else 0)

        if fields:
            fields.append("updated_at=datetime('now')")
            params.append(item_id)
            conn.execute(f"UPDATE wardrobe SET {', '.join(fields)} WHERE id=?", params)
            conn.execute(
                "INSERT INTO activity_log (action, description, item_id) VALUES (?,?,?)",
                ("UPDATE", f"Updated '{existing['name']}'", item_id)
            )
        row = conn.execute("SELECT * FROM wardrobe WHERE id=?", (item_id,)).fetchone()
    return jsonify(row_to_dict(row))


@app.route("/api/wardrobe/<item_id>", methods=["DELETE"])
def delete_wardrobe_item(item_id):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM wardrobe WHERE id=?", (item_id,)).fetchone()
        if row is None:
            return jsonify({"error": "Item not found"}), 404
        conn.execute("DELETE FROM wardrobe WHERE id=?", (item_id,))
        conn.execute(
            "INSERT INTO activity_log (action, description, item_id) VALUES (?,?,?)",
            ("DELETE", f"Removed '{row['name']}' from wardrobe", item_id)
        )
    return jsonify({"deleted": item_id})


@app.route("/api/wardrobe/<item_id>/favourite", methods=["PATCH"])
def toggle_favourite(item_id):
    """Toggle favourite status."""
    with get_db() as conn:
        row = conn.execute("SELECT * FROM wardrobe WHERE id=?", (item_id,)).fetchone()
        if row is None:
            return jsonify({"error": "Item not found"}), 404
        new_val = 0 if row["is_favourite"] else 1
        conn.execute("UPDATE wardrobe SET is_favourite=?, updated_at=datetime('now') WHERE id=?",
                     (new_val, item_id))
        conn.execute(
            "INSERT INTO activity_log (action, description, item_id) VALUES (?,?,?)",
            ("FAVOURITE" if new_val else "UNFAVOURITE",
             f"{'Saved' if new_val else 'Removed'} '{row['name']}' {'to' if new_val else 'from'} favourites",
             item_id)
        )
        updated = conn.execute("SELECT * FROM wardrobe WHERE id=?", (item_id,)).fetchone()
    return jsonify(row_to_dict(updated))


@app.route("/api/wardrobe/<item_id>/availability", methods=["PATCH"])
def toggle_availability(item_id):
    """Toggle available / unavailable."""
    data = request.get_json() or {}
    with get_db() as conn:
        row = conn.execute("SELECT * FROM wardrobe WHERE id=?", (item_id,)).fetchone()
        if row is None:
            return jsonify({"error": "Item not found"}), 404
        # Accept explicit value or toggle
        if "isAvailable" in data:
            new_val = 1 if data["isAvailable"] else 0
        else:
            new_val = 0 if row["is_available"] else 1
        conn.execute("UPDATE wardrobe SET is_available=?, updated_at=datetime('now') WHERE id=?",
                     (new_val, item_id))
        conn.execute(
            "INSERT INTO activity_log (action, description, item_id) VALUES (?,?,?)",
            ("AVAILABLE" if new_val else "UNAVAILABLE",
             f"Marked '{row['name']}' as {'available' if new_val else 'unavailable'}", item_id)
        )
        updated = conn.execute("SELECT * FROM wardrobe WHERE id=?", (item_id,)).fetchone()
    return jsonify(row_to_dict(updated))


@app.route("/api/wardrobe/<item_id>/use", methods=["PATCH"])
def increment_usage(item_id):
    """Increment usage count and record last_used_date."""
    with get_db() as conn:
        conn.execute("""
            UPDATE wardrobe
            SET usage_count    = usage_count + 1,
                last_used_date = date('now'),
                updated_at     = datetime('now')
            WHERE id = ?
        """, (item_id,))
        conn.execute(
            "INSERT INTO activity_log (action, description, item_id) VALUES (?,?,?)",
            ("USE", f"Accessory used", item_id)
        )
        row = conn.execute("SELECT * FROM wardrobe WHERE id=?", (item_id,)).fetchone()
    if row is None:
        return jsonify({"error": "Item not found"}), 404
    return jsonify(row_to_dict(row))


@app.route("/api/analytics", methods=["GET"])
def get_analytics():
    """Dashboard analytics derived entirely from SQLite data."""
    with get_db() as conn:
        total      = conn.execute("SELECT COUNT(*) FROM wardrobe").fetchone()[0]
        available  = conn.execute("SELECT COUNT(*) FROM wardrobe WHERE is_available=1").fetchone()[0]
        favourites = conn.execute("SELECT COUNT(*) FROM wardrobe WHERE is_favourite=1").fetchone()[0]
        categories = conn.execute("SELECT COUNT(DISTINCT category) FROM wardrobe").fetchone()[0]

        cat_dist   = conn.execute(
            "SELECT category, COUNT(*) as cnt FROM wardrobe GROUP BY category ORDER BY cnt DESC"
        ).fetchall()
        color_dist = conn.execute(
            "SELECT color, COUNT(*) as cnt FROM wardrobe GROUP BY color ORDER BY cnt DESC LIMIT 10"
        ).fetchall()
        usage_dist = conn.execute(
            "SELECT usage, COUNT(*) as cnt FROM wardrobe GROUP BY usage ORDER BY cnt DESC"
        ).fetchall()
        season_dist= conn.execute(
            "SELECT season, COUNT(*) as cnt FROM wardrobe GROUP BY season ORDER BY cnt DESC"
        ).fetchall()
        most_used  = conn.execute(
            "SELECT id, name, category, usage_count FROM wardrobe ORDER BY usage_count DESC LIMIT 5"
        ).fetchall()
        least_used = conn.execute(
            "SELECT id, name, category, usage_count FROM wardrobe WHERE usage_count >= 0 ORDER BY usage_count ASC LIMIT 5"
        ).fetchall()
        recent_activity = conn.execute(
            "SELECT action, description, created_at FROM activity_log ORDER BY id DESC LIMIT 10"
        ).fetchall()

    return jsonify({
        "summary": {
            "total": total, "available": available,
            "unavailable": total - available, "favourites": favourites, "categories": categories,
        },
        "category_distribution": [dict(r) for r in cat_dist],
        "color_distribution":    [dict(r) for r in color_dist],
        "usage_distribution":    [dict(r) for r in usage_dist],
        "season_distribution":   [dict(r) for r in season_dist],
        "most_used":             [dict(r) for r in most_used],
        "least_used":            [dict(r) for r in least_used],
        "recent_activity":       [dict(r) for r in recent_activity],
    })


@app.route("/api/activity", methods=["GET"])
def get_activity():
    limit = int(request.args.get("limit", 20))
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM activity_log ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()
    return jsonify([dict(r) for r in rows])


# ─────────────────────────────────────────────────────────────
# STARTUP
# ─────────────────────────────────────────────────────────────
with app.app_context():
    init_db()
    load_models()



# ─────────────────────────────────────────────────────────────
# SAVED LOOKS ENDPOINTS
# ─────────────────────────────────────────────────────────────

@app.route("/api/looks", methods=["GET"])
def get_looks():
    """Get all saved looks."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM saved_looks ORDER BY created_at DESC"
        ).fetchall()
    looks = []
    for row in rows:
        d = dict(row)
        try:
            d["accessory_ids"]  = json.loads(d.get("accessory_ids", "[]") or "[]")
            d["accessory_data"] = json.loads(d.get("accessory_data", "[]") or "[]")
        except Exception:
            d["accessory_ids"]  = []
            d["accessory_data"] = []
        looks.append(d)
    return jsonify(looks)


@app.route("/api/looks", methods=["POST"])
def save_look():
    """Save a completed outfit look."""
    import uuid
    data = request.get_json()
    if not data:
        return jsonify({"error": "JSON required"}), 400

    look_id          = str(uuid.uuid4())
    accessory_ids    = data.get("accessory_ids", [])
    accessory_data   = data.get("accessory_data", [])

    with get_db() as conn:
        conn.execute("""
            INSERT INTO saved_looks (id, name, occasion, gender, dress_image, accessory_ids, accessory_data)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            look_id,
            data.get("name", f"Look {look_id[:6]}"),
            data.get("occasion", ""),
            data.get("gender", ""),
            data.get("dress_image", ""),
            json.dumps(accessory_ids),
            json.dumps(accessory_data),
        ))
        # Increment usage on all selected accessories
        for acc_id in accessory_ids:
            conn.execute("""
                UPDATE wardrobe
                SET usage_count    = usage_count + 1,
                    last_used_date = date('now'),
                    updated_at     = datetime('now')
                WHERE id = ?
            """, (str(acc_id),))
        conn.execute(
            "INSERT INTO activity_log (action, description) VALUES (?,?)",
            ("SAVE_LOOK", f"Saved look: {data.get('name', look_id[:6])}")
        )
        row = conn.execute("SELECT * FROM saved_looks WHERE id=?", (look_id,)).fetchone()
    d = dict(row)
    try:
        d["accessory_ids"]  = json.loads(d.get("accessory_ids", "[]") or "[]")
        d["accessory_data"] = json.loads(d.get("accessory_data", "[]") or "[]")
    except Exception:
        pass
    return jsonify(d), 201


@app.route("/api/looks/<look_id>", methods=["DELETE"])
def delete_look(look_id):
    """Delete a saved look."""
    with get_db() as conn:
        conn.execute("DELETE FROM saved_looks WHERE id=?", (look_id,))
    return jsonify({"deleted": look_id})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=False)