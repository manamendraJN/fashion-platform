from flask import Blueprint, jsonify
from datetime import datetime

from core.config import Config
from utils import create_error_response

# Create blueprint
general_bp = Blueprint('general', __name__)

# Will be set when blueprint is registered
model_inference = None


def init_general_routes(inference):
    """Initialize route dependencies"""
    global model_inference
    model_inference = inference


@general_bp.route('/', methods=['GET'])
def home():
    """API home endpoint"""
    return jsonify({
        'api': Config.API_TITLE,
        'version': Config.API_VERSION,
        'status': 'running',
        'endpoints': {
            'predict': '/predict [POST]',
            'preview_mask': '/preview-mask [POST]',
            'complete_analysis': '/complete-analysis [POST]',
            'model_info': '/model-info [GET]',
            'switch_model': '/switch-model [POST]',
            'health_check': '/health [GET]'
        }
    })


@general_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model_inference is not None,
        'timestamp': datetime.utcnow().isoformat()
    }), 200


# Error handlers
def register_error_handlers(app):
    """Register error handlers"""
    
    @app.errorhandler(404)
    def not_found(e):
        return create_error_response("Endpoint not found", 404)

    @app.errorhandler(500)
    def internal_error(e):
        return create_error_response("Internal server error", 500)
