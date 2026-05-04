from flask import Flask, request, jsonify
from flask_cors import CORS
import onnxruntime as ort
import torch
from torchvision import transforms
from PIL import Image
import json
import os
import google.generativeai as genai
import io

app = Flask(__name__)
CORS(app)

# Configure Gemini API
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "models")

# Load labels
with open(os.path.join(MODEL_DIR, "tone_labels.json")) as f:
    TONE_CLASSES = json.load(f)
with open(os.path.join(MODEL_DIR, "color_labels.json")) as f:
    COLOR_CLASSES = json.load(f)
with open(os.path.join(MODEL_DIR, "blackhead_labels.json")) as f:
    BLACK_CLASSES = json.load(f)

# ONNX sessions (CPU by default; swap provider for GPU if using onnxruntime-gpu)
tone_sess = ort.InferenceSession(os.path.join(MODEL_DIR, "tone_convnext_tiny.onnx"), providers=["CPUExecutionProvider"])
color_sess = ort.InferenceSession(os.path.join(MODEL_DIR, "color_convnext_tiny.onnx"), providers=["CPUExecutionProvider"])
black_sess = ort.InferenceSession(os.path.join(MODEL_DIR, "blackhead_convnext_tiny.onnx"), providers=["CPUExecutionProvider"])

# Preprocessing (same as training)
preprocess = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225]),
])

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

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=500)
