"""
SQLite Database module for Fashion Intelligence Platform
Stores wardrobe items and user profile data
"""

import sqlite3
import json
from datetime import datetime
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

# Database path
DB_PATH = Path(__file__).parent / 'fashion_wardrobe.db'

def get_connection():
    """Get database connection"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Enable column access by name
    return conn

def init_database():
    """Initialize database tables"""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Wardrobe items table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS wardrobe_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            image_path TEXT NOT NULL,
            clothing_type TEXT,
            confidence REAL,
            top_5 TEXT,
            event_scores TEXT,
            best_event TEXT,
            wear_count INTEGER DEFAULT 0,
            last_worn TEXT,
            wear_history TEXT DEFAULT '[]',
            is_favorite INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # User profile table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_profile (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            style_preferences TEXT DEFAULT '{}',
            total_interactions INTEGER DEFAULT 0,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Insert default user profile if not exists
    cursor.execute('SELECT id FROM user_profile WHERE id = 1')
    if not cursor.fetchone():
        default_profile = {
            'casual': 0, 
            'formal': 0, 
            'sporty': 0, 
            'trendy': 0,
            'classic': 0, 
            'bohemian': 0, 
            'minimalist': 0
        }
        cursor.execute('''
            INSERT INTO user_profile (id, style_preferences, total_interactions, updated_at)
            VALUES (1, ?, 0, ?)
        ''', (
            json.dumps(default_profile),
            datetime.now().isoformat()
        ))
    
    conn.commit()
    conn.close()
    logger.info("✅ Database initialized successfully")

def add_wardrobe_item(filename, image_path, clothing_type, confidence, top_5, event_scores, best_event):
    """Add a new wardrobe item to database"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO wardrobe_items (
            filename, image_path, clothing_type, confidence, 
            top_5, event_scores, best_event, wear_count, 
            last_worn, wear_history, is_favorite, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL, '[]', 0, ?)
    ''', (
        filename,
        image_path,
        clothing_type,
        confidence,
        json.dumps(top_5),
        json.dumps(event_scores),
        best_event,
        datetime.now().isoformat()
    ))
    
    item_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    logger.info(f"✅ Added wardrobe item: {filename} (ID: {item_id})")
    return item_id

def get_all_wardrobe_items():
    """Get all wardrobe items"""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Ensure is_disliked column exists
    cursor.execute("PRAGMA table_info(wardrobe_items)")
    columns = [col[1] for col in cursor.fetchall()]
    if 'is_disliked' not in columns:
        cursor.execute('ALTER TABLE wardrobe_items ADD COLUMN is_disliked INTEGER DEFAULT 0')
        conn.commit()
    
    cursor.execute('SELECT * FROM wardrobe_items ORDER BY created_at DESC')
    rows = cursor.fetchall()
    conn.close()
    
    items = []
    for row in rows:
        try:
            # Check if is_disliked column exists
            is_disliked = False
            if 'is_disliked' in row.keys():
                is_disliked = bool(row['is_disliked'])
            
            items.append({
                'id': row['id'],
                'filename': row['filename'],
                'url': row['image_path'],
                'type': row['clothing_type'],
                'confidence': row['confidence'],
                'top5': json.loads(row['top_5']) if row['top_5'] else [],
                'eventScores': json.loads(row['event_scores']) if row['event_scores'] else {},
                'bestEvent': row['best_event'],
                'wearCount': row['wear_count'],
                'lastWorn': row['last_worn'],
                'wearHistory': json.loads(row['wear_history']) if row['wear_history'] else [],
                'isFavorite': bool(row['is_favorite']),
                'isDisliked': is_disliked,
                'uploadDate': row['created_at']
            })
        except Exception as e:
            logger.error(f"Error processing item {row['id']}: {e}")
            continue
    
    return items

def get_wardrobe_item(item_id):
    """Get a single wardrobe item by ID"""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Ensure is_disliked column exists
    cursor.execute("PRAGMA table_info(wardrobe_items)")
    columns = [col[1] for col in cursor.fetchall()]
    if 'is_disliked' not in columns:
        cursor.execute('ALTER TABLE wardrobe_items ADD COLUMN is_disliked INTEGER DEFAULT 0')
        conn.commit()
    
    cursor.execute('SELECT * FROM wardrobe_items WHERE id = ?', (item_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        return None
    
    # Check if is_disliked column exists
    is_disliked = False
    if 'is_disliked' in row.keys():
        is_disliked = bool(row['is_disliked'])
    
    return {
        'id': row['id'],
        'filename': row['filename'],
        'url': row['image_path'],
        'type': row['clothing_type'],
        'confidence': row['confidence'],
        'top5': json.loads(row['top_5']) if row['top_5'] else [],
        'eventScores': json.loads(row['event_scores']) if row['event_scores'] else {},
        'bestEvent': row['best_event'],
        'wearCount': row['wear_count'],
        'lastWorn': row['last_worn'],
        'wearHistory': json.loads(row['wear_history']) if row['wear_history'] else [],
        'isFavorite': bool(row['is_favorite']),
        'isDisliked': is_disliked,
        'uploadDate': row['created_at']
    }

def update_item_type(item_id, new_type, event_scores):
    """Update clothing type and event scores"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        UPDATE wardrobe_items 
        SET clothing_type = ?, event_scores = ?
        WHERE id = ?
    ''', (new_type, json.dumps(event_scores), item_id))
    
    conn.commit()
    conn.close()
    logger.info(f"✅ Updated item {item_id} type to: {new_type}")

def toggle_favorite(item_id):
    """Toggle favorite status"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT is_favorite FROM wardrobe_items WHERE id = ?', (item_id,))
    row = cursor.fetchone()
    
    if row:
        new_status = 0 if row['is_favorite'] else 1
        cursor.execute('UPDATE wardrobe_items SET is_favorite = ? WHERE id = ?', (new_status, item_id))
        conn.commit()
        conn.close()
        return bool(new_status)
    
    conn.close()
    return False

def toggle_dislike(item_id):
    """Toggle dislike status"""
    conn = get_connection()
    cursor = conn.cursor()
    
    # First ensure the is_disliked column exists
    cursor.execute("PRAGMA table_info(wardrobe_items)")
    columns = [col[1] for col in cursor.fetchall()]
    if 'is_disliked' not in columns:
        cursor.execute('ALTER TABLE wardrobe_items ADD COLUMN is_disliked INTEGER DEFAULT 0')
        conn.commit()
    
    cursor.execute('SELECT is_disliked FROM wardrobe_items WHERE id = ?', (item_id,))
    row = cursor.fetchone()
    
    if row:
        # Safely get the value with fallback
        current_status = 0
        if 'is_disliked' in row.keys():
            current_status = row['is_disliked'] or 0
        new_status = 0 if current_status else 1
        cursor.execute('UPDATE wardrobe_items SET is_disliked = ? WHERE id = ?', (new_status, item_id))
        conn.commit()
        conn.close()
        return bool(new_status)
    
    conn.close()
    return False

def mark_item_worn(item_id, occasion, date=None):
    """Mark item as worn"""
    conn = get_connection()
    cursor = conn.cursor()
    
    if date is None:
        date = datetime.now().isoformat()
    
    # Get current wear history
    cursor.execute('SELECT wear_history, wear_count FROM wardrobe_items WHERE id = ?', (item_id,))
    row = cursor.fetchone()
    
    if row:
        wear_history = json.loads(row['wear_history']) if row['wear_history'] else []
        wear_history.append({'date': date, 'occasion': occasion})
        
        cursor.execute('''
            UPDATE wardrobe_items 
            SET wear_count = ?, last_worn = ?, wear_history = ?
            WHERE id = ?
        ''', (row['wear_count'] + 1, date, json.dumps(wear_history), item_id))
        
        conn.commit()
        conn.close()
        logger.info(f"✅ Marked item {item_id} as worn")
        return True
    
    conn.close()
    return False

def delete_item(item_id):
    """Delete a wardrobe item"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('DELETE FROM wardrobe_items WHERE id = ?', (item_id,))
    deleted = cursor.rowcount > 0
    
    conn.commit()
    conn.close()
    
    if deleted:
        logger.info(f"✅ Deleted item {item_id}")
    
    return deleted

def get_user_profile():
    """Get user profile"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM user_profile WHERE id = 1')
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return {
            'stylePreferences': json.loads(row['style_preferences']) if row['style_preferences'] else {},
            'totalInteractions': row['total_interactions'],
            'updatedAt': row['updated_at']
        }
    
    return None

def update_user_profile(style_preferences=None, increment_interactions=False):
    """Update user profile"""
    conn = get_connection()
    cursor = conn.cursor()
    
    if style_preferences:
        cursor.execute('''
            UPDATE user_profile 
            SET style_preferences = ?, updated_at = ?
            WHERE id = 1
        ''', (json.dumps(style_preferences), datetime.now().isoformat()))
    
    if increment_interactions:
        cursor.execute('''
            UPDATE user_profile 
            SET total_interactions = total_interactions + 1, updated_at = ?
            WHERE id = 1
        ''', (datetime.now().isoformat(),))
    
    conn.commit()
    conn.close()
    logger.info("✅ Updated user profile")

def get_analytics():
    """Get wardrobe analytics"""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Basic stats
    cursor.execute('SELECT COUNT(*) as total FROM wardrobe_items')
    total_items = cursor.fetchone()['total']
    
    cursor.execute('SELECT COUNT(*) as unworn FROM wardrobe_items WHERE wear_count = 0')
    unworn_items = cursor.fetchone()['unworn']
    
    cursor.execute('SELECT AVG(wear_count) as avg_wear FROM wardrobe_items')
    avg_wear = cursor.fetchone()['avg_wear'] or 0
    
    cursor.execute('SELECT COUNT(*) as favorites FROM wardrobe_items WHERE is_favorite = 1')
    favorite_count = cursor.fetchone()['favorites']
    
    # Composition by clothing type
    cursor.execute('''
        SELECT clothing_type, COUNT(*) as count 
        FROM wardrobe_items 
        GROUP BY clothing_type
    ''')
    composition = cursor.fetchall()
    
    conn.close()
    
    return {
        'totalItems': total_items,
        'unwornItems': unworn_items,
        'avgWearCount': round(avg_wear, 1),
        'favoriteCount': favorite_count,
        'composition': [{'name': row['clothing_type'], 'value': row['count']} for row in composition]
    }

# Initialize database on module import
init_database()
