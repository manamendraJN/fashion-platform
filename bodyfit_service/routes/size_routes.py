"""
Size recommendation routes
Handles API endpoints for garment size matching
"""

from flask import Blueprint, request
import logging
from typing import Dict

from utils import (
    create_error_response,
    create_success_response
)
from services.size_matching_service import size_matching_service
from database.db_manager import db_manager

logger = logging.getLogger(__name__)

# Create blueprint
size_bp = Blueprint('size', __name__)


@size_bp.route('/brands', methods=['GET'])
def get_brands():
    """Get all available brands"""
    try:
        brands = db_manager.get_brands()
        return create_success_response({
            'brands': brands,
            'count': len(brands)
        })
    except Exception as e:
        logger.error(f"Error fetching brands: {e}")
        return create_error_response(str(e), 500)


@size_bp.route('/categories', methods=['GET'])
def get_categories():
    """Get all garment categories, optionally filtered by gender"""
    try:
        gender = request.args.get('gender', None)
        categories = db_manager.get_categories(gender)
        
        return create_success_response({
            'categories': categories,
            'count': len(categories),
            'filter': {'gender': gender} if gender else None
        })
    except Exception as e:
        logger.error(f"Error fetching categories: {e}")
        return create_error_response(str(e), 500)


@size_bp.route('/recommend', methods=['POST'])
def recommend_size():
    """
    Recommend size for given measurements
    
    Request body:
    {
        "measurements": {
            "chest": 95,
            "waist": 82,
            "hip": 98,
            ...
        },
        "brand_id": 1,
        "category_id": 1,
        "fit_type": "Regular"  # optional
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return create_error_response("No data provided", 400)
        
        # Validate required fields
        if 'measurements' not in data:
            return create_error_response("Missing 'measurements' field", 400)
        
        if 'brand_id' not in data:
            return create_error_response("Missing 'brand_id' field", 400)
        
        if 'category_id' not in data:
            return create_error_response("Missing 'category_id' field", 400)
        
        measurements = data['measurements']
        brand_id = data['brand_id']
        category_id = data['category_id']
        fit_type = data.get('fit_type', 'Regular')
        
        # Get recommendation
        recommendation = size_matching_service.find_best_size(
            measurements,
            brand_id,
            category_id,
            fit_type
        )
        
        if 'error' in recommendation:
            return create_error_response(recommendation['error'], 404)
        
        return create_success_response({
            'recommendation': recommendation
        })
        
    except Exception as e:
        logger.error(f"Error in size recommendation: {e}")
        return create_error_response(str(e), 500)


@size_bp.route('/recommend/multiple-brands', methods=['POST'])
def recommend_multiple_brands():
    """
    Get size recommendations across multiple brands
    
    Request body:
    {
        "measurements": {...},
        "category_id": 1,
        "gender": "Men",  # optional
        "fit_type": "Regular",  # optional
        "min_confidence": 60.0  # optional
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'measurements' not in data or 'category_id' not in data:
            return create_error_response("Missing required fields", 400)
        
        measurements = data['measurements']
        category_id = data['category_id']
        gender = data.get('gender', None)
        fit_type = data.get('fit_type', 'Regular')
        min_confidence = data.get('min_confidence', 60.0)
        
        recommendations = size_matching_service.get_recommendations_for_multiple_brands(
            measurements,
            category_id,
            gender,
            fit_type,
            min_confidence
        )
        
        return create_success_response({
            'recommendations': recommendations,
            'count': len(recommendations),
            'filters': {
                'category_id': category_id,
                'gender': gender,
                'fit_type': fit_type,
                'min_confidence': min_confidence
            }
        })
        
    except Exception as e:
        logger.error(f"Error in multiple brand recommendations: {e}")
        return create_error_response(str(e), 500)


@size_bp.route('/compare-brands', methods=['POST'])
def compare_brands():
    """
    Compare what size you are across different brands
    
    Request body:
    {
        "measurements": {...},
        "category_id": 1,
        "brand_ids": [1, 2, 3],
        "fit_type": "Regular"  # optional
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return create_error_response("No data provided", 400)
        
        required_fields = ['measurements', 'category_id', 'brand_ids']
        for field in required_fields:
            if field not in data:
                return create_error_response(f"Missing '{field}' field", 400)
        
        measurements = data['measurements']
        category_id = data['category_id']
        brand_ids = data['brand_ids']
        fit_type = data.get('fit_type', 'Regular')
        
        if not isinstance(brand_ids, list) or len(brand_ids) == 0:
            return create_error_response("'brand_ids' must be a non-empty list", 400)
        
        comparison = size_matching_service.compare_sizes_across_brands(
            measurements,
            category_id,
            brand_ids,
            fit_type
        )
        
        return create_success_response({
            'comparison': comparison
        })
        
    except Exception as e:
        logger.error(f"Error in brand comparison: {e}")
        return create_error_response(str(e), 500)


@size_bp.route('/size-chart/<int:brand_id>/<int:category_id>', methods=['GET'])
def get_size_chart(brand_id: int, category_id: int):
    """Get detailed size chart for a brand and category"""
    try:
        fit_type = request.args.get('fit_type', 'Regular')
        
        # Get chart info
        chart = db_manager.get_size_chart(brand_id, category_id, fit_type)
        
        if not chart:
            return create_error_response("Size chart not found", 404)
        
        # Get all sizes with measurements
        sizes = db_manager.get_sizes_for_chart(chart['chart_id'])
        
        # Get category requirements
        requirements = db_manager.get_category_measurement_requirements(category_id)
        
        return create_success_response({
            'chart': chart,
            'sizes': sizes,
            'measurement_requirements': requirements
        })
        
    except Exception as e:
        logger.error(f"Error fetching size chart: {e}")
        return create_error_response(str(e), 500)


@size_bp.route('/measurements/save', methods=['POST'])
def save_measurements():
    """
    Save user measurements for future reference
    
    Request body:
    {
        "measurements": {...},
        "user_identifier": "user@example.com",  # optional
        "gender": "Men"  # optional
    }
    """
    try:
        data = request.get_json()
        
        logger.info(f"Received save measurements request: {data}")
        
        if not data or 'measurements' not in data:
            logger.error("Missing 'measurements' field in request")
            return create_error_response("Missing 'measurements' field", 400)
        
        measurements = data['measurements']
        user_identifier = data.get('user_identifier', 'default')
        gender = data.get('gender', None)
        measured_at = data.get('measured_at', None)  # Client's local time in ISO format
        
        logger.info(f"Saving measurements for user '{user_identifier}': {measurements}")
        
        user_id = db_manager.save_user_measurements(
            measurements,
            user_identifier,
            gender,
            measured_at
        )
        
        logger.info(f"Successfully saved measurements with user_id: {user_id}")
        
        return create_success_response({
            'user_id': user_id,
            'message': 'Measurements saved successfully'
        })
        
    except Exception as e:
        logger.error(f"Error saving measurements: {e}", exc_info=True)
        return create_error_response(str(e), 500)


@size_bp.route('/measurements/latest', methods=['GET'])
def get_latest_measurements():
    """
    Get most recent user measurements within the last 3 months
    
    Query params:
        user_identifier: User identifier (default: 'default')
        max_age_days: Maximum age in days (default: 90)
    
    Response:
    {
        "success": true,
        "data": {
            "measurements": {...},
            "measured_at": "2026-03-08T10:30:00",
            "gender": "Men",
            "age_days": 5
        }
    }
    """
    try:
        user_identifier = request.args.get('user_identifier', 'default')
        max_age_days = int(request.args.get('max_age_days', 90))
        
        logger.info(f"Fetching latest measurements for user '{user_identifier}' (max age: {max_age_days} days)")
        
        result = db_manager.get_latest_user_measurements(user_identifier, max_age_days)
        
        if not result:
            logger.info(f"No recent measurements found for user '{user_identifier}'")
            return create_success_response({
                'measurements': None,
                'message': 'No recent measurements found. Please measure your body first.'
            })
        
        # Calculate age in days
        from datetime import datetime
        # Convert SQLite datetime format to ISO format (replace space with T)
        measured_at_str = result['measured_at'].replace(' ', 'T') if ' ' in result['measured_at'] else result['measured_at']
        measured_at = datetime.fromisoformat(measured_at_str.replace('Z', '+00:00'))
        age_days = (datetime.now() - measured_at).days
        result['age_days'] = age_days
        # Return ISO format for frontend
        result['measured_at'] = measured_at.isoformat()
        
        logger.info(f"Found measurements for user '{user_identifier}' from {age_days} days ago")
        
        return create_success_response(result)
        
    except Exception as e:
        logger.error(f"Error fetching latest measurements: {e}", exc_info=True)
        return create_error_response(str(e), 500)


@size_bp.route('/measurements/history', methods=['GET'])
def get_measurement_history():
    """
    Get all measurement history for a user
    
    Query params:
        user_identifier: User identifier (default: 'default')
    
    Response:
    {
        "success": true,
        "data": {
            "count": 5,
            "measurements": [...]
        }
    }
    """
    try:
        user_identifier = request.args.get('user_identifier', 'default')
        
        logger.info(f"Fetching measurement history for user '{user_identifier}'")
        
        all_measurements = db_manager.get_all_user_measurements(user_identifier)
        
        if not all_measurements:
            logger.info(f"No measurement history found for user '{user_identifier}'")
            return create_success_response({
                'count': 0,
                'measurements': []
            })
        
        # Process each measurement record
        from datetime import datetime
        processed_measurements = []
        
        for record in all_measurements:
            # Convert SQLite datetime format to ISO format
            measured_at_str = record['created_at'].replace(' ', 'T') if ' ' in record['created_at'] else record['created_at']
            measured_at = datetime.fromisoformat(measured_at_str.replace('Z', '+00:00'))
            age_days = (datetime.now() - measured_at).days
            
            # Extract measurements
            measurements = {
                'height': record.get('height'),
                'chest': record.get('chest'),
                'waist': record.get('waist'),
                'hip': record.get('hip'),
                'shoulder_breadth': record.get('shoulder_breadth'),
                'shoulder_to_crotch': record.get('shoulder_to_crotch'),
                'arm_length': record.get('arm_length'),
                'bicep': record.get('bicep'),
                'forearm': record.get('forearm'),
                'wrist': record.get('wrist'),
                'leg_length': record.get('leg_length'),
                'thigh': record.get('thigh'),
                'calf': record.get('calf'),
                'ankle': record.get('ankle')
            }
            # Remove None values
            measurements = {k: v for k, v in measurements.items() if v is not None}
            
            processed_measurements.append({
                'user_id': record['user_id'],
                'measurements': measurements,
                'gender': record.get('gender'),
                'unit': record.get('unit', 'cm'),
                'measured_at': measured_at.isoformat(),
                'age_days': age_days
            })
        
        logger.info(f"Found {len(processed_measurements)} measurement records for user '{user_identifier}'")
        
        return create_success_response({
            'count': len(processed_measurements),
            'measurements': processed_measurements
        })
        
    except Exception as e:
        logger.error(f"Error fetching measurement history: {e}", exc_info=True)
        return create_error_response(str(e), 500)


@size_bp.route('/analysis-with-recommendations', methods=['POST'])
def analysis_with_recommendations():
    """
    Combined endpoint: Get body measurements from images AND size recommendations
    
    Request form-data:
    - front_image: Image file
    - side_image: Image file
    - category_id: int
    - brand_ids: comma-separated list (optional, if empty returns all brands)
    - fit_type: string (optional, default 'Regular')
    """
    try:
        # This will be implemented after integrating with the model service
        # For now, return a placeholder
        return create_error_response(
            "This endpoint requires integration with the measurement extraction model. "
            "Use /complete-analysis to get measurements, then /recommend for size matching.",
            501
        )
        
    except Exception as e:
        logger.error(f"Error in analysis with recommendations: {e}")
        return create_error_response(str(e), 500)


@size_bp.route('/health', methods=['GET'])
def size_health():
    """Health check for size recommendation service"""
    try:
        # Check database connection
        brands = db_manager.get_brands()
        categories = db_manager.get_categories()
        
        return create_success_response({
            'status': 'healthy',
            'database': 'connected',
            'brands_available': len(brands),
            'categories_available': len(categories)
        })
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return create_error_response(f"Service unhealthy: {str(e)}", 503)


# Initialize function (called from app.py)
def init_size_routes():
    """Initialize size recommendation routes"""
    logger.info("✅ Size recommendation routes initialized")
    return size_bp