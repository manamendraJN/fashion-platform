"""
routes/wardrobe_routes.py
All wardrobe AI endpoints — image upload, event scoring, recommendations.
"""

from flask import Blueprint, request, jsonify, send_from_directory
import logging
import io
import os
import importlib.util
from PIL import Image
from werkzeug.utils import secure_filename
from pathlib import Path

# Import database functions
import sys

# Import from database.py file (not the database/ package)
sys.path.append(str(Path(__file__).parent.parent))
_db_file_path = Path(__file__).parent.parent / 'database.py'
_spec = importlib.util.spec_from_file_location("wardrobe_database", _db_file_path)
database = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(database)

# Import event constants for flexible matching
from core.event_constants import normalize_event_name, find_event_score, get_default_event_scores

logger = logging.getLogger(__name__)

wardrobe_bp = Blueprint('wardrobe', __name__)

# Will be injected from app.py
_wardrobe_service = None

# Upload folder configuration
UPLOAD_FOLDER = Path(__file__).parent.parent / 'uploads'
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)

def init_wardrobe_routes(wardrobe_service):
    global _wardrobe_service
    _wardrobe_service = wardrobe_service


# ─────────────────────────── Frontend API Routes ─────────────────────

@wardrobe_bp.route('/uploads/<path:filename>')
def serve_upload(filename):
    """Serve uploaded images"""
    return send_from_directory(UPLOAD_FOLDER, filename)

@wardrobe_bp.route('/api/wardrobe', methods=['GET'])
def get_all_items():
    """Get all wardrobe items from database"""
    try:
        items = database.get_all_wardrobe_items()
        return jsonify(items), 200
    except Exception as e:
        logger.error(f"Error fetching wardrobe: {e}", exc_info=True)
        return jsonify({"error": str(e), "items": []}), 500

@wardrobe_bp.route('/api/predict/clothing-type', methods=['POST'])
def predict_and_save_clothing():
    """
    Upload image, predict clothing type, save to database
    """
    if 'image' not in request.files:
        return jsonify({"error": "No image file provided"}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({"error": "Empty filename"}), 400

    try:
        # Save uploaded image
        filename = secure_filename(file.filename)
        timestamp = int(os.path.getmtime(__file__) * 1000) if os.path.exists(__file__) else 0
        unique_filename = f"{timestamp}_{filename}"
        filepath = UPLOAD_FOLDER / unique_filename
        file.save(filepath)

        # Read image for prediction
        img = Image.open(filepath)

        # Get predictions from wardrobe service
        if _wardrobe_service:
            try:
                result = _wardrobe_service.full_analysis(img, None)
                
                clothing_type = result["clothing_type"]
                confidence = result["confidence"]
                top_5 = result["top_5"]
                event_scores = result["event_scores"]
                best_event = result["best_event"]
            except Exception as model_error:
                logger.warning(f"Wardrobe model failed, using fallback: {model_error}")
                # Fallback if models not loaded properly
                clothing_type = "Tshirts"  # Default to a common clothing type
                confidence = 0.5  # Show as 50% since it's manual classification
                top_5 = [{"type": "Tshirts", "confidence": 0.5}]
                event_scores = get_default_event_scores(clothing_type)
                best_event = "Casual"
        else:
            # Fallback if service not available
            clothing_type = "Tshirts"  # Default to a common clothing type
            confidence = 0.5  # Show as 50% since it's manual classification
            top_5 = [{"type": "Tshirts", "confidence": 0.5}]
            event_scores = get_default_event_scores(clothing_type)
            best_event = "Casual"

        # Save to database
        image_path = f"/uploads/{unique_filename}"
        item_id = database.add_wardrobe_item(
            filename=filename,
            image_path=image_path,
            clothing_type=clothing_type,
            confidence=confidence,
            top_5=top_5,
            event_scores=event_scores,
            best_event=best_event
        )

        return jsonify({
            "success": True,
            "id": item_id,
            "filename": filename,
            "url": image_path,
            "type": clothing_type,
            "confidence": confidence,
            "top5": top_5,
            "eventScores": event_scores,
            "bestEvent": best_event
        }), 200

    except Exception as e:
        logger.error(f"Upload error: {e}")
        return jsonify({"error": str(e)}), 500

@wardrobe_bp.route('/api/wardrobe/<int:item_id>/favorite', methods=['POST'])
def toggle_favorite_item(item_id):
    """Toggle favorite status"""
    try:
        is_favorite = database.toggle_favorite(item_id)
        return jsonify({"success": True, "isFavorite": is_favorite}), 200
    except Exception as e:
        logger.error(f"Toggle favorite error: {e}")
        return jsonify({"error": str(e)}), 500

@wardrobe_bp.route('/api/wardrobe/<int:item_id>/dislike', methods=['POST'])
def toggle_dislike_item(item_id):
    """Toggle dislike status"""
    try:
        is_disliked = database.toggle_dislike(item_id)
        return jsonify({"success": True, "isDisliked": is_disliked}), 200
    except Exception as e:
        logger.error(f"Toggle dislike error: {e}")
        return jsonify({"error": str(e)}), 500

@wardrobe_bp.route('/api/wardrobe/<int:item_id>/mark-worn', methods=['POST'])
def mark_worn_item(item_id):
    """Mark item as worn"""
    try:
        data = request.get_json() or {}
        occasion = data.get('occasion', 'General')
        date = data.get('date')
        
        success = database.mark_item_worn(item_id, occasion, date)
        
        if success:
            return jsonify({"success": True}), 200
        else:
            return jsonify({"error": "Item not found"}), 404
    except Exception as e:
        logger.error(f"Mark worn error: {e}")
        return jsonify({"error": str(e)}), 500

@wardrobe_bp.route('/api/wardrobe/<int:item_id>/update-type', methods=['POST'])
def update_item_clothing_type(item_id):
    """Update clothing type and recalculate event scores based on clothing type"""
    try:
        data = request.get_json()
        new_type = data.get('type')
        
        if not new_type:
            return jsonify({"error": "Type is required"}), 400
        
        # Get proper event scores based on clothing type
        event_scores = get_default_event_scores(new_type)
        
        logger.info(f"Updating item {item_id} type to '{new_type}' with recalculated scores")
        
        database.update_item_type(item_id, new_type, event_scores)
        
        return jsonify({
            "success": True,
            "type": new_type,
            "eventScores": event_scores
        }), 200
    except Exception as e:
        logger.error(f"Update type error: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@wardrobe_bp.route('/api/wardrobe/<int:item_id>', methods=['DELETE'])
def delete_wardrobe_item(item_id):
    """Delete a wardrobe item"""
    try:
        # Get item to delete image file
        item = database.get_wardrobe_item(item_id)
        
        if item:
            # Delete from database
            database.delete_item(item_id)
            
            # Delete image file
            image_path = UPLOAD_FOLDER / item['url'].replace('/uploads/', '')
            if image_path.exists():
                image_path.unlink()
        
        return jsonify({"success": True}), 200
    except Exception as e:
        logger.error(f"Delete error: {e}")
        return jsonify({"error": str(e)}), 500

@wardrobe_bp.route('/api/wardrobe/recalculate-all', methods=['POST'])
def recalculate_all_event_scores():
    """Recalculate event scores for all items using current rules"""
    try:
        all_items = database.get_all_wardrobe_items()
        updated_count = 0
        
        for item in all_items:
            item_id = item['id']
            clothing_type = item.get('type', 'Unknown')
            
            # Get updated event scores based on clothing type
            new_event_scores = get_default_event_scores(clothing_type)
            
            # Update the item in database
            database.update_item_type(item_id, clothing_type, new_event_scores)
            updated_count += 1
        
        logger.info(f"✅ Recalculated event scores for {updated_count} items")
        
        return jsonify({
            "success": True,
            "message": f"Updated {updated_count} items with new event scores",
            "updated_count": updated_count
        }), 200
    except Exception as e:
        logger.error(f"Recalculate all error: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@wardrobe_bp.route('/api/analytics', methods=['GET'])
def get_analytics():
    """Get wardrobe analytics"""
    try:
        analytics = database.get_analytics()
        
        # Format for frontend
        response = {
            "stats": {
                "totalItems": analytics['totalItems'],
                "unwornItems": analytics['unwornItems'],
                "avgWearCount": analytics['avgWearCount'],
                "eventsCovered": 5,  # Placeholder
                "totalEvents": 7
            },
            "notifications": [],
            "charts": {
                "composition": [
                    {"name": item['name'], "value": item['value'], "fill": "#8B5A5A"}
                    for item in analytics['composition']
                ]
            }
        }
        
        return jsonify(response), 200
    except Exception as e:
        logger.error(f"Analytics error: {e}")
        return jsonify({"error": str(e)}), 500

@wardrobe_bp.route('/api/recommend-smart', methods=['POST'])
def recommend_smart():
    """Smart recommendations considering wear history with flexible event matching"""
    try:
        from datetime import datetime, timedelta
        
        data = request.get_json() or {}
        raw_occasion = data.get('occasion', 'Casual')
        weather = data.get('weather')
        
        # Normalize the occasion name to handle variations
        occasion = normalize_event_name(raw_occasion)
        logger.info(f"Recommending for occasion: '{raw_occasion}' -> '{occasion}'")
        
        # Get all items
        all_items = database.get_all_wardrobe_items()
        
        # Filter by occasion (using flexible event score matching)
        recommendations = []
        recently_worn = []
        
        for item in all_items:
            event_scores = item.get('eventScores', {})
            
            # Use flexible matching to find score
            score = find_event_score(event_scores, occasion)
            
            if score > 0.5:
                # Check if recently worn (within last 7 days)
                last_worn = item.get('lastWorn')
                is_recent = False
                days_since_worn = 0
                
                if last_worn:
                    try:
                        # Handle various datetime formats
                        if isinstance(last_worn, str):
                            # Remove 'Z' and replace with proper timezone
                            last_worn_str = last_worn.replace('Z', '+00:00')
                            # Try parsing with timezone
                            try:
                                last_worn_date = datetime.fromisoformat(last_worn_str)
                            except:
                                # Fallback: try without timezone
                                last_worn_date = datetime.fromisoformat(last_worn.split('T')[0])
                        else:
                            last_worn_date = last_worn
                        
                        # Make datetime naive for comparison
                        if last_worn_date.tzinfo:
                            last_worn_date = last_worn_date.replace(tzinfo=None)
                        
                        days_since_worn = (datetime.now() - last_worn_date).days
                        is_recent = days_since_worn < 7
                    except Exception as e:
                        logger.warning(f"Could not parse lastWorn date for item {item.get('id')}: {e}")
                        is_recent = False
                
                # Calculate recommendation score
                wear_count = item.get('wearCount', 0)
                wear_penalty = wear_count * 0.05
                recency_penalty = 0.3 if is_recent else 0.0
                final_score = max(0, score - wear_penalty - recency_penalty)
                
                # Add reason for recommendation
                if wear_count == 0:
                    reason = "Never worn - perfect to try!"
                elif is_recent and days_since_worn > 0:
                    reason = f"Worn recently ({days_since_worn} days ago)"
                elif wear_count < 3:
                    reason = "Lightly worn, great choice"
                else:
                    reason = f"Worn {wear_count} times"
                
                recommendations.append({
                    **item,
                    'recommendationScore': final_score,
                    'reason': reason
                })
                
                if is_recent:
                    recently_worn.append(item)
        
        # Sort by recommendation score
        recommendations.sort(key=lambda x: x.get('recommendationScore', 0), reverse=True)
        
        # Take top 8
        top_recommendations = recommendations[:8]
        
        # Build message
        if len(top_recommendations) == 0:
            message = f"No items found suitable for {occasion}. Try uploading more clothes!"
        else:
            message = f"Found {len(top_recommendations)} items perfect for {occasion}"
            if len(recently_worn) > 0:
                message += f" (Excluded {len(recently_worn)} recently worn items)"
        
        return jsonify({
            "success": True,
            "recommendations": top_recommendations,
            "recentlyWorn": [{'id': item['id'], 'type': item.get('type')} for item in recently_worn],
            "message": message
        }), 200
    except Exception as e:
        logger.error(f"Smart recommendation error: {e}", exc_info=True)
        return jsonify({"error": str(e), "success": False}), 500

@wardrobe_bp.route('/api/user-profile', methods=['GET'])
def get_user_profile():
    """Get user profile"""
    try:
        profile = database.get_user_profile()
        analytics = database.get_analytics()
        
        if profile:
            response = {
                "success": True,
                "profile": {
                    **profile,
                    "favoriteCount": analytics.get('favoriteCount', 0),
                    "stylePersonality": "Developing" if profile['totalInteractions'] < 10 else "Established"
                }
            }
            return jsonify(response), 200
        else:
            return jsonify({"error": "Profile not found"}), 404
    except Exception as e:
        logger.error(f"Profile error: {e}")
        return jsonify({"error": str(e)}), 500

@wardrobe_bp.route('/api/outfit-pairing/<int:item_id>', methods=['GET'])
def get_outfit_pairing(item_id):
    """Find matching items for outfit pairing"""
    try:
        item = database.get_wardrobe_item(item_id)
        
        if not item:
            return jsonify({"error": "Item not found"}), 404
        
        # Get all other items
        all_items = database.get_all_wardrobe_items()
        
        # Enhanced pairing logic - pair tops with bottoms only
        matches = []
        item_type = item.get('type', '').lower()
        
        # Define clothing categories
        tops = ['top', 'blouse', 'shirt', 't-shirt', 'tshirt', 'tank top', 'polo', 'sweater', 'hoodie', 'sweatshirt', 'cardigan', 'jacket', 'coat', 'blazer']
        bottoms = ['jean', 'trouser', 'pant', 'slack', 'skirt', 'short', 'legging', 'track pant']
        complete_outfits = ['dress', 'saree', 'sari', 'lehenga', 'jumpsuit', 'kurta', 'kurti', 'salwar', 'sherwani']
        
        # Don't pair complete outfits
        if any(complete in item_type for complete in complete_outfits):
            return jsonify({
                "success": False,
                "matches": [],
                "pairingCategory": "Complete Outfit",
                "message": f"{item.get('type')} is a complete outfit and doesn't need pairing"
            }), 200
        
        # Determine if item is top or bottom
        is_top = any(top_word in item_type for top_word in tops)
        is_bottom = any(bottom_word in item_type for bottom_word in bottoms)
        
        for other_item in all_items:
            if other_item['id'] == item_id:
                continue
            
            other_type = other_item.get('type', '').lower()
            
            # Skip complete outfits
            if any(complete in other_type for complete in complete_outfits):
                continue
            
            # Pair tops with bottoms
            if is_top:
                if any(bottom_word in other_type for bottom_word in bottoms):
                    matches.append(other_item)
            elif is_bottom:
                if any(top_word in other_type for top_word in tops):
                    matches.append(other_item)
        
        # Return results
        pairing_type = "Bottoms" if is_top else "Tops" if is_bottom else "Items"
        
        return jsonify({
            "success": True,
            "matches": matches[:8],  # Limit to 8 matches
            "pairingCategory": pairing_type,
            "message": f"Found {len(matches)} matching {pairing_type.lower()} to pair with your {item.get('type')}"
        }), 200
    except Exception as e:
        logger.error(f"Pairing error: {e}")
        return jsonify({"error": str(e)}), 500


# ─────────────────────────── Health ─────────────────────────────────

@wardrobe_bp.route('/api/wardrobe/health', methods=['GET'])
def wardrobe_health():
    """Check if wardrobe models are loaded."""
    loaded = _wardrobe_service is not None and _wardrobe_service._loaded
    return jsonify({
        "status":  "ready" if loaded else "not_loaded",
        "models":  ["CNN", "EventModel", "GRU", "LSTM"] if loaded else []
    }), 200 if loaded else 503


# ─────────────────────────── Clothing Detection ──────────────────────

@wardrobe_bp.route('/api/wardrobe/classify', methods=['POST'])
def classify_clothing():
    """
    POST /api/wardrobe/classify
    Body: multipart/form-data  →  image file
    Returns: clothing type + confidence
    """
    if 'image' not in request.files:
        return jsonify({"error": "No image file provided. Use key 'image'"}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({"error": "Empty filename"}), 400

    try:
        img_bytes = file.read()
        img = Image.open(io.BytesIO(img_bytes))

        result = _wardrobe_service.predict_clothing(img)

        return jsonify({
            "success":        True,
            "clothing_type":  result["clothing_type"],
            "confidence":     result["confidence"],
            "all_scores":     result["all_scores"]
        }), 200

    except Exception as e:
        logger.error(f"Classification error: {e}")
        return jsonify({"error": str(e)}), 500


# ─────────────────────────── Event Scoring ───────────────────────────

@wardrobe_bp.route('/api/wardrobe/event-scores', methods=['POST'])
def get_event_scores():
    """
    POST /api/wardrobe/event-scores
    Body: multipart/form-data
        - image: clothing image file
        - article (optional): e.g. "Sarees"
        - color   (optional): e.g. "Red"
        - usage   (optional): e.g. "Ethnic"
        - gender  (optional): e.g. "Women"
    Returns: event scores for all 12 event types
    """
    if 'image' not in request.files:
        return jsonify({"error": "No image file provided"}), 400

    file = request.files['image']

    # Optional metadata from form fields
    metadata = {
        'article': request.form.get('article', 'Tops'),
        'color':   request.form.get('color',   'Black'),
        'usage':   request.form.get('usage',   'Casual'),
        'gender':  request.form.get('gender',  'Women'),
    }

    try:
        img_bytes = file.read()
        img = Image.open(io.BytesIO(img_bytes))

        result = _wardrobe_service.predict_event_scores(img, metadata)

        return jsonify({
            "success":    True,
            "best_event": result["best_event"],
            "scores":     result["scores"]
        }), 200

    except Exception as e:
        logger.error(f"Event scoring error: {e}")
        return jsonify({"error": str(e)}), 500


# ─────────────────────────── Full Analysis ───────────────────────────

@wardrobe_bp.route('/api/wardrobe/analyze', methods=['POST'])
def analyze_clothing():
    """
    POST /api/wardrobe/analyze
    Full pipeline: classify clothing → score events
    Body: multipart/form-data
        - image: clothing image
        - color, usage, gender (optional)
    Returns: clothing type + all event scores
    """
    if 'image' not in request.files:
        return jsonify({"error": "No image file provided"}), 400

    file = request.files['image']

    metadata = {
        'color':  request.form.get('color',  'Black'),
        'usage':  request.form.get('usage',  'Casual'),
        'gender': request.form.get('gender', 'Women'),
    }

    try:
        img_bytes = file.read()
        img = Image.open(io.BytesIO(img_bytes))

        result = _wardrobe_service.full_analysis(img, metadata or None)

        return jsonify({
            "success":       True,
            "clothing_type": result["clothing_type"],
            "confidence":    result["confidence"],
            "top_5":         result["top_5"],
            "best_event":    result["best_event"],
            "event_scores":  result["event_scores"],
            "metadata_used": result["metadata_used"]
        }), 200

    except Exception as e:
        logger.error(f"Analysis error: {e}")
        return jsonify({"error": str(e)}), 500


# ─────────────────────────── Temporal Recommendation ─────────────────

@wardrobe_bp.route('/api/wardrobe/recommend-event', methods=['POST'])
def recommend_event():
    """
    POST /api/wardrobe/recommend-event
    Body: JSON  { "wear_history": [3, 7, 2, 15, ...], "use_gru": true }
    Returns: predicted best event based on wear history
    """
    data = request.get_json()
    if not data or 'wear_history' not in data:
        return jsonify({"error": "Provide 'wear_history' list in JSON body"}), 400

    wear_history = data.get('wear_history', [])
    use_gru      = data.get('use_gru', True)

    try:
        result = _wardrobe_service.predict_next_event(wear_history, use_gru)
        return jsonify({
            "success":          True,
            "predicted_event":  result["predicted_event"],
            "scores":           result["scores"],
            "model_used":       result["model_used"]
        }), 200

    except Exception as e:
        logger.error(f"Recommendation error: {e}")
        return jsonify({"error": str(e)}), 500