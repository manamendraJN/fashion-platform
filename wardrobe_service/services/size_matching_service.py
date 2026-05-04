"""
Size Matching Service
Implements algorithms to match user body measurements with garment size charts
"""

from typing import Dict, List, Optional, Tuple
import math
import logging
from database.db_manager import db_manager

logger = logging.getLogger(__name__)


class SizeMatchingService:
    """Service for matching body measurements to garment sizes"""
    
    def __init__(self):
        self.db = db_manager
    
    def find_best_size(self, 
                       user_measurements: Dict[str, float],
                       brand_id: int,
                       category_id: int,
                       fit_type: str = 'Regular') -> Dict:
        """
        Find the best matching size for user measurements
        
        Args:
            user_measurements: Dict of body measurements in cm (e.g., {'chest': 95, 'waist': 82})
            brand_id: Brand identifier
            category_id: Garment category identifier
            fit_type: Fit type ('Regular', 'Slim', 'Relaxed', etc.)
        
        Returns:
            Dict containing:
                - recommended_size: The best matching size label
                - confidence: Confidence score (0-100)
                - alternatives: List of alternative sizes with scores
                - match_details: Detailed scoring breakdown
                - fit_advice: Human-readable advice
        """
        # Get size chart
        size_chart = self.db.get_size_chart(brand_id, category_id, fit_type)
        
        if not size_chart:
            return {
                'error': 'Size chart not found for this brand and garment category',
                'brand_id': brand_id,
                'category_id': category_id,
                'fit_type': fit_type
            }
        
        # Get all sizes with measurements
        sizes = self.db.get_sizes_for_chart(size_chart['chart_id'])
        
        if not sizes:
            return {'error': 'No sizes found in this size chart'}
        
        # Get category measurement requirements
        requirements = self.db.get_category_measurement_requirements(category_id)
        
        # Calculate match scores for each size
        size_scores = []
        
        for size in sizes:
            score_result = self._calculate_size_match_score(
                user_measurements, 
                size, 
                requirements
            )
            size_scores.append({
                'size_label': size['size_label'],
                'size_order': size['size_order'],
                'score': score_result['score'],
                'details': score_result['details']
            })
        
        # Sort by score (descending)
        size_scores.sort(key=lambda x: x['score'], reverse=True)
        
        # Get best match
        best_match = size_scores[0]
        confidence = self._calculate_confidence(best_match['score'], size_scores)
        
        # Generate fit advice
        fit_advice = self._generate_fit_advice(
            best_match, 
            size_scores[:3],  # Top 3 alternatives
            user_measurements
        )
        
        return {
            'brand_name': size_chart['brand_name'],
            'category_name': size_chart['category_name'],
            'fit_type': fit_type,
            'recommended_size': best_match['size_label'],
            'confidence': round(confidence, 1),
            'match_score': round(best_match['score'], 1),
            'alternatives': [
                {
                    'size': s['size_label'],
                    'score': round(s['score'], 1),
                    'fit_note': self._get_fit_note(s, best_match)
                }
                for s in size_scores[1:4]  # Next 3 alternatives
            ],
            'match_details': best_match['details'],
            'fit_advice': fit_advice
        }
    
    def _calculate_size_match_score(self,
                                    user_measurements: Dict[str, float],
                                    size: Dict,
                                    requirements: List[Dict]) -> Dict:
        """
        Calculate how well user measurements match a specific size
        
        Uses a weighted scoring algorithm:
        - Perfect match (within range): 100 points
        - Close match (within tolerance): 70-99 points
        - Deviation proportional to distance from range
        """
        total_score = 0.0
        total_weight = 0.0
        details = []
        
        # Build requirement weights map
        requirement_weights = {
            req['measurement_type']: req['importance_weight']
            for req in requirements
        }
        
        for measurement in size['measurements']:
            meas_type = measurement['type']
            
            # Skip if user doesn't have this measurement
            if meas_type not in user_measurements:
                continue
            
            user_value = user_measurements[meas_type]
            min_val = measurement['min']
            max_val = measurement['max']
            optimal_val = measurement['optimal']
            tolerance = measurement['tolerance']
            weight = measurement['weight']
            
            # Apply category-specific importance weight if available
            if meas_type in requirement_weights:
                weight *= requirement_weights[meas_type]
            
            # Calculate score for this measurement
            meas_score = self._score_single_measurement(
                user_value, min_val, max_val, optimal_val, tolerance
            )
            
            total_score += meas_score * weight
            total_weight += weight
            
            details.append({
                'measurement': meas_type,
                'user_value': round(user_value, 1),
                'size_range': f"{min_val}-{max_val} cm",
                'optimal': round(optimal_val, 1) if optimal_val else None,
                'score': round(meas_score, 1),
                'weight': round(weight, 2),
                'fit': self._get_measurement_fit(user_value, min_val, max_val, tolerance)
            })
        
        # Normalize final score
        final_score = (total_score / total_weight) if total_weight > 0 else 0
        
        return {
            'score': final_score,
            'details': details
        }
    
    def _score_single_measurement(self,
                                  user_value: float,
                                  min_val: float,
                                  max_val: float,
                                  optimal_val: Optional[float],
                                  tolerance: float) -> float:
        """
        Score a single measurement
        
        Returns score from 0-100:
        - 100: Perfect match (at optimal or within range)
        - 90-99: Within range
        - 70-89: Within tolerance but outside range
        - <70: Outside tolerance (decreasing with distance)
        """
        # If within range: 90-100 based on distance from optimal
        if min_val <= user_value <= max_val:
            if optimal_val:
                # Distance from optimal (as percentage of range)
                range_width = max_val - min_val
                distance_from_optimal = abs(user_value - optimal_val)
                score = 100 - (distance_from_optimal / range_width) * 10
                return max(90, min(100, score))
            else:
                return 95  # Good match if no optimal specified
        
        # If outside range, check if within tolerance
        if user_value < min_val:
            deviation = min_val - user_value
        else:
            deviation = user_value - max_val
        
        if deviation <= tolerance:
            # Within tolerance: scale from 70-90
            score = 90 - (deviation / tolerance) * 20
            return max(70, score)
        else:
            # Outside tolerance: penalize heavily
            # Score decreases exponentially with distance
            excess_deviation = deviation - tolerance
            penalty = min(70, excess_deviation * 10)  # 10 points per cm over tolerance
            return max(0, 70 - penalty)
    
    def _get_measurement_fit(self, user_value: float, min_val: float, 
                            max_val: float, tolerance: float) -> str:
        """Get human-readable fit assessment"""
        if min_val <= user_value <= max_val:
            return "perfect"
        elif user_value < min_val - tolerance:
            return "too_small"
        elif user_value > max_val + tolerance:
            return "too_large"
        elif user_value < min_val:
            return "slightly_small"
        else:
            return "slightly_large"
    
    def _calculate_confidence(self, best_score: float, all_scores: List[Dict]) -> float:
        """
        Calculate confidence in the recommendation
        
        High confidence when:
        - Best score is high
        - Clear gap between best and second best
        """
        base_confidence = best_score
        
        if len(all_scores) > 1:
            second_best_score = all_scores[1]['score']
            score_gap = best_score - second_best_score
            
            # Increase confidence if there's a clear winner
            if score_gap > 10:
                base_confidence = min(100, base_confidence + score_gap * 0.5)
            # Decrease confidence if scores are close
            elif score_gap < 5:
                base_confidence = base_confidence * 0.9
        
        return max(0, min(100, base_confidence))
    
    def _get_fit_note(self, alternative: Dict, best_match: Dict) -> str:
        """Generate note comparing alternative to best match"""
        size_diff = alternative['size_order'] - best_match['size_order']
        
        if size_diff == 0:
            return "Same as recommended"
        elif size_diff < 0:
            return f"Size down - May be tighter"
        else:
            return f"Size up - May be looser"
    
    def _generate_fit_advice(self, 
                            best_match: Dict,
                            alternatives: List[Dict],
                            user_measurements: Dict[str, float]) -> List[str]:
        """Generate human-readable fit advice"""
        advice = []
        
        # Overall fit assessment
        if best_match['score'] >= 90:
            advice.append("✅ Excellent fit! This size matches your measurements very well.")
        elif best_match['score'] >= 75:
            advice.append("👍 Good fit. This size should work well for you.")
        elif best_match['score'] >= 60:
            advice.append("⚠️ Acceptable fit, but you may want to try the suggested alternatives.")
        else:
            advice.append("⚠️ Limited match. Consider trying multiple sizes or checking other brands.")
        
        # Check for specific measurement issues
        for detail in best_match['details']:
            if detail['fit'] in ['too_small', 'too_large']:
                meas_name = detail['measurement'].replace('_', ' ').title()
                if detail['fit'] == 'too_small':
                    advice.append(f"⚡ Your {meas_name} is larger than typical for this size. Consider sizing up.")
                else:
                    advice.append(f"⚡ Your {meas_name} is smaller than typical for this size. Consider sizing down.")
        
        # Suggest trying alternatives if scores are close
        if len(alternatives) > 1:
            score_diff = best_match['score'] - alternatives[1]['score']
            if score_diff < 5:
                advice.append(f"💡 Size {alternatives[1]['size_label']} is also a close match. Consider trying both.")
        
        return advice
    
    def get_recommendations_for_multiple_brands(self,
                                               user_measurements: Dict[str, float],
                                               category_id: int,
                                               gender: str = None,
                                               fit_type: str = 'Regular',
                                               min_confidence: float = 60.0) -> List[Dict]:
        """
        Get size recommendations across multiple brands
        
        Args:
            user_measurements: User's body measurements
            category_id: Garment category
            gender: Optional gender filter
            fit_type: Fit type preference
            min_confidence: Minimum confidence threshold (0-100)
        
        Returns:
            List of recommendations sorted by confidence
        """
        # Get all brands
        brands = self.db.get_brands()
        
        recommendations = []
        
        for brand in brands:
            result = self.find_best_size(
                user_measurements,
                brand['brand_id'],
                category_id,
                fit_type
            )
            
            # Skip if no chart found or confidence too low
            if 'error' in result:
                continue
            
            if result['confidence'] >= min_confidence:
                result['brand_id'] = brand['brand_id']
                recommendations.append(result)
        
        # Sort by confidence
        recommendations.sort(key=lambda x: x['confidence'], reverse=True)
        
        return recommendations
    
    def compare_sizes_across_brands(self,
                                   user_measurements: Dict[str, float],
                                   category_id: int,
                                   brand_ids: List[int],
                                   fit_type: str = 'Regular') -> Dict:
        """
        Compare what size the user would be across different brands
        Useful for understanding brand sizing variations
        """
        comparisons = []
        
        for brand_id in brand_ids:
            result = self.find_best_size(
                user_measurements,
                brand_id,
                category_id,
                fit_type
            )
            
            if 'error' not in result:
                comparisons.append({
                    'brand_name': result['brand_name'],
                    'recommended_size': result['recommended_size'],
                    'confidence': result['confidence'],
                    'match_score': result['match_score']
                })
        
        return {
            'category_id': category_id,
            'fit_type': fit_type,
            'comparisons': comparisons,
            'summary': self._generate_comparison_summary(comparisons)
        }
    
    def _generate_comparison_summary(self, comparisons: List[Dict]) -> str:
        """Generate summary of brand size comparisons"""
        if not comparisons:
            return "No size charts available for comparison"
        
        sizes = [c['recommended_size'] for c in comparisons]
        unique_sizes = set(sizes)
        
        if len(unique_sizes) == 1:
            return f"Consistent sizing: You're a size {sizes[0]} across all brands"
        else:
            size_list = ", ".join([f"{c['brand_name']}: {c['recommended_size']}" for c in comparisons])
            return f"Variable sizing across brands: {size_list}"


# Singleton instance
size_matching_service = SizeMatchingService()
