import os
import io
import json

import numpy as np
import torch
import onnxruntime as ort
from torchvision import transforms
from PIL import Image

from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from routes.hair_route import hair_bp

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__)
CORS(app)

app.register_blueprint(hair_bp)

MODEL_DIR = os.path.join(BASE_DIR, "models")

# Load labels
with open(os.path.join(MODEL_DIR, "tone_labels.json")) as f:
    TONE_CLASSES = json.load(f)
with open(os.path.join(MODEL_DIR, "color_labels.json")) as f:
    COLOR_CLASSES = json.load(f)
with open(os.path.join(MODEL_DIR, "blackhead_labels.json")) as f:
    BLACK_CLASSES = json.load(f)

# Load nail & dental model info
with open(os.path.join(MODEL_DIR, "nail_model_info.json")) as f:
    _nail_info = json.load(f)
    NAIL_CLASSES = _nail_info["class_names"]

with open(os.path.join(MODEL_DIR, "dental_model_info.json")) as f:
    _dental_info = json.load(f)
    DENTAL_CLASSES = _dental_info["class_names"]

# ONNX sessions (CPU by default; swap provider for GPU if using onnxruntime-gpu)
tone_sess = ort.InferenceSession(os.path.join(MODEL_DIR, "tone_convnext_tiny.onnx"), providers=["CPUExecutionProvider"])
color_sess = ort.InferenceSession(os.path.join(MODEL_DIR, "color_convnext_tiny.onnx"), providers=["CPUExecutionProvider"])
black_sess = ort.InferenceSession(os.path.join(MODEL_DIR, "blackhead_convnext_tiny.onnx"), providers=["CPUExecutionProvider"])

# Preprocessing for ONNX models (same as training)
preprocess = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225]),
])

# Lazy-load Keras models (saved with Keras 3.10.0 — pin keras==3.10.0 in requirements)
_nail_model = None
_dental_model = None

def get_nail_model():
    global _nail_model
    if _nail_model is None:
        import tensorflow as tf
        _nail_model = tf.keras.models.load_model(os.path.join(MODEL_DIR, "nail_model.keras"))
    return _nail_model

def get_dental_model():
    global _dental_model
    if _dental_model is None:
        import tensorflow as tf
        _dental_model = tf.keras.models.load_model(os.path.join(MODEL_DIR, "dental_model.keras"))
    return _dental_model

def preprocess_keras(pil_img, target_size=224):
    """Preprocess image for MobileNetV2 Keras model."""
    from keras.applications.mobilenet_v2 import preprocess_input
    img = pil_img.convert("RGB").resize((target_size, target_size))
    arr = np.array(img, dtype=np.float32)
    arr = preprocess_input(arr)
    return np.expand_dims(arr, axis=0)

def run_keras_model(model, classes, pil_img):
    """Run a Keras classification model and return top class + probabilities."""
    x = preprocess_keras(pil_img)
    preds = model.predict(x, verbose=0)[0]
    top_idx = int(np.argmax(preds))
    return {
        "top_class": classes[top_idx],
        "probs": {c: float(f"{p:.4f}") for c, p in zip(classes, preds.tolist())}
    }

def run_model(sess, classes, pil_img, temp=1.5):
    img = pil_img.convert("RGB")
    tensor = preprocess(img).unsqueeze(0)
    ort_inputs = {sess.get_inputs()[0].name: tensor.numpy()}
    logits = sess.run(None, ort_inputs)[0]  # (1, C)
    probs = torch.softmax(torch.from_numpy(logits) / temp, dim=1)[0]
    top_idx = int(torch.argmax(probs))
    return {
        "top_class": classes[top_idx],
        "probs": {c: float(f"{p:.4f}") for c, p in zip(classes, probs.tolist())}
    }

@app.route("/predict", methods=["POST"])
def predict():
    if "file" not in request.files:
        return jsonify({"error": "no file"}), 400
    file = request.files["file"]
    img = Image.open(file.stream)
    tone = run_model(tone_sess, TONE_CLASSES, img)
    color = run_model(color_sess, COLOR_CLASSES, img)
    black = run_model(black_sess, BLACK_CLASSES, img)
    return jsonify({"tone": tone, "color": color, "blackhead": black})

@app.route("/predict-nail", methods=["POST"])
def predict_nail():
    if "file" not in request.files:
        return jsonify({"error": "no file"}), 400
    try:
        file = request.files["file"]
        img = Image.open(file.stream)
        model = get_nail_model()
        result = run_keras_model(model, NAIL_CLASSES, img)
        return jsonify(result)
    except Exception as e:
        import traceback
        traceback.print_exc()  # ← ADD THIS
        return jsonify({"error": str(e)}), 500

@app.route("/predict-dental", methods=["POST"])
def predict_dental():
    if "file" not in request.files:
        return jsonify({"error": "no file"}), 400
    try:
        file = request.files["file"]
        img = Image.open(file.stream)
        model = get_dental_model()
        result = run_keras_model(model, DENTAL_CLASSES, img)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/generate-hair", methods=["POST"])
def generate_hair():
    if not GEMINI_API_KEY:
        return jsonify({"error": "Gemini API key not configured"}), 500
    
    if "file" not in request.files:
        return jsonify({"error": "no file"}), 400
    
    try:
        file = request.files["file"]
        prompt = request.form.get("prompt", "Generate a professional hairstyle recommendation for this person")
        
        # Read image data
        img_bytes = file.read()
        img = Image.open(io.BytesIO(img_bytes))
        
        # Use Gemini Vision model
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content([prompt, img])
        
        return jsonify({
            "success": True,
            "recommendation": response.text
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/analyze-nail", methods=["POST"])
def analyze_nail():
    if not GEMINI_API_KEY:
        return jsonify({"error": "Gemini API key not configured"}), 500
    if "file" not in request.files:
        return jsonify({"error": "no file"}), 400
    try:
        file = request.files["file"]
        prompt = request.form.get(
            "prompt",
            "You are a professional manicurist. Analyze the nails in this photo for cleanliness, nail health, cuticle condition, discoloration, ridges, or damage. Provide a brief summary and 3-5 actionable care recommendations."
        )
        img_bytes = file.read()
        img = Image.open(io.BytesIO(img_bytes))
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content([prompt, img])
        return jsonify({"success": True, "recommendation": response.text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/analyze-dental", methods=["POST"])
def analyze_dental():
    if not GEMINI_API_KEY:
        return jsonify({"error": "Gemini API key not configured"}), 500
    if "file" not in request.files:
        return jsonify({"error": "no file"}), 400
    try:
        file = request.files["file"]
        prompt = request.form.get(
            "prompt",
            "You are a dental hygienist. Analyze the teeth and gums in this photo for plaque, tartar, staining, gum inflammation, alignment concerns, and enamel wear. Provide a concise summary and 3-5 specific hygiene recommendations."
        )
        img_bytes = file.read()
        img = Image.open(io.BytesIO(img_bytes))
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content([prompt, img])
        return jsonify({"success": True, "recommendation": response.text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
