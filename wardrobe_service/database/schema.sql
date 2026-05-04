-- ============================================================================
-- SIMPLIFIED 5-TABLE DATABASE SCHEMA
-- Fashion Intelligence Platform - Size Matching System
-- ============================================================================
-- 
-- DESIGN PHILOSOPHY:
-- - Reduced from 8 tables to 5 tables for easier management
-- - Denormalized measurements into sizes table (trade redundancy for simplicity)
-- - Removed complex mapping tables (category_measurements, size_measurements)
-- - Kept only essential tables for core functionality
--
-- THE 5 TABLES:
--   1. brands - Clothing brands (Nike, Zara, H&M, etc.)
--   2. garment_categories - Types of clothing (T-Shirt, Jeans, Dress)
--   3. size_charts - Links brands to garment categories (Nike Men's T-Shirt)
--   4. sizes - Size labels WITH measurements as columns (denormalized)
--   5. user_measurements - User body measurements
-- ============================================================================

-- ============================================================================
-- TABLE 1: BRANDS
-- Purpose: Store clothing brand information
-- ============================================================================
CREATE TABLE IF NOT EXISTS brands (
    brand_id INTEGER PRIMARY KEY AUTOINCREMENT,
    brand_name VARCHAR(100) NOT NULL UNIQUE,
    brand_country VARCHAR(50),        -- 'USA', 'UK', 'EU', 'Asia'
    size_system VARCHAR(20),          -- 'US', 'UK', 'EU', 'International'
    website_url VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TABLE 2: GARMENT CATEGORIES
-- Purpose: Define types of garments (T-Shirt, Jeans, Dress, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS garment_categories (
    category_id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_name VARCHAR(50) NOT NULL,  -- 'T-Shirt', 'Jeans', 'Dress', 'Jacket'
    gender VARCHAR(20) NOT NULL,         -- 'Men', 'Women', 'Unisex'
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category_name, gender)
);

-- ============================================================================
-- TABLE 3: SIZE CHARTS
-- Purpose: Link brands to garment categories (Bridge table)
-- Example: Nike + Men's T-Shirt + Regular fit = Chart #1
-- ============================================================================
CREATE TABLE IF NOT EXISTS size_charts (
    chart_id INTEGER PRIMARY KEY AUTOINCREMENT,
    brand_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    chart_name VARCHAR(100),             -- Optional: "Nike Men's Athletic Shirts"
    fit_type VARCHAR(30) DEFAULT 'Regular', -- 'Regular', 'Slim', 'Relaxed', 'Athletic'
    notes TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (brand_id) REFERENCES brands(brand_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES garment_categories(category_id) ON DELETE CASCADE,
    UNIQUE(brand_id, category_id, fit_type)
);

-- ============================================================================
-- TABLE 4: SIZES (DENORMALIZED - MEASUREMENTS AS COLUMNS)
-- Purpose: Store size labels AND body measurements in one table
-- ============================================================================
-- DESIGN DECISION: Instead of separate size_measurements table, measurements
-- are stored as columns (min/max pairs). This trades normalization for simplicity.
--
-- Different garment types use different measurement columns:
--   - T-Shirts: chest, shoulder_breadth, waist
--   - Jeans: waist, hip, leg_length
--   - Dresses: chest (bust), waist, hip
--   - Jackets: chest, shoulder_breadth, arm_length
--   - Unused columns are NULL
-- ============================================================================
CREATE TABLE IF NOT EXISTS sizes (
    size_id INTEGER PRIMARY KEY AUTOINCREMENT,
    chart_id INTEGER NOT NULL,
    size_label VARCHAR(20) NOT NULL,     -- 'XS', 'S', 'M', 'L', 'XL', '28', '30', '32'
    size_order INTEGER NOT NULL,         -- Ordering: 1=smallest, increasing
    
    -- Body measurements (all in centimeters, min-max ranges)
    -- Core measurements (most common)
    chest_min REAL,                      -- Chest/Bust circumference minimum
    chest_max REAL,                      -- Chest/Bust circumference maximum
    waist_min REAL,                      -- Waist circumference minimum
    waist_max REAL,                      -- Waist circumference maximum
    hip_min REAL,                        -- Hip circumference minimum
    hip_max REAL,                        -- Hip circumference maximum
    
    -- Upper body measurements
    shoulder_breadth_min REAL,           -- Shoulder width minimum
    shoulder_breadth_max REAL,           -- Shoulder width maximum
    arm_length_min REAL,                 -- Arm length minimum
    arm_length_max REAL,                 -- Arm length maximum
    bicep_min REAL,                      -- Bicep circumference minimum
    bicep_max REAL,                      -- Bicep circumference maximum
    
    -- Lower body measurements
    leg_length_min REAL,                 -- Inseam/leg length minimum
    leg_length_max REAL,                 -- Inseam/leg length maximum
    thigh_min REAL,                      -- Thigh circumference minimum
    thigh_max REAL,                      -- Thigh circumference maximum
    
    -- Vertical measurements
    height_min REAL,                     -- Recommended height minimum
    height_max REAL,                     -- Recommended height maximum
    
    -- Notes and metadata
    notes TEXT,                          -- Special fitting notes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (chart_id) REFERENCES size_charts(chart_id) ON DELETE CASCADE,
    UNIQUE(chart_id, size_label)
);

-- ============================================================================
-- TABLE 5: USER MEASUREMENTS
-- Purpose: Store user body measurements for quick reference
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_measurements (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_identifier VARCHAR(255),        -- Email, username, or 'anonymous'
    
    -- Body measurements (all in centimeters by default)
    height REAL,
    chest REAL,                          -- Chest/Bust circumference
    waist REAL,                          -- Waist circumference
    hip REAL,                            -- Hip circumference
    shoulder_breadth REAL,               -- Shoulder width
    shoulder_to_crotch REAL,             -- Torso length
    arm_length REAL,                     -- Arm length
    bicep REAL,                          -- Bicep circumference
    forearm REAL,                        -- Forearm circumference
    wrist REAL,                          -- Wrist circumference
    leg_length REAL,                     -- Inseam/leg length
    thigh REAL,                          -- Thigh circumference
    calf REAL,                           -- Calf circumference
    ankle REAL,                          -- Ankle circumference
    
    -- Metadata
    gender VARCHAR(20),                  -- 'Men', 'Women', 'Unisex'
    unit VARCHAR(10) DEFAULT 'cm',       -- 'cm' or 'inches'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_size_charts_brand ON size_charts(brand_id);
CREATE INDEX IF NOT EXISTS idx_size_charts_category ON size_charts(category_id);
CREATE INDEX IF NOT EXISTS idx_size_charts_lookup ON size_charts(brand_id, category_id, fit_type);
CREATE INDEX IF NOT EXISTS idx_sizes_chart ON sizes(chart_id);
CREATE INDEX IF NOT EXISTS idx_sizes_label ON sizes(size_label);
CREATE INDEX IF NOT EXISTS idx_user_measurements_identifier ON user_measurements(user_identifier);

-- ============================================================================
-- HELPFUL VIEWS
-- ============================================================================

-- View: Complete size chart with all details in one query
CREATE VIEW IF NOT EXISTS v_complete_size_chart AS
SELECT 
    sc.chart_id,
    b.brand_id,
    b.brand_name,
    b.size_system,
    gc.category_id,
    gc.category_name,
    gc.gender,
    sc.fit_type,
    s.size_id,
    s.size_label,
    s.size_order,
    s.chest_min, s.chest_max,
    s.waist_min, s.waist_max,
    s.hip_min, s.hip_max,
    s.shoulder_breadth_min, s.shoulder_breadth_max,
    s.arm_length_min, s.arm_length_max,
    s.leg_length_min, s.leg_length_max,
    s.height_min, s.height_max
FROM size_charts sc
JOIN brands b ON sc.brand_id = b.brand_id
JOIN garment_categories gc ON sc.category_id = gc.category_id
JOIN sizes s ON sc.chart_id = s.chart_id
WHERE sc.is_active = 1
ORDER BY b.brand_name, gc.category_name, s.size_order;

-- View: Brand summary
CREATE VIEW IF NOT EXISTS v_brand_summary AS
SELECT 
    b.brand_id,
    b.brand_name,
    b.size_system,
    COUNT(DISTINCT sc.chart_id) as total_charts,
    COUNT(DISTINCT gc.category_id) as total_categories,
    COUNT(DISTINCT s.size_id) as total_sizes
FROM brands b
LEFT JOIN size_charts sc ON b.brand_id = sc.brand_id
LEFT JOIN garment_categories gc ON sc.category_id = gc.category_id
LEFT JOIN sizes s ON sc.chart_id = s.chart_id
GROUP BY b.brand_id;

-- ============================================================================
-- SAMPLE DATA QUERIES
-- ============================================================================

-- Query to find best size for a user:
-- 
-- SELECT s.size_label, s.size_order,
--        s.chest_min, s.chest_max, s.waist_min, s.waist_max
-- FROM sizes s
-- JOIN size_charts sc ON s.chart_id = sc.chart_id
-- WHERE sc.brand_id = ? AND sc.category_id = ? AND sc.fit_type = 'Regular'
--   AND s.chest_min <= ? AND s.chest_max >= ?
--   AND s.waist_min <= ? AND s.waist_max >= ?
-- ORDER BY s.size_order;

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================
-- To migrate from 8-table schema to this 5-table schema:
--
-- 1. Keep: brands, garment_categories, size_charts, user_measurements (no changes)
-- 2. Transform: Merge sizes + size_measurements into new sizes table
-- 3. Remove: category_measurements, recommendation_log (optional tables)
--
-- See migration script: migrate_to_5_tables.py
-- ============================================================================
