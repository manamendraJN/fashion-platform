# Core routes
from routes.general_routes import general_bp, init_general_routes, register_error_handlers
from routes.model_routes   import model_bp, init_model_routes
from routes.analysis_routes import analysis_bp, init_analysis_routes

# Feature-specific routes
from routes.size_routes     import size_bp, init_size_routes
from routes.wardrobe_routes import wardrobe_bp, init_wardrobe_routes


__all__ = [
    # Blueprints
    'general_bp',
    'model_bp',
    'analysis_bp',
    'size_bp',
    'wardrobe_bp',
    
    # Initializers
    'init_general_routes',
    'init_model_routes',
    'init_analysis_routes',
    'init_size_routes',
    'init_wardrobe_routes',
    
    # Shared
    'register_error_handlers',
]