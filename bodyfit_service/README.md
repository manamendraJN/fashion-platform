# Backend API - Fashion Intelligence Platform

A Flask-based REST API for AI-powered body measurement prediction.

## Overview

This backend provides endpoints for body measurement prediction using deep learning models and image processing.

## Features

- **Body Measurement Prediction** - AI-powered body measurement extraction from images
- **Image Processing** - Background removal and preprocessing for optimal predictions
- **Model Management** - Support for multiple ML models via HuggingFace
- **CORS Support** - Ready for frontend integration

## Tech Stack

- **Framework**: Flask 3.0
- **ML/AI**: PyTorch 2.0, timm, HuggingFace Hub
- **Image Processing**: OpenCV, Pillow, albumentations, rembg
- **Deployment**: Gunicorn (production)

## Project Structure

```
backend/
├── app.py                 # Main application entry point
├── requirements.txt       # Python dependencies
├── core/                  # Core configuration
│   └── config.py
├── models/                # ML model files
├── routes/                # API route blueprints
│   ├── analysis_routes.py
│   ├── model_routes.py
│   └── general_routes.py
├── services/              # Business logic
│   ├── hf_service.py      # HuggingFace integration
│   ├── image_service.py   # Image processing
│   └── model_service.py   # Model inference
└── utils/                 # Helper functions
    ├── image_utils.py
    └── response_utils.py
```

## Installation

1. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure environment** (optional)
   ```bash
   MODEL_NAME=your-model-name
   USE_GPU=True  # Set to False for CPU
   ```

3. **Run the server**
   ```bash
   # Development
   python app.py
   ```

## API Endpoints

### General
- `GET /` - Health check
- `GET /health` - Service health status

### Model Operations
- `GET /models` - List available models
- `POST /models/download` - Download model from HuggingFace

### Body Measurement
- `POST /complete-analysis` - Complete body measurement prediction from image
- `POST /analyze` - Basic measurement analysis endpoint

## Configuration

Key configurations in `core/config.py`:
- Model directory paths
- CORS origins
- Default model settings
- File upload constraints

## Dependencies

Core dependencies:
- **torch** - Deep learning framework
- **flask** - Web framework
- **opencv-python** - Image processing
- **rembg** - Background removal
- **albumentations** - Image augmentation

See [requirements.txt](requirements.txt) for complete list.

## License

Part of the Fashion Intelligence Platform project.
