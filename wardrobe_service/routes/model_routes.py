from flask import Blueprint, request
import logging

from utils import (
    allowed_file, 
    decode_base64_image, 
    format_measurements,
    validate_measurements,
    create_error_response,
    create_success_response
)
from core.config import Config

logger = logging.getLogger(__name__)

# Create blueprint
model_bp = Blueprint('model', __name__)

# These will be set when blueprint is registered
model_inference = None
image_processor = None


def init_model_routes(inference, img_processor):
    """Initialize route dependencies"""
    global model_inference, image_processor
    model_inference = inference
    image_processor = img_processor


@model_bp.route('/model-info', methods=['GET'])
def model_info():
    """Get current model information"""
    if model_inference is None:
        return create_error_response("Model not loaded", 500)
    
    from services.model_service import ModelInference
    info = model_inference.get_model_info()
    info['current_model'] = model_inference.model_name
    info['available_models'] = ModelInference.get_available_models()
    return create_success_response(info, "Model information retrieved")


@model_bp.route('/switch-model', methods=['POST'])
def switch_model():
    """Switch to a different model without restarting"""
    if model_inference is None:
        return create_error_response("Model not initialized", 500)
    
    try:
        data = request.get_json()
        new_model = data.get('model_name')
        
        if not new_model:
            return create_error_response("model_name is required", 400)
        
        result = model_inference.switch_model(new_model)
        logger.info(f"✅ Switched to model: {new_model}")
        
        return create_success_response(result, f"Successfully switched to {new_model}")
        
    except ValueError as e:
        return create_error_response(str(e), 400)
    except Exception as e:
        logger.error(f"❌ Error switching model: {e}")
        return create_error_response(f"Failed to switch model: {str(e)}", 500)


@model_bp.route('/predict', methods=['POST'])
def predict():
    """Predict body measurements from images"""
    try:
        if model_inference is None:
            return create_error_response("Model not loaded", 500)
        
        # Get images from request
        if request.is_json:
            data = request.get_json()
            
            if 'front_image' not in data or 'side_image' not in data:
                return create_error_response("Missing front_image or side_image", 400)
            
            try:
                front_bytes = decode_base64_image(data['front_image'])
                side_bytes = decode_base64_image(data['side_image'])
            except Exception as e:
                return create_error_response(f"Invalid image format: {str(e)}", 400)
        
        else:
            if 'front_image' not in request.files or 'side_image' not in request.files:
                return create_error_response("Missing front_image or side_image files", 400)
            
            front_file = request.files['front_image']
            side_file = request.files['side_image']
            
            if not allowed_file(front_file.filename) or not allowed_file(side_file.filename):
                return create_error_response("Invalid file type. Allowed: png, jpg, jpeg", 400)
            
            front_bytes_raw = front_file.read()
            side_bytes_raw = side_file.read()

            logger.info("🔄 Processing images to create body masks...")
            front_bytes = image_processor.process_image(front_bytes_raw, Config.IMG_SIZE)
            side_bytes = image_processor.process_image(side_bytes_raw, Config.IMG_SIZE)
            logger.info("✅ Masks created successfully")
        
        # Run inference
        measurements = model_inference.predict(front_bytes, side_bytes)
        warnings = validate_measurements(measurements)
        formatted_measurements = format_measurements(measurements)
        
        response_data = {
            'measurements': formatted_measurements,
            'model': model_inference.model_config['name'],
            'warnings': warnings if warnings else None
        }
        
        return create_success_response(response_data, "Measurements predicted successfully")
    
    except Exception as e:
        logger.error(f"❌ Error in /predict: {str(e)}")
        return create_error_response(f"Prediction error: {str(e)}", 500)


@model_bp.route('/preview-mask', methods=['POST'])
def preview_mask():
    """Preview the mask that will be generated from uploaded image"""
    try:
        if 'image' not in request.files:
            return create_error_response("Missing image file", 400)
        
        image_file = request.files['image']
        
        if not allowed_file(image_file.filename):
            return create_error_response("Invalid file type", 400)
        
        image_bytes = image_file.read()
        result = image_processor.process_and_preview(image_bytes, Config.IMG_SIZE)
        
        import base64
        preview_base64 = base64.b64encode(result['preview_bytes']).decode('utf-8')
        mask_base64 = base64.b64encode(result['mask_bytes']).decode('utf-8')
        
        return create_success_response({
            'preview': f"data:image/png;base64,{preview_base64}",
            'mask': f"data:image/png;base64,{mask_base64}"
        }, "Preview generated")
    
    except Exception as e:
        logger.error(f"❌ Error in /preview-mask: {str(e)}")
        return create_error_response(f"Preview error: {str(e)}", 500)
