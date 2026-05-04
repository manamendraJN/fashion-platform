from flask import Blueprint, request
import logging

from utils import (
    allowed_file,
    format_measurements,
    validate_measurements,
    create_error_response,
    create_success_response
)

logger = logging.getLogger(__name__)

# Create blueprint
analysis_bp = Blueprint('analysis', __name__)

# Will be set when blueprint is registered
model_inference = None


def init_analysis_routes(inference):
    """Initialize route dependencies"""
    global model_inference
    model_inference = inference


@analysis_bp.route('/complete-analysis', methods=['POST'])
def complete_analysis():
    try:
        if model_inference is None:
            return create_error_response("Model not loaded", 500)
        
        if 'front_image' not in request.files or 'side_image' not in request.files:
            return create_error_response("Missing front_image or side_image files", 400)
        
        front_file = request.files['front_image']
        side_file = request.files['side_image']
        
        if not allowed_file(front_file.filename) or not allowed_file(side_file.filename):
            return create_error_response("Invalid file type. Allowed: png, jpg, jpeg", 400)
        
        front_bytes = front_file.read()
        side_bytes = side_file.read()
        
        # Get measurements
        measurements = model_inference.predict(front_bytes, side_bytes)
        warnings = validate_measurements(measurements)
        formatted_measurements = format_measurements(measurements)
        
        complete_data = {
            'measurements': formatted_measurements,
            'model': model_inference.model_config['name'],
            'warnings': warnings if warnings else None
        }
        
        return create_success_response(complete_data, "Complete analysis generated")
    
    except Exception as e:
        logger.error(f"❌ Error in /complete-analysis: {str(e)}")
        return create_error_response(f"Analysis error: {str(e)}", 500)
