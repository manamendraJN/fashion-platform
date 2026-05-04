import numpy as np

def format_measurements(measurements_dict):
    """Format measurements with proper units"""
    formatted = {}
    for key, value in measurements_dict.items():
        formatted[key] = {
            'value': round(value, 2),
            'unit': 'cm',
            'display': f"{round(value, 1)} cm"
        }
    return formatted

def validate_measurements(measurements):
    """Validate measurement values are reasonable"""
    ranges = {
        'ankle': (15, 35),
        'arm-length': (40, 70),
        'bicep': (20, 50),
        'calf': (25, 55),
        'chest': (70, 140),
        'forearm': (15, 40),
        'height': (140, 210),
        'hip': (70, 140),
        'leg-length': (60, 110),
        'shoulder-breadth': (30, 60),
        'shoulder-to-crotch': (40, 90),
        'thigh': (35, 80),
        'waist': (50, 140),
        'wrist': (12, 25)
    }
    
    warnings = []
    for key, value in measurements.items():
        if key in ranges:
            min_val, max_val = ranges[key]
            if value < min_val or value > max_val:
                warnings.append(f"{key}: {value:.1f}cm seems unusual (normal range: {min_val}-{max_val}cm)")
    
    return warnings

def create_error_response(message, status_code=400):
    """Create standardized error response"""
    return {
        'success': False,
        'error': message,
        'status_code': status_code
    }, status_code

def create_success_response(data, message="Success"):
    """Create standardized success response"""
    return {
        'success': True,
        'message': message,
        'data': data,
        'timestamp': str(np.datetime64('now'))
    }, 200
