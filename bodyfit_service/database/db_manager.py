"""
Database Manager for Fashion Intelligence Platform - SIMPLIFIED VERSION
Handles SQLite database with 5-table schema (simplified from 8 tables)

DIFFERENCES FROM ORIGINAL:
  - Works with denormalized sizes table (measurements as columns)
  - No size_measurements table
  - No category_measurements table
  - Simpler API for adding sizes with measurements
"""

import sqlite3
import json
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from contextlib import contextmanager
import logging

logger = logging.getLogger(__name__)


class DatabaseManager:
    """Manages SQLite database with simplified 5-table schema"""
    
    def __init__(self, db_path: str = None):
        """
        Initialize database manager
        
        Args:
            db_path: Path to SQLite database file. Defaults to fashion_db.sqlite
        """
        if db_path is None:
            db_path = Path(__file__).parent / "fashion_db.sqlite"
        
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"Database initialized at: {self.db_path}")
    
    @contextmanager
    def get_connection(self):
        """Context manager for database connections"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row  # Access columns by name
        try:
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            logger.error(f"Database error: {e}")
            raise
        finally:
            conn.close()
    
    def initialize_database(self):
        """Create database schema from SQL file"""
        schema_path = Path(__file__).parent / "schema.sql"
        
        if not schema_path.exists():
            raise FileNotFoundError(f"Schema file not found: {schema_path}")
        
        with open(schema_path, 'r', encoding='utf-8') as f:
            schema_sql = f.read()
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.executescript(schema_sql)
            logger.info("✅ Database schema initialized successfully")
    
    # ========================================================================
    # BRANDS
    # ========================================================================
    
    def insert_brand(self, brand_name: str, country: str = None, 
                    size_system: str = "US", website: str = None) -> int:
        """Insert a new brand and return brand_id"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO brands (brand_name, brand_country, size_system, website_url)
                VALUES (?, ?, ?, ?)
            """, (brand_name, country, size_system, website))
            return cursor.lastrowid
    
    def get_or_create_brand(self, name: str, country: str = None, 
                            size_system: str = None, website: str = None, 
                            notes: str = None) -> int:
        """Get existing brand or create new one, return brand_id"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT brand_id FROM brands WHERE brand_name = ?", (name,))
            result = cursor.fetchone()
            if result:
                return result[0]
            cursor.execute("""
                INSERT INTO brands (brand_name, brand_country, size_system, website_url, notes)
                VALUES (?, ?, ?, ?, ?)
            """, (name, country, size_system, website, notes))
            return cursor.lastrowid
    
    def get_brands(self) -> List[Dict]:
        """Get all brands"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM brands ORDER BY brand_name")
            return [dict(row) for row in cursor.fetchall()]
    
    # ========================================================================
    # GARMENT CATEGORIES
    # ========================================================================
    
    def insert_category(self, category_name: str, gender: str = None, 
                       description: str = None) -> int:
        """Insert a new garment category and return category_id"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO garment_categories (category_name, gender, description)
                VALUES (?, ?, ?)
            """, (category_name, gender, description))
            return cursor.lastrowid
    
    def get_or_create_category(self, name: str, gender: str, description: str = None) -> int:
        """Get existing category or create new one, return category_id"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT category_id FROM garment_categories 
                WHERE category_name = ? AND gender = ?
            """, (name, gender))
            result = cursor.fetchone()
            if result:
                return result[0]
            cursor.execute("""
                INSERT INTO garment_categories (category_name, gender, description)
                VALUES (?, ?, ?)
            """, (name, gender, description))
            return cursor.lastrowid
    
    def get_categories(self, gender: str = None) -> List[Dict]:
        """Get garment categories, optionally filtered by gender"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if gender:
                cursor.execute(
                    "SELECT * FROM garment_categories WHERE gender = ? OR gender = 'Unisex' ORDER BY category_name",
                    (gender,)
                )
            else:
                cursor.execute("SELECT * FROM garment_categories ORDER BY category_name")
            return [dict(row) for row in cursor.fetchall()]
    
    # ========================================================================
    # SIZE CHARTS
    # ========================================================================
    
    def insert_size_chart(self, brand_id: int, category_id: int, 
                          chart_name: str = None, fit_type: str = 'Regular',
                          notes: str = None) -> int:
        """Insert a new size chart and return chart_id"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO size_charts (brand_id, category_id, chart_name, fit_type, notes)
                VALUES (?, ?, ?, ?, ?)
            """, (brand_id, category_id, chart_name, fit_type, notes))
            return cursor.lastrowid
    
    def get_size_chart(self, brand_id: int, category_id: int, 
                       fit_type: str = 'Regular') -> Optional[Dict]:
        """Get size chart details for a specific brand and category"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT sc.*, b.brand_name, b.size_system, gc.category_name, gc.gender
                FROM size_charts sc
                JOIN brands b ON sc.brand_id = b.brand_id
                JOIN garment_categories gc ON sc.category_id = gc.category_id
                WHERE sc.brand_id = ? AND sc.category_id = ? AND sc.fit_type = ? AND sc.is_active = 1
            """, (brand_id, category_id, fit_type))
            
            result = cursor.fetchone()
            return dict(result) if result else None
    
    # ========================================================================
    # SIZES (SIMPLIFIED - WITH DENORMALIZED MEASUREMENTS)
    # ========================================================================
    
    def insert_size(self, chart_id: int, size_label: str, size_order: int,
                   measurements: Dict[str, Tuple[float, float]] = None) -> int:
        """
        Insert a size with measurements (denormalized)
        
        Args:
            chart_id: ID of the size chart
            size_label: Size label (e.g., 'M', 'L', '32')
            size_order: Ordering number (1=smallest)
            measurements: Dict of measurement_type -> (min, max) tuples
                         e.g., {'chest': (91, 97), 'waist': (81, 86)}
        
        Returns:
            size_id of inserted size
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Extract measurements if provided
            meas = measurements or {}
            
            cursor.execute("""
                INSERT INTO sizes (
                    chart_id, size_label, size_order,
                    chest_min, chest_max,
                    waist_min, waist_max,
                    hip_min, hip_max,
                    shoulder_breadth_min, shoulder_breadth_max,
                    arm_length_min, arm_length_max,
                    bicep_min, bicep_max,
                    leg_length_min, leg_length_max,
                    thigh_min, thigh_max,
                    height_min, height_max
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                chart_id, size_label, size_order,
                meas.get('chest', (None, None))[0], meas.get('chest', (None, None))[1],
                meas.get('waist', (None, None))[0], meas.get('waist', (None, None))[1],
                meas.get('hip', (None, None))[0], meas.get('hip', (None, None))[1],
                meas.get('shoulder_breadth', (None, None))[0], meas.get('shoulder_breadth', (None, None))[1],
                meas.get('arm_length', (None, None))[0], meas.get('arm_length', (None, None))[1],
                meas.get('bicep', (None, None))[0], meas.get('bicep', (None, None))[1],
                meas.get('leg_length', (None, None))[0], meas.get('leg_length', (None, None))[1],
                meas.get('thigh', (None, None))[0], meas.get('thigh', (None, None))[1],
                meas.get('height', (None, None))[0], meas.get('height', (None, None))[1]
            ))
            return cursor.lastrowid
    
    def get_sizes_for_chart(self, chart_id: int) -> List[Dict]:
        """
        Get all sizes for a specific chart with their measurements
        
        Returns: List of size dictionaries with 'measurements' array
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM sizes WHERE chart_id = ? ORDER BY size_order
            """, (chart_id,))
            
            sizes = []
            for row in cursor.fetchall():
                size_dict = dict(row)
                
                # Convert denormalized columns to measurements array
                measurements = []
                measurement_types = [
                    'chest', 'waist', 'hip', 'shoulder_breadth', 
                    'arm_length', 'bicep', 'leg_length', 'thigh', 'height'
                ]
                
                for mtype in measurement_types:
                    min_key = f"{mtype}_min"
                    max_key = f"{mtype}_max"
                    min_val = size_dict.get(min_key)
                    max_val = size_dict.get(max_key)
                    
                    if min_val is not None or max_val is not None:
                        measurements.append({
                            'type': mtype,
                            'min': min_val,
                            'max': max_val,
                            'optimal': (min_val + max_val) / 2 if min_val and max_val else None,
                            'tolerance': 2.0,  # Default tolerance
                            'weight': 1.0      # Default weight
                        })
                
                sizes.append({
                    'size_id': size_dict['size_id'],
                    'size_label': size_dict['size_label'],
                    'size_order': size_dict['size_order'],
                    'measurements': measurements
                })
            
            return sizes
    
    # ========================================================================
    # CATEGORY MEASUREMENTS (SIMPLIFIED - NO SEPARATE TABLE)
    # ========================================================================
    
    def get_category_measurement_requirements(self, category_id: int) -> List[Dict]:
        """
        Get measurement requirements for a category
        
        NOTE: In simplified schema, this returns default requirements
        based on category type (not stored in database)
        """
        # Get category info
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT category_name FROM garment_categories WHERE category_id = ?
            """, (category_id,))
            result = cursor.fetchone()
            
            if not result:
                return []
            
            category_name = result[0].lower()
        
        # Return default requirements based on category
        # This replaces the category_measurements table
        if 't-shirt' in category_name or 'shirt' in category_name or 'blouse' in category_name:
            return [
                {'measurement_type': 'chest', 'importance_weight': 1.0, 'is_required': True},
                {'measurement_type': 'shoulder_breadth', 'importance_weight': 0.8, 'is_required': False},
                {'measurement_type': 'waist', 'importance_weight': 0.6, 'is_required': False}
            ]
        elif 'jeans' in category_name or 'pants' in category_name or 'trousers' in category_name:
            return [
                {'measurement_type': 'waist', 'importance_weight': 1.0, 'is_required': True},
                {'measurement_type': 'hip', 'importance_weight': 0.9, 'is_required': True},
                {'measurement_type': 'leg_length', 'importance_weight': 0.7, 'is_required': False}
            ]
        elif 'dress' in category_name or 'skirt' in category_name:
            return [
                {'measurement_type': 'chest', 'importance_weight': 1.0, 'is_required': True},
                {'measurement_type': 'waist', 'importance_weight': 1.0, 'is_required': True},
                {'measurement_type': 'hip', 'importance_weight': 0.9, 'is_required': True}
            ]
        elif 'jacket' in category_name or 'coat' in category_name:
            return [
                {'measurement_type': 'chest', 'importance_weight': 1.0, 'is_required': True},
                {'measurement_type': 'shoulder_breadth', 'importance_weight': 0.9, 'is_required': True},
                {'measurement_type': 'arm_length', 'importance_weight': 0.8, 'is_required': False}
            ]
        else:
            # Default: chest and waist
            return [
                {'measurement_type': 'chest', 'importance_weight': 1.0, 'is_required': True},
                {'measurement_type': 'waist', 'importance_weight': 0.8, 'is_required': False}
            ]
    
    # ========================================================================
    # USER MEASUREMENTS
    # ========================================================================
    
    def save_user_measurements(self, measurements: Dict[str, float], 
                              user_identifier: str = None,
                              gender: str = None,
                              measured_at: str = None) -> int:
        """Save user body measurements"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            if measured_at:
                from datetime import datetime
                dt = datetime.fromisoformat(measured_at.replace('Z', '+00:00'))
                timestamp_str = dt.strftime('%Y-%m-%d %H:%M:%S')
                
                cursor.execute("""
                    INSERT INTO user_measurements 
                    (user_identifier, height, chest, waist, hip, shoulder_breadth, 
                     shoulder_to_crotch, arm_length, bicep, forearm, wrist, 
                     leg_length, thigh, calf, ankle, gender, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    user_identifier,
                    measurements.get('height'), measurements.get('chest'),
                    measurements.get('waist'), measurements.get('hip'),
                    measurements.get('shoulder_breadth'), measurements.get('shoulder_to_crotch'),
                    measurements.get('arm_length'), measurements.get('bicep'),
                    measurements.get('forearm'), measurements.get('wrist'),
                    measurements.get('leg_length'), measurements.get('thigh'),
                    measurements.get('calf'), measurements.get('ankle'),
                    gender, timestamp_str
                ))
            else:
                cursor.execute("""
                    INSERT INTO user_measurements 
                    (user_identifier, height, chest, waist, hip, shoulder_breadth, 
                     shoulder_to_crotch, arm_length, bicep, forearm, wrist, 
                     leg_length, thigh, calf, ankle, gender)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    user_identifier,
                    measurements.get('height'), measurements.get('chest'),
                    measurements.get('waist'), measurements.get('hip'),
                    measurements.get('shoulder_breadth'), measurements.get('shoulder_to_crotch'),
                    measurements.get('arm_length'), measurements.get('bicep'),
                    measurements.get('forearm'), measurements.get('wrist'),
                    measurements.get('leg_length'), measurements.get('thigh'),
                    measurements.get('calf'), measurements.get('ankle'),
                    gender
                ))
            return cursor.lastrowid
    
    def get_latest_user_measurements(self, user_identifier: str = 'default', 
                                     max_age_days: int = 90) -> Optional[Dict]:
        """Get most recent user measurements"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM user_measurements
                WHERE user_identifier = ? 
                AND datetime(created_at) >= datetime('now', '-' || ? || ' days')
                ORDER BY created_at DESC
                LIMIT 1
            """, (user_identifier, max_age_days))
            
            result = cursor.fetchone()
            if result:
                data = dict(result)
                measurements = {
                    'height': data.get('height'), 'chest': data.get('chest'),
                    'waist': data.get('waist'), 'hip': data.get('hip'),
                    'shoulder_breadth': data.get('shoulder_breadth'),
                    'shoulder_to_crotch': data.get('shoulder_to_crotch'),
                    'arm_length': data.get('arm_length'), 'bicep': data.get('bicep'),
                    'forearm': data.get('forearm'), 'wrist': data.get('wrist'),
                    'leg_length': data.get('leg_length'), 'thigh': data.get('thigh'),
                    'calf': data.get('calf'), 'ankle': data.get('ankle')
                }
                measurements = {k: v for k, v in measurements.items() if v is not None}
                
                return {
                    'user_id': data['user_id'],
                    'measurements': measurements,
                    'gender': data.get('gender'),
                    'unit': data.get('unit', 'cm'),
                    'measured_at': data['created_at']
                }
            return None
    
    def get_all_user_measurements(self, user_identifier: str = 'default') -> List[Dict]:
        """Get all measurements for a user, ordered by most recent first"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM user_measurements
                WHERE user_identifier = ?
                ORDER BY created_at DESC
            """, (user_identifier,))
            return [dict(row) for row in cursor.fetchall()]
    
    def clear_all_data(self):
        """Clear all data from database (for testing)"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            tables = ['user_measurements', 'sizes', 'size_charts', 
                     'garment_categories', 'brands']
            for table in tables:
                cursor.execute(f"DELETE FROM {table}")
            logger.warning("⚠️  All data cleared from database")


# Create singleton instance that can be imported
db_manager = DatabaseManager()
