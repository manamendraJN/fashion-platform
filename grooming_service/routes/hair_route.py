import requests
import os
from flask import Blueprint, request, jsonify
from dotenv import load_dotenv

load_dotenv()

hair_bp = Blueprint('hair', __name__)

# HuggingFace Space URL
HF_API = os.getenv(
    'HF_API_URL',
    'https://yasithashya-hair-style-generator'
    '.hf.space'
)

# Exact keys from HF Space
STYLE_DISPLAY = {
    'afromen':            '⭐ Afro Men',
    'afrowomen':          '⭐ Afro Women',
    'curlyMen':           '💁 Curly Men',
    'curlywomen':         '💁 Curly Women',
    'deardloacks2':       '⭐ Dreadlocks 2',
    'dreadlocks':         '🔱 Dreadlocks',
    'long1':              '📏 Long 1',
    'long2':              '📏 Long 2',
    'longstraight':       '📏 Long Straight',
    'longstraight2':      '📏 Long Straight 2',
    'manbun':             '🎀 Man Bun',
    'mediumstraight':     '↔️ Medium Straight',
    'mediumwaves':        '〰️ Medium Waves',
    'pixiecut':           '✨ Pixie Cut',
    'pixiecut2':          '✨ Pixie Cut 2',
    'short1':             '✂️ Short 1',
    'shortbuzzcut':       '⚡ Short Buzz Cut',
    'ShortCaesarBuzzCut': '✂️ Caesar Buzz Cut',
    'shortcrop':          '✂️ Short Crop',
    'shortcropwomen':     '✂️ Short Crop Women',
    'slickedback1':       '⭐ Slicked Back 1',
    'slickedback2':       '⭐ Slicked Back 2',
    'straight':           '📏 Straight',
    'straight2':          '📏 Straight 2',
    'straight3':          '📏 Straight 3',
}


@hair_bp.route('/api/hair/styles',
               methods=['GET'])
def get_styles():
    try:
        # Try to get styles from HF Space
        r = requests.get(
            f'{HF_API}/styles',
            timeout=10)
        raw = r.json().get('styles', [])

        # raw is list of
        # {key, display} objects
        styles = [
            {
                'key': s['key'],
                'display': STYLE_DISPLAY.get(
                    s['key'],
                    s.get('display',
                          s['key'])),
                'available': True
            }
            for s in raw
        ]
        return jsonify({'styles': styles})

    except Exception:
        # Fallback to hardcoded list
        # if HF Space is unreachable
        styles = [
            {
                'key':       k,
                'display':   v,
                'available': True
            }
            for k, v in STYLE_DISPLAY.items()
        ]
        return jsonify({'styles': styles})


@hair_bp.route('/api/hair/generate',
               methods=['POST'])
def generate():
    try:
        if 'face' not in request.files:
            return jsonify(
                {'error': 'No image uploaded!'}
            ), 400

        face_file  = request.files['face']
        style_name = request.form.get(
            'style', 'straight')

        print(f"🎨 Generating style:"
              f" {style_name}")
        print(f"📡 Calling HF Space:"
              f" {HF_API}/generate")

        r = requests.post(
            f'{HF_API}/generate',
            files={'face': (
                face_file.filename,
                face_file.read(),
                face_file.content_type
            )},
            data={'style': style_name},
            timeout=180  # 3 min for AI
        )

        data = r.json()
        print(f"✅ HF Response keys:"
              f" {list(data.keys())}")

        # Translate 'result' →
        # 'result_image' for frontend
        if ('result' in data and
                'result_image' not in data):
            data['result_image'] = \
                data.pop('result')

        return jsonify(data)

    except requests.Timeout:
        return jsonify({
            'error':
                'Generation timed out.'
                ' Please try again.'
        }), 504
    except Exception as e:
        import traceback
        print(f"❌ Error: {e}")
        print(traceback.format_exc())
        return jsonify(
            {'error': str(e)}), 500