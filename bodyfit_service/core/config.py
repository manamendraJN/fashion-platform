import os
from pathlib import Path

class Config:
    # API Configuration
    API_TITLE = "Body Measurement AI API"
    API_VERSION = "1.0.0"
    DEBUG = os.getenv('DEBUG', 'True') == 'True'
    HOST = os.getenv('HOST', '0.0.0.0')
    PORT = int(os.getenv('PORT', 5002))
    
    # Model Configuration
    BASE_DIR = Path(__file__).parent.parent
    MODEL_DIR = BASE_DIR / 'models'
    
    MODEL_FILES = {
        'model_v1': 'efficientnet-b3_model.pth',     #main model
        'model_v2': 'mobilenetv3_model.pth',         
        'model_v3': 'resnet50_model.pth',            
    }
    
    # Available models (using aliases mapped to actual files above)
    MODELS = {
        'model_v1': {
            'filename': MODEL_FILES['model_v1'],
            'path': MODEL_DIR / MODEL_FILES['model_v1'],
            'backbone': 'efficientnet_b3',
            'name': 'Model V1 (EfficientNet-B3)',
            'description': 'Balanced accuracy and speed',
            'speed': 'medium',
            'accuracy': 'high'
        },
        'model_v2': {
            'filename': MODEL_FILES['model_v2'],
            'path': MODEL_DIR / MODEL_FILES['model_v2'],
            'backbone': 'mobilenetv3_large_100',
            'name': 'Model V2 (MobileNetV3)',
            'description': 'Lightweight and fast',
            'speed': 'fast',
            'accuracy': 'medium'
        },
        'model_v3': {
            'filename': MODEL_FILES['model_v3'],
            'path': MODEL_DIR / MODEL_FILES['model_v3'],
            'backbone': 'resnet50',
            'name': 'Model V3 (ResNet50)',
            'description': 'High accuracy',
            'speed': 'slow',
            'accuracy': 'high'
        }
    }
    
    DEFAULT_MODEL = 'model_v3'  
    
    # Image Configuration
    IMG_SIZE = (512, 384)  # height, width
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    
    # Measurement Configuration
    MEASUREMENT_COLUMNS = [
        'ankle', 'arm-length', 'bicep', 'calf', 'chest', 'forearm',
        'height', 'hip', 'leg-length', 'shoulder-breadth',
        'shoulder-to-crotch', 'thigh', 'waist', 'wrist'
    ]
       
    # CORS Configuration - Allow web frontend and mobile app
    CORS_ORIGINS = [
        'http://localhost:3000',      # React web frontend (dev)
        'http://localhost:5173',      # Vite web frontend (dev)
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
        'http://10.0.2.2:5000',       # Android emulator
        '*'                           # Allow all other origins (mobile tunnel, physical devices)
    ]
