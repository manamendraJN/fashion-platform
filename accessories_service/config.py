import os
import json
import torch

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
DB_PATH    = os.path.join(BASE_DIR, "aurastyle.db")
device     = torch.device("cuda" if torch.cuda.is_available() else "cpu")

with open(os.path.join(MODELS_DIR, "accessory_label_encoders.json")) as f:
    ACC_ENC = json.load(f)
with open(os.path.join(MODELS_DIR, "dress_label_encoders.json")) as f:
    DRESS_ENC = json.load(f)
with open(os.path.join(MODELS_DIR, "fusion_metadata_schema.json")) as f:
    FUSION_SCHEMA = json.load(f)

OCCASIONS  = FUSION_SCHEMA["occasions"]
RELIGIONS  = FUSION_SCHEMA["religions"]
GENDERS    = FUSION_SCHEMA["genders"]
BUDGET_MAX = float(FUSION_SCHEMA["budget_max"])

ACC_CATEGORIES = ACC_ENC["categories"]
ACC_COLORS     = ACC_ENC["colors"]
ACC_GENDERS    = ACC_ENC["genders"]
ACC_SEASONS    = ACC_ENC["seasons"]
ACC_USAGES     = ACC_ENC["usages"]

DRESS_ATTRS_ORDER = ["color", "neckline", "dress_length", "fabric",
                     "pattern", "sleeve_length", "usage", "season"]
ACC_DIM   = 49
STATE_DIM = 404

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

OCCASION_EXCLUDED_CATS = {
    "Formal":    ["Sunglasses & Eyewear", "Hats & Headwear"],
    "Office":    ["Sunglasses & Eyewear", "Hats & Headwear"],
    "Interview": ["Sunglasses & Eyewear", "Hats & Headwear", "Handbags & Clutches",
                  "Earrings", "Bracelets & Bangles", "Rings", "Necklaces & Chains"],
    "Wedding":   ["Sunglasses & Eyewear", "Hats & Headwear"],
    "Sports":    ["Belts", "Bracelets & Bangles", "Cufflinks", "Earrings",
                  "Handbags & Clutches", "Necklaces & Chains", "Rings", "Ties", "Watches"],
    "Beach":     ["Cufflinks", "Ties"],
}

GENDER_ACC_COMPAT = {
    "Men":    ["Men", "Unisex"],
    "Women":  ["Women", "Unisex"],
    "Unisex": ["Men", "Women", "Unisex"],
}

GENDER_PREFERRED_CATS = {
    "Men":    ["Watches", "Belts", "Ties", "Cufflinks",
               "Sunglasses & Eyewear", "Hats & Headwear", "Rings", "Bracelets & Bangles"],
    "Women":  ["Necklaces & Chains", "Earrings", "Bracelets & Bangles", "Rings",
               "Handbags & Clutches", "Sunglasses & Eyewear", "Watches", "Hats & Headwear"],
    "Unisex": ["Watches", "Belts", "Sunglasses & Eyewear", "Hats & Headwear", "Bracelets & Bangles"],
}

GENDER_EXCLUDED_CATS = {
    "Men":    ["Earrings", "Necklaces & Chains", "Handbags & Clutches"],
    "Women":  ["Cufflinks", "Ties"],
    "Unisex": [],
}

COLOR_COMPAT = {
    "Black":       ["Silver", "Gold", "Red", "White", "Pink", "Blue", "Purple",
                    "Multi-color", "Metallic", "Grey", "Copper", "Burgundy", "Teal"],
    "White":       ["Gold", "Silver", "Blue", "Red", "Black", "Teal", "Navy Blue",
                    "Multi-color", "Copper", "Pink", "Purple", "Beige", "Metallic"],
    "Blue":        ["Silver", "White", "Gold", "Teal", "Navy Blue", "Copper",
                    "Metallic", "Grey", "Black", "Brown"],
    "Navy Blue":   ["Silver", "Gold", "White", "Copper", "Red", "Metallic",
                    "Beige", "Off White", "Grey"],
    "Red":         ["Gold", "Black", "Silver", "White", "Copper", "Metallic",
                    "Navy Blue", "Burgundy"],
    "Green":       ["Gold", "Brown", "Copper", "Beige", "Tan", "Silver",
                    "White", "Metallic", "Black"],
    "Pink":        ["Silver", "Gold", "White", "Purple", "Rose Gold",
                    "Metallic", "Nude", "Beige", "Black"],
    "Purple":      ["Silver", "Gold", "White", "Pink", "Metallic",
                    "Black", "Grey", "Copper"],
    "Yellow":      ["Gold", "Brown", "Black", "White", "Copper",
                    "Tan", "Beige", "Silver"],
    "Orange":      ["Gold", "Brown", "Copper", "Black", "Tan",
                    "Beige", "White", "Silver"],
    "Brown":       ["Gold", "Copper", "Beige", "Tan", "White", "Coffee",
                    "Off White", "Cream", "Silver", "Black"],
    "Grey":        ["Silver", "Black", "Blue", "Metallic", "White",
                    "Navy Blue", "Purple", "Gold"],
    "Beige":       ["Gold", "Brown", "Copper", "White", "Tan", "Coffee",
                    "Silver", "Nude", "Off White", "Metallic"],
    "Maroon":      ["Gold", "Silver", "Copper", "Black", "Beige",
                    "Off White", "Metallic", "White"],
    "Burgundy":    ["Gold", "Silver", "Black", "White", "Copper",
                    "Beige", "Metallic", "Off White"],
    "Teal":        ["Silver", "Gold", "White", "Blue", "Copper",
                    "Metallic", "Navy Blue", "Black"],
    "Gold":        ["Black", "White", "Red", "Navy Blue", "Maroon", "Brown",
                    "Burgundy", "Purple", "Beige", "Coffee"],
    "Silver":      ["Black", "Blue", "White", "Navy Blue", "Purple", "Grey",
                    "Teal", "Maroon", "Burgundy"],
    "Copper":      ["Brown", "Green", "Beige", "Maroon", "Burgundy",
                    "Orange", "Yellow", "Coffee", "Tan"],
    "Metallic":    ["Black", "Grey", "White", "Navy Blue", "Blue",
                    "Burgundy", "Maroon", "Purple", "Red"],
    "Multi-color": ["Gold", "Silver", "Black", "White", "Metallic",
                    "Beige", "Brown", "Nude"],
    "Tan":         ["Brown", "Gold", "Beige", "Copper", "Coffee",
                    "Off White", "White", "Green"],
    "Off White":   ["Gold", "Silver", "Blue", "Brown", "Beige",
                    "Nude", "Copper", "Navy Blue", "Black"],
    "Nude":        ["Gold", "Brown", "Beige", "Copper", "Pink",
                    "Off White", "Silver", "Tan", "White"],
    "Coffee":      ["Gold", "Copper", "Brown", "Beige", "Tan",
                    "Off White", "Silver", "White"],
    "Navy":        ["Silver", "Gold", "White", "Copper", "Red", "Metallic",
                    "Beige", "Off White", "Grey"],
    "Cream":       ["Gold", "Brown", "Beige", "Copper", "Silver",
                    "Blue", "Black", "Pink"],
    "Olive":       ["Gold", "Brown", "Copper", "Tan", "Beige",
                    "Black", "White", "Silver"],
    "Mustard":     ["Brown", "Black", "Copper", "Gold", "Tan",
                    "Beige", "White", "Silver"],
    "Lavender":    ["Silver", "White", "Gold", "Purple", "Pink",
                    "Metallic", "Grey", "Black"],
    "Mint":        ["Silver", "White", "Gold", "Teal", "Blue",
                    "Metallic", "Black", "Copper"],
    "Coral":       ["Gold", "White", "Copper", "Beige", "Silver",
                    "Black", "Tan", "Brown"],
}

SEASON_COMPAT = {
    "Summer": ["Summer", "Spring", "All Seasons"],
    "Winter": ["Winter", "Fall", "All Seasons"],
    "Spring": ["Spring", "Summer", "All Seasons"],
    "Fall":   ["Fall", "Winter", "All Seasons"],
}

RELIGION_PREFS = {
    "Muslim":    {"preferred_categories": ["Watches", "Rings"]},
    "Hindu":     {"preferred_categories": ["Necklaces & Chains", "Earrings", "Bracelets & Bangles", "Rings"]},
    "Buddhist":  {"preferred_categories": ["Bracelets & Bangles", "Necklaces & Chains"]},
    "Christian": {"preferred_categories": ["Necklaces & Chains", "Earrings", "Rings"]},
}

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

SLEEVE_ACC_GUIDE = {
    "Sleeveless":   {"best": ["Bracelets & Bangles", "Watches"]},
    "Short Sleeve": {"best": ["Bracelets & Bangles", "Watches"]},
    "3/4 Sleeve":   {"best": ["Watches", "Rings"]},
    "Long Sleeve":  {"best": ["Watches", "Rings", "Cufflinks"]},
    "Bell Sleeve":  {"best": ["Rings", "Earrings"]},
    "Cap Sleeve":   {"best": ["Bracelets & Bangles", "Watches"]},
}
