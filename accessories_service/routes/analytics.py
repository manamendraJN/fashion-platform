from flask import Blueprint, send_from_directory
import os

analytics_bp = Blueprint('analytics_bp', __name__)
PLOTS_DIR = os.path.join(os.path.dirname(__file__), "../static/plots")

@analytics_bp.route("/<filename>", methods=["GET"])
def serve_plot(filename):
    return send_from_directory(PLOTS_DIR, filename)