import os, torch, json

MODELS_DIR = os.path.dirname(__file__)

def load_model(filename):
    return torch.load(os.path.join(MODELS_DIR, filename), map_location="cpu")

def load_json(filename):
    with open(os.path.join(MODELS_DIR, filename), "r") as f:
        return json.load(f)