"""
Size Chart Web Scraper Template
A starting point for automating size chart data collection

IMPORTANT: 
- Always respect robots.txt and website terms of service
- Add delays between requests to avoid overloading servers
- For research purposes only
- Verify scraped data manually before adding to database
"""

import requests
from bs4 import BeautifulSoup
import pandas as pd
import time
import json
from typing import Dict, List, Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SizeChartScraper:
    """Template for scraping size charts from brand websites"""
    
    def __init__(self, delay: float = 2.0):
        """
        Initialize scraper
        
        Args:
            delay: Seconds to wait between requests (be respectful!)
        """
        self.delay = delay
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Research Bot) Fashion Intelligence Platform'
        })
    
    def scrape_generic_table(self, url: str, brand_name: str) -> Optional[pd.DataFrame]:
        """
        Attempt to scrape a generic HTML table
        
        Args:
            url: URL of the size chart page
            brand_name: Name of the brand
        
        Returns:
            DataFrame with scraped data, or None if failed
        """
        try:
            logger.info(f"Fetching {brand_name} size chart from {url}")
            
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Common class names for size chart tables
            table_classes = [
                'size-chart', 'size-guide', 'sizing-table', 
                'size-table', 'product-size', 'measurement-table'
            ]
            
            table = None
            for class_name in table_classes:
                table = soup.find('table', class_=class_name)
                if table:
                    logger.info(f"Found table with class: {class_name}")
                    break
            
            if not table:
                # Try finding any table
                tables = soup.find_all('table')
                if tables:
                    logger.info(f"Found {len(tables)} tables, using first one")
                    table = tables[0]
            
            if not table:
                logger.warning("No table found on page")
                return None
            
            # Parse table using pandas
            df = pd.read_html(str(table))[0]
            
            logger.info(f"Successfully scraped table with {len(df)} rows")
            logger.info(f"Columns: {list(df.columns)}")
            
            # Add metadata
            df['brand'] = brand_name
            df['source_url'] = url
            df['scraped_date'] = pd.Timestamp.now().strftime('%Y-%m-%d')
            
            time.sleep(self.delay)  # Be respectful!
            
            return df
            
        except requests.RequestException as e:
            logger.error(f"Error fetching {url}: {e}")
            return None
        except Exception as e:
            logger.error(f"Error parsing table: {e}")
            return None
    
    def scrape_nike_example(self, url: str = "https://www.nike.com/size-fit/mens-tops") -> Dict:
        """
        Example: Custom scraper for Nike
        Each brand may require custom parsing logic
        
        This is a TEMPLATE - actual implementation depends on website structure
        """
        try:
            response = self.session.get(url, timeout=10)
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # This is pseudo-code - actual selectors depend on Nike's HTML structure
            size_data = {
                'brand': 'Nike',
                'category': 'Mens Tops',
                'sizes': []
            }
            
            # Example structure (adjust based on actual HTML)
            # size_rows = soup.find_all('div', class_='size-row')
            # for row in size_rows:
            #     size_label = row.find('span', class_='size-label').text
            #     chest = row.find('span', class_='chest-measurement').text
            #     # ... extract other measurements
            
            logger.info("Note: This is a template method. Implement based on actual HTML structure.")
            
            time.sleep(self.delay)
            return size_data
            
        except Exception as e:
            logger.error(f"Error in Nike scraper: {e}")
            return {}
    
    def convert_to_database_format(self, df: pd.DataFrame, 
                                   brand_name: str,
                                   category: str,
                                   gender: str) -> Dict:
        """
        Convert scraped DataFrame to database-ready format
        
        Args:
            df: Scraped data
            brand_name: Brand name
            category: Garment category
            gender: Men/Women/Unisex
        
        Returns:
            Dictionary ready for database import
        """
        sizes = []
        
        # This is a template - adjust based on your DataFrame structure
        # Assumes df has columns like: Size, Chest, Waist, Hip
        
        for idx, row in df.iterrows():
            size_entry = {
                'label': row.get('Size', ''),
                'order': idx + 1,
                'measurements': {}
            }
            
            # Map DataFrame columns to measurement types
            measurement_mapping = {
                'Chest': 'chest',
                'Waist': 'waist',
                'Hip': 'hip',
                'Shoulder': 'shoulder_breadth',
                'Sleeve': 'arm_length'
            }
            
            for df_col, db_col in measurement_mapping.items():
                if df_col in row:
                    value = self._parse_measurement(row[df_col])
                    if value:
                        size_entry['measurements'][db_col] = value
            
            sizes.append(size_entry)
        
        return {
            'brand': brand_name,
            'category': category,
            'gender': gender,
            'fit_type': 'Regular',
            'sizes': sizes
        }
    
    def _parse_measurement(self, value) -> Optional[Dict[str, float]]:
        """
        Parse measurement value (handles ranges, unit conversion)
        
        Examples:
            "36-38" -> {"min": 36, "max": 38, "optimal": 37}
            "36" -> {"min": 35.5, "max": 36.5, "optimal": 36}
            "36 in" -> converts to cm
        """
        try:
            if pd.isna(value):
                return None
            
            value_str = str(value).strip()
            
            # Remove unit indicators
            value_str = value_str.replace('cm', '').replace('in', '').replace('"', '')
            
            # Check if it's a range
            if '-' in value_str:
                parts = value_str.split('-')
                min_val = float(parts[0].strip())
                max_val = float(parts[1].strip())
            else:
                # Single value - create small range
                val = float(value_str)
                min_val = val - 0.5
                max_val = val + 0.5
            
            optimal = (min_val + max_val) / 2
            
            # Check if values are in inches (typically < 60 for body measurements)
            if max_val < 60:
                # Likely inches, convert to cm
                min_val *= 2.54
                max_val *= 2.54
                optimal *= 2.54
            
            return {
                'min': round(min_val, 1),
                'max': round(max_val, 1),
                'optimal': round(optimal, 1)
            }
            
        except Exception as e:
            logger.warning(f"Could not parse measurement '{value}': {e}")
            return None
    
    def export_to_csv(self, df: pd.DataFrame, filename: str):
        """Export scraped data to CSV"""
        df.to_csv(filename, index=False)
        logger.info(f"Data exported to {filename}")
    
    def export_to_json(self, data: Dict, filename: str):
        """Export data to JSON format"""
        with open(filename, 'w') as f:
            json.dump(data, f, indent=2)
        logger.info(f"Data exported to {filename}")


# ============================================================================
# EXAMPLE USAGE
# ============================================================================

def example_scraping_workflow():
    """Example workflow for scraping size charts"""
    
    scraper = SizeChartScraper(delay=2.0)
    
    # Example: Scrape a generic table
    # Replace with actual brand size chart URLs
    urls = [
        # ("https://www.brand1.com/size-chart", "Brand1"),
        # ("https://www.brand2.com/sizing", "Brand2"),
    ]
    
    all_data = []
    
    for url, brand in urls:
        logger.info(f"\nScraping {brand}...")
        
        # Method 1: Try generic table scraping
        df = scraper.scrape_generic_table(url, brand)
        
        if df is not None:
            # Preview the data
            logger.info(f"\nPreview of {brand} data:")
            logger.info(df.head())
            
            # Export raw data
            scraper.export_to_csv(df, f"{brand}_raw_data.csv")
            
            # Convert to database format (manual review recommended)
            # db_format = scraper.convert_to_database_format(df, brand, 'T-Shirt', 'Men')
            # scraper.export_to_json(db_format, f"{brand}_database_ready.json")
            
            all_data.append(df)
    
    # Combine all data
    if all_data:
        combined_df = pd.concat(all_data, ignore_index=True)
        scraper.export_to_csv(combined_df, "all_scraped_size_charts.csv")
        logger.info(f"\n✅ Scraped {len(all_data)} size charts")
    else:
        logger.warning("No data scraped")


def manual_data_entry_template():
    """
    Template for manual data entry
    Use this when scraping is not feasible
    """
    
    # Example: Manually entering Nike Men's T-Shirt data
    manual_data = {
        'brand': 'Nike',
        'brand_country': 'USA',
        'size_system': 'US',
        'category': 'T-Shirt',
        'gender': 'Men',
        'fit_type': 'Regular',
        'sizes': [
            {
                'label': 'S',
                'order': 1,
                'measurements': {
                    'chest': {'min': 86, 'max': 91, 'optimal': 88.5},
                    'shoulder_breadth': {'min': 42, 'max': 44, 'optimal': 43},
                    'waist': {'min': 76, 'max': 81, 'optimal': 78.5}
                }
            },
            {
                'label': 'M',
                'order': 2,
                'measurements': {
                    'chest': {'min': 91, 'max': 97, 'optimal': 94},
                    'shoulder_breadth': {'min': 44, 'max': 46, 'optimal': 45},
                    'waist': {'min': 81, 'max': 86, 'optimal': 83.5}
                }
            },
            # Add more sizes...
        ],
        'source_url': 'https://www.nike.com/size-fit',
        'date_collected': '2024-03-08',
        'notes': 'Athletic fit, runs slightly small'
    }
    
    # Export for review
    with open('nike_mens_tshirt_manual.json', 'w') as f:
        json.dump(manual_data, f, indent=2)
    
    logger.info("Manual data template created: nike_mens_tshirt_manual.json")
    logger.info("Review and modify before importing to database")


if __name__ == "__main__":
    logger.info("="*60)
    logger.info("Size Chart Data Collection Tool")
    logger.info("="*60)
    
    print("\nOptions:")
    print("1. Run example scraping workflow (requires URLs)")
    print("2. Generate manual data entry template")
    print("\nFor actual use:")
    print("- Update URLs in example_scraping_workflow()")
    print("- Customize parsing logic for each brand")
    print("- Always verify scraped data manually")
    print("- Respect website terms of service and robots.txt")
    
    # Uncomment to run:
    # example_scraping_workflow()
    # manual_data_entry_template()
