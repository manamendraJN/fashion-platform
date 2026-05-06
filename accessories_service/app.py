from flask import Flask
from flask_cors import CORS
from database import init_db
from services.ml_models import load_models
from routes import register_blueprints

app = Flask(__name__)
CORS(app)
app.config["MAX_CONTENT_LENGTH"] = 32 * 1024 * 1024  # 32 MB

with app.app_context():
    init_db()
    load_models()

register_blueprints(app)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=False)
