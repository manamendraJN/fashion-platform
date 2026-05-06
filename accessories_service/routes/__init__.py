from routes.health_routes import health_bp
from routes.accessory import accessory_bp
from routes.dress import dress_bp
from routes.recommend import recommend_bp
from routes.chat_routes import chat_bp
from routes.wardrobe_routes import wardrobe_bp
from routes.looks_routes import looks_bp
from routes.analytics import analytics_bp


def register_blueprints(app):
    app.register_blueprint(health_bp,    url_prefix="/api")
    app.register_blueprint(accessory_bp, url_prefix="/api")
    app.register_blueprint(dress_bp,     url_prefix="/api")
    app.register_blueprint(recommend_bp, url_prefix="/api")
    app.register_blueprint(chat_bp,      url_prefix="/api")
    app.register_blueprint(wardrobe_bp,  url_prefix="/api")
    app.register_blueprint(looks_bp,     url_prefix="/api")
    app.register_blueprint(analytics_bp, url_prefix="/api")
