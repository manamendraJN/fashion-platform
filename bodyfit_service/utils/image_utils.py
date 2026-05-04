import cv2
import numpy as np
import torch
from PIL import Image
import io
import base64
from pathlib import Path
from core.config import Config

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in Config.ALLOWED_EXTENSIONS

def preprocess_image(image_bytes, target_size=(512, 384)):
    """
    Preprocess image for model inference
    
    Args:
        image_bytes: Raw image bytes
        target_size: (height, width) tuple
    
    Returns:
        Preprocessed image tensor
    """
    # Convert bytes to numpy array
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
    
    if img is None:
        raise ValueError("Invalid image data")
    
    # Convert grayscale to RGB
    img = cv2.cvtColor(img, cv2.COLOR_GRAY2RGB)
    
    # Resize
    img = cv2.resize(img, (target_size[1], target_size[0]))
    
    # Normalize
    img = img.astype(np.float32) / 255.0
    mean = np.array([0.485, 0.456, 0.406])
    std = np.array([0.229, 0.224, 0.225])
    img = (img - mean) / std
    
    # Convert to tensor (C, H, W)
    img = torch.from_numpy(img.transpose(2, 0, 1)).float()
    
    return img

def decode_base64_image(base64_string):
    """Decode base64 image string to bytes"""
    if ',' in base64_string:
        base64_string = base64_string.split(',')[1]
    return base64.b64decode(base64_string)
