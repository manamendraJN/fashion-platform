"""
Admin/Database Overview Routes
Provides endpoints for viewing database contents
"""

from flask import Blueprint, jsonify, request
from database.db_manager import db_manager

# Create blueprint
admin_bp = Blueprint('admin', __name__)


@admin_bp.route('/database-overview', methods=['GET'])
def database_overview():
    """
    Get complete database overview with all brands, categories, size charts, and sizes
    """
    try:
        # Get brands
        brands = db_manager.get_brands()
        
        # Get categories
        categories = db_manager.get_categories()
        
        # Get all size charts with details
        size_charts = []
        with db_manager.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT 
                    sc.chart_id,
                    sc.brand_id,
                    b.brand_name,
                    sc.category_id,
                    gc.category_name,
                    gc.gender,
                    sc.fit_type,
                    sc.chart_name,
                    sc.is_active,
                    sc.created_at,
                    COUNT(s.size_id) as size_count
                FROM size_charts sc
                JOIN brands b ON sc.brand_id = b.brand_id
                JOIN garment_categories gc ON sc.category_id = gc.category_id
                LEFT JOIN sizes s ON sc.chart_id = s.chart_id
                GROUP BY sc.chart_id
                ORDER BY b.brand_name, gc.category_name
            """)
            size_charts = [dict(row) for row in cursor.fetchall()]
        
        # Get total counts
        with db_manager.get_connection() as conn:
            cursor = conn.cursor()
            
            # Total sizes
            cursor.execute("SELECT COUNT(*) as count FROM sizes")
            total_sizes = dict(cursor.fetchone())['count']
            
            # Sizes with measurements
            cursor.execute("""
                SELECT COUNT(*) as count FROM sizes
                WHERE chest_min IS NOT NULL OR waist_min IS NOT NULL OR hip_min IS NOT NULL
            """)
            sizes_with_measurements = dict(cursor.fetchone())['count']
            
            # User measurements
            cursor.execute("SELECT COUNT(*) as count FROM user_measurements")
            total_users = dict(cursor.fetchone())['count']
        
        # Get sample sizes (first 50 for preview)
        sample_sizes = []
        with db_manager.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT 
                    s.size_id,
                    s.chart_id,
                    s.size_label,
                    s.size_order,
                    b.brand_name,
                    gc.category_name,
                    gc.gender,
                    s.chest_min, s.chest_max,
                    s.waist_min, s.waist_max,
                    s.hip_min, s.hip_max,
                    s.shoulder_breadth_min, s.shoulder_breadth_max,
                    s.leg_length_min, s.leg_length_max
                FROM sizes s
                JOIN size_charts sc ON s.chart_id = sc.chart_id
                JOIN brands b ON sc.brand_id = b.brand_id
                JOIN garment_categories gc ON sc.category_id = gc.category_id
                ORDER BY b.brand_name, gc.category_name, s.size_order
                LIMIT 50
            """)
            sample_sizes = [dict(row) for row in cursor.fetchall()]
        
        return jsonify({
            'success': True,
            'data': {
                'summary': {
                    'total_brands': len(brands),
                    'total_categories': len(categories),
                    'total_size_charts': len(size_charts),
                    'total_sizes': total_sizes,
                    'sizes_with_measurements': sizes_with_measurements,
                    'total_users': total_users
                },
                'brands': brands,
                'categories': categories,
                'size_charts': size_charts,
                'sample_sizes': sample_sizes
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@admin_bp.route('/size-chart/<int:chart_id>', methods=['GET'])
def get_size_chart_details(chart_id):
    """
    Get detailed information about a specific size chart including all sizes
    """
    try:
        # Get size chart info
        with db_manager.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT 
                    sc.*,
                    b.brand_name,
                    b.size_system,
                    gc.category_name,
                    gc.gender
                FROM size_charts sc
                JOIN brands b ON sc.brand_id = b.brand_id
                JOIN garment_categories gc ON sc.category_id = gc.category_id
                WHERE sc.chart_id = ?
            """, (chart_id,))
            chart = dict(cursor.fetchone()) if cursor.fetchone() else None
            
            if not chart:
                return jsonify({
                    'success': False,
                    'error': 'Size chart not found'
                }), 404
        
        # Get all sizes for this chart
        sizes = db_manager.get_sizes_for_chart(chart_id)
        
        return jsonify({
            'success': True,
            'data': {
                'chart': chart,
                'sizes': sizes
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@admin_bp.route('/brands/<int:brand_id>/charts', methods=['GET'])
def get_brand_charts(brand_id):
    """
    Get all size charts for a specific brand
    """
    try:
        with db_manager.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT 
                    sc.chart_id,
                    sc.brand_id,
                    b.brand_name,
                    sc.category_id,
                    gc.category_name,
                    gc.gender,
                    sc.fit_type,
                    sc.chart_name,
                    COUNT(s.size_id) as size_count
                FROM size_charts sc
                JOIN brands b ON sc.brand_id = b.brand_id
                JOIN garment_categories gc ON sc.category_id = gc.category_id
                LEFT JOIN sizes s ON sc.chart_id = s.chart_id
                WHERE sc.brand_id = ?
                GROUP BY sc.chart_id
                ORDER BY gc.category_name
            """, (brand_id,))
            charts = [dict(row) for row in cursor.fetchall()]
        
        return jsonify({
            'success': True,
            'data': charts
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ============= CREATE ENDPOINTS =============

@admin_bp.route('/brands', methods=['POST'])
def create_brand():
    """
    Create a new brand
    Expected JSON: {
        "brand_name": "Brand Name",
        "country": "USA",
        "size_system": "US",
        "website": "https://example.com"
    }
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data or 'brand_name' not in data:
            return jsonify({
                'success': False,
                'error': 'brand_name is required'
            }), 400
        
        brand_name = data['brand_name'].strip()
        country = data.get('country', '').strip()
        size_system = data.get('size_system', 'US').strip()
        website = data.get('website', '').strip()
        
        if not brand_name:
            return jsonify({
                'success': False,
                'error': 'brand_name cannot be empty'
            }), 400
        
        # Check if brand already exists
        existing_brands = db_manager.get_brands()
        if any(b['brand_name'].lower() == brand_name.lower() for b in existing_brands):
            return jsonify({
                'success': False,
                'error': f'Brand "{brand_name}" already exists'
            }), 409
        
        # Insert brand
        brand_id = db_manager.insert_brand(
            brand_name=brand_name,
            country=country if country else None,
            size_system=size_system,
            website=website if website else None
        )
        
        return jsonify({
            'success': True,
            'message': f'Brand "{brand_name}" created successfully',
            'data': {
                'brand_id': brand_id,
                'brand_name': brand_name,
                'country': country,
                'size_system': size_system,
                'website': website
            }
        }), 201
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@admin_bp.route('/categories', methods=['POST'])
def create_category():
    """
    Create a new garment category
    Expected JSON: {
        "category_name": "Category Name",
        "gender": "Men",
        "description": "Description"
    }
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data or 'category_name' not in data:
            return jsonify({
                'success': False,
                'error': 'category_name is required'
            }), 400
        
        category_name = data['category_name'].strip()
        gender = data.get('gender', '').strip()
        description = data.get('description', '').strip()
        
        if not category_name:
            return jsonify({
                'success': False,
                'error': 'category_name cannot be empty'
            }), 400
        
        # Validate gender
        valid_genders = ['Men', 'Women', 'Unisex', '']
        if gender and gender not in valid_genders:
            return jsonify({
                'success': False,
                'error': f'Gender must be one of: {", ".join(valid_genders[:-1])}'
            }), 400
        
        # Check if category already exists
        existing_categories = db_manager.get_categories()
        if any(c['category_name'].lower() == category_name.lower() and 
               c.get('gender', '').lower() == gender.lower() 
               for c in existing_categories):
            return jsonify({
                'success': False,
                'error': f'Category "{category_name}" ({gender}) already exists'
            }), 409
        
        # Insert category
        category_id = db_manager.insert_category(
            category_name=category_name,
            gender=gender if gender else None,
            description=description if description else None
        )
        
        return jsonify({
            'success': True,
            'message': f'Category "{category_name}" created successfully',
            'data': {
                'category_id': category_id,
                'category_name': category_name,
                'gender': gender,
                'description': description
            }
        }), 201
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@admin_bp.route('/size-charts', methods=['POST'])
def create_size_chart():
    """
    Create a new size chart
    Expected JSON: {
        "brand_id": 1,
        "category_id": 1,
        "fit_type": "Regular",
        "notes": "Optional notes"
    }
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data:
            return jsonify({
                'success': False,
                'error': 'Request body is required'
            }), 400
            
        if 'brand_id' not in data or 'category_id' not in data:
            return jsonify({
                'success': False,
                'error': 'brand_id and category_id are required'
            }), 400
        
        brand_id = data['brand_id']
        category_id = data['category_id']
        fit_type = data.get('fit_type', 'Regular').strip()
        notes = data.get('notes', '').strip()
        
        # Validate brand exists
        brands = db_manager.get_brands()
        if not any(b['brand_id'] == brand_id for b in brands):
            return jsonify({
                'success': False,
                'error': f'Brand with ID {brand_id} does not exist'
            }), 404
        
        # Validate category exists
        categories = db_manager.get_categories()
        if not any(c['category_id'] == category_id for c in categories):
            return jsonify({
                'success': False,
                'error': f'Category with ID {category_id} does not exist'
            }), 404
        
        # Check if size chart already exists
        with db_manager.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT chart_id FROM size_charts 
                WHERE brand_id = ? AND category_id = ? AND fit_type = ?
            """, (brand_id, category_id, fit_type))
            existing = cursor.fetchone()
            
            if existing:
                return jsonify({
                    'success': False,
                    'error': 'Size chart with same brand, category, and fit type already exists'
                }), 409
        
        # Insert size chart
        chart_id = db_manager.insert_size_chart(
            brand_id=brand_id,
            category_id=category_id,
            fit_type=fit_type,
            notes=notes if notes else None
        )
        
        return jsonify({
            'success': True,
            'message': 'Size chart created successfully',
            'data': {
                'chart_id': chart_id,
                'brand_id': brand_id,
                'category_id': category_id,
                'fit_type': fit_type,
                'notes': notes
            }
        }), 201
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@admin_bp.route('/sizes', methods=['POST'])
def create_size():
    """
    Create a new size
    Expected JSON: {
        "chart_id": 1,
        "size_label": "M",
        "size_order": 2,
        "measurements": {
            "chest": [85, 90],
            "waist": [75, 80],
            "hip": [90, 95]
        }
    }
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data:
            return jsonify({
                'success': False,
                'error': 'Request body is required'
            }), 400
            
        if 'chart_id' not in data or 'size_label' not in data:
            return jsonify({
                'success': False,
                'error': 'chart_id and size_label are required'
            }), 400
        
        chart_id = data['chart_id']
        size_label = data['size_label'].strip()
        size_order = data.get('size_order', 0)
        measurements = data.get('measurements', {})
        
        if not size_label:
            return jsonify({
                'success': False,
                'error': 'size_label cannot be empty'
            }), 400
        
        # Validate chart exists
        with db_manager.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT chart_id FROM size_charts WHERE chart_id = ?", (chart_id,))
            if not cursor.fetchone():
                return jsonify({
                    'success': False,
                    'error': f'Size chart with ID {chart_id} does not exist'
                }), 404
            
            # Check if size already exists in this chart
            cursor.execute("""
                SELECT size_id FROM sizes 
                WHERE chart_id = ? AND size_label = ?
            """, (chart_id, size_label))
            if cursor.fetchone():
                return jsonify({
                    'success': False,
                    'error': f'Size "{size_label}" already exists in this chart'
                }), 409
        
        # Convert measurements format
        measurements_dict = {}
        for key, value in measurements.items():
            if isinstance(value, list) and len(value) == 2:
                measurements_dict[key] = tuple(value)
        
        # Insert size
        size_id = db_manager.insert_size(
            chart_id=chart_id,
            size_label=size_label,
            size_order=size_order,
            measurements=measurements_dict
        )
        
        return jsonify({
            'success': True,
            'message': f'Size "{size_label}" created successfully',
            'data': {
                'size_id': size_id,
                'chart_id': chart_id,
                'size_label': size_label,
                'size_order': size_order,
                'measurements': measurements_dict
            }
        }), 201
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@admin_bp.route('/comprehensive-view', methods=['GET'])
def comprehensive_view():
    """
    Get comprehensive view showing all brands, their categories, sizes, and measurements
    in a unified table format with gender distribution
    """
    try:
        with db_manager.get_connection() as conn:
            cursor = conn.cursor()
            
            # Get comprehensive data with all details
            cursor.execute("""
                SELECT 
                    b.brand_id,
                    b.brand_name,
                    b.brand_country as country,
                    b.size_system,
                    gc.category_id,
                    gc.category_name,
                    gc.gender,
                    sc.chart_id,
                    sc.fit_type,
                    s.size_id,
                    s.size_label,
                    s.size_order,
                    s.chest_min,
                    s.chest_max,
                    s.waist_min,
                    s.waist_max,
                    s.hip_min,
                    s.hip_max,
                    s.shoulder_breadth_min,
                    s.shoulder_breadth_max,
                    s.arm_length_min,
                    s.arm_length_max,
                    s.bicep_min,
                    s.bicep_max,
                    s.leg_length_min,
                    s.leg_length_max,
                    s.thigh_min,
                    s.thigh_max,
                    s.height_min,
                    s.height_max
                FROM brands b
                LEFT JOIN size_charts sc ON b.brand_id = sc.brand_id
                LEFT JOIN garment_categories gc ON sc.category_id = gc.category_id
                LEFT JOIN sizes s ON sc.chart_id = s.chart_id
                ORDER BY b.brand_name, gc.gender, gc.category_name, s.size_order
            """)
            
            rows = [dict(row) for row in cursor.fetchall()]
            
            # Calculate gender distribution
            cursor.execute("""
                SELECT 
                    b.brand_name,
                    gc.gender,
                    COUNT(DISTINCT gc.category_id) as category_count,
                    COUNT(s.size_id) as size_count
                FROM brands b
                LEFT JOIN size_charts sc ON b.brand_id = sc.brand_id
                LEFT JOIN garment_categories gc ON sc.category_id = gc.category_id
                LEFT JOIN sizes s ON sc.chart_id = s.chart_id
                WHERE gc.gender IS NOT NULL
                GROUP BY b.brand_name, gc.gender
                ORDER BY b.brand_name, gc.gender
            """)
            
            gender_distribution = [dict(row) for row in cursor.fetchall()]
            
            # Get summary by brand
            cursor.execute("""
                SELECT 
                    b.brand_id,
                    b.brand_name,
                    b.brand_country as country,
                    b.size_system,
                    COUNT(DISTINCT sc.category_id) as total_categories,
                    COUNT(DISTINCT s.size_id) as total_sizes,
                    COUNT(DISTINCT CASE WHEN gc.gender = 'Men' THEN gc.category_id END) as men_categories,
                    COUNT(DISTINCT CASE WHEN gc.gender = 'Women' THEN gc.category_id END) as women_categories,
                    COUNT(DISTINCT CASE WHEN gc.gender = 'Unisex' THEN gc.category_id END) as unisex_categories
                FROM brands b
                LEFT JOIN size_charts sc ON b.brand_id = sc.brand_id
                LEFT JOIN garment_categories gc ON sc.category_id = gc.category_id
                LEFT JOIN sizes s ON sc.chart_id = s.chart_id
                GROUP BY b.brand_id, b.brand_name, b.brand_country, b.size_system
                ORDER BY b.brand_name
            """)
            
            brand_summary = [dict(row) for row in cursor.fetchall()]
        
        return jsonify({
            'success': True,
            'data': {
                'comprehensive_data': rows,
                'gender_distribution': gender_distribution,
                'brand_summary': brand_summary
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ============= DELETE ENDPOINTS =============

@admin_bp.route('/brands/<int:brand_id>', methods=['DELETE'])
def delete_brand(brand_id):
    """
    Delete a brand and all associated size charts and sizes
    """
    try:
        with db_manager.get_connection() as conn:
            cursor = conn.cursor()
            
            # Check if brand exists
            cursor.execute("SELECT brand_name FROM brands WHERE brand_id = ?", (brand_id,))
            brand = cursor.fetchone()
            if not brand:
                return jsonify({
                    'success': False,
                    'error': f'Brand with ID {brand_id} not found'
                }), 404
            
            brand_name = dict(brand)['brand_name']
            
            # Count associated data before deletion
            cursor.execute("""
                SELECT COUNT(*) as count FROM size_charts WHERE brand_id = ?
            """, (brand_id,))
            chart_count = dict(cursor.fetchone())['count']
            
            cursor.execute("""
                SELECT COUNT(*) as count FROM sizes s
                JOIN size_charts sc ON s.chart_id = sc.chart_id
                WHERE sc.brand_id = ?
            """, (brand_id,))
            size_count = dict(cursor.fetchone())['count']
            
            # Delete sizes first (child of size_charts)
            cursor.execute("""
                DELETE FROM sizes WHERE chart_id IN (
                    SELECT chart_id FROM size_charts WHERE brand_id = ?
                )
            """, (brand_id,))
            
            # Delete size charts (child of brand)
            cursor.execute("DELETE FROM size_charts WHERE brand_id = ?", (brand_id,))
            
            # Delete brand
            cursor.execute("DELETE FROM brands WHERE brand_id = ?", (brand_id,))
            
            conn.commit()
            
            return jsonify({
                'success': True,
                'message': f'Brand "{brand_name}" deleted successfully',
                'data': {
                    'deleted_size_charts': chart_count,
                    'deleted_sizes': size_count
                }
            }), 200
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@admin_bp.route('/categories/<int:category_id>', methods=['DELETE'])
def delete_category(category_id):
    """
    Delete a category and all associated size charts and sizes
    """
    try:
        with db_manager.get_connection() as conn:
            cursor = conn.cursor()
            
            # Check if category exists
            cursor.execute("SELECT category_name FROM garment_categories WHERE category_id = ?", (category_id,))
            category = cursor.fetchone()
            if not category:
                return jsonify({
                    'success': False,
                    'error': f'Category with ID {category_id} not found'
                }), 404
            
            category_name = dict(category)['category_name']
            
            # Count associated data
            cursor.execute("""
                SELECT COUNT(*) as count FROM size_charts WHERE category_id = ?
            """, (category_id,))
            chart_count = dict(cursor.fetchone())['count']
            
            cursor.execute("""
                SELECT COUNT(*) as count FROM sizes s
                JOIN size_charts sc ON s.chart_id = sc.chart_id
                WHERE sc.category_id = ?
            """, (category_id,))
            size_count = dict(cursor.fetchone())['count']
            
            # Delete sizes first
            cursor.execute("""
                DELETE FROM sizes WHERE chart_id IN (
                    SELECT chart_id FROM size_charts WHERE category_id = ?
                )
            """, (category_id,))
            
            # Delete size charts
            cursor.execute("DELETE FROM size_charts WHERE category_id = ?", (category_id,))
            
            # Delete category
            cursor.execute("DELETE FROM garment_categories WHERE category_id = ?", (category_id,))
            
            conn.commit()
            
            return jsonify({
                'success': True,
                'message': f'Category "{category_name}" deleted successfully',
                'data': {
                    'deleted_size_charts': chart_count,
                    'deleted_sizes': size_count
                }
            }), 200
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@admin_bp.route('/size-charts/<int:chart_id>', methods=['DELETE'])
def delete_size_chart(chart_id):
    """
    Delete a size chart and all associated sizes
    """
    try:
        with db_manager.get_connection() as conn:
            cursor = conn.cursor()
            
            # Check if size chart exists and get details
            cursor.execute("""
                SELECT sc.chart_id, b.brand_name, gc.category_name
                FROM size_charts sc
                JOIN brands b ON sc.brand_id = b.brand_id
                JOIN garment_categories gc ON sc.category_id = gc.category_id
                WHERE sc.chart_id = ?
            """, (chart_id,))
            chart = cursor.fetchone()
            if not chart:
                return jsonify({
                    'success': False,
                    'error': f'Size chart with ID {chart_id} not found'
                }), 404
            
            chart_info = dict(chart)
            
            # Count sizes
            cursor.execute("SELECT COUNT(*) as count FROM sizes WHERE chart_id = ?", (chart_id,))
            size_count = dict(cursor.fetchone())['count']
            
            # Delete sizes first
            cursor.execute("DELETE FROM sizes WHERE chart_id = ?", (chart_id,))
            
            # Delete size chart
            cursor.execute("DELETE FROM size_charts WHERE chart_id = ?", (chart_id,))
            
            conn.commit()
            
            return jsonify({
                'success': True,
                'message': f'Size chart for {chart_info["brand_name"]} - {chart_info["category_name"]} deleted successfully',
                'data': {
                    'deleted_sizes': size_count
                }
            }), 200
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@admin_bp.route('/sizes/<int:size_id>', methods=['DELETE'])
def delete_size(size_id):
    """
    Delete a specific size
    """
    try:
        with db_manager.get_connection() as conn:
            cursor = conn.cursor()
            
            # Check if size exists
            cursor.execute("""
                SELECT s.size_label, b.brand_name, gc.category_name
                FROM sizes s
                JOIN size_charts sc ON s.chart_id = sc.chart_id
                JOIN brands b ON sc.brand_id = b.brand_id
                JOIN garment_categories gc ON sc.category_id = gc.category_id
                WHERE s.size_id = ?
            """, (size_id,))
            size = cursor.fetchone()
            if not size:
                return jsonify({
                    'success': False,
                    'error': f'Size with ID {size_id} not found'
                }), 404
            
            size_info = dict(size)
            
            # Delete size
            cursor.execute("DELETE FROM sizes WHERE size_id = ?", (size_id,))
            
            conn.commit()
            
            return jsonify({
                'success': True,
                'message': f'Size "{size_info["size_label"]}" deleted from {size_info["brand_name"]} - {size_info["category_name"]}'
            }), 200
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
