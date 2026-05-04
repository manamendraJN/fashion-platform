"""
Event Constants for Fashion Intelligence Platform
Standardized event names and matching logic
"""

# Standard event names used throughout the system
STANDARD_EVENTS = [
    "Casual",
    "Office",
    "Party",
    "Gym",
    "Beach",
    "Date",
    "Shopping",
    "Sports",
    "Religious",
    "Tamil Wedding",
    "Western Wedding",
    "Family Gathering"
]

# Event name mapping - maps various user inputs to standard event names
EVENT_NAME_MAPPING = {
    # Casual variations
    "casual": "Casual",
    "casual outing": "Casual",
    "weekend": "Casual",
    "hangout": "Casual",
    "relax": "Casual",
    
    # Office variations
    "office": "Office",
    "office meeting": "Office",
    "work": "Office",
    "meeting": "Office",
    "professional": "Office",
    "business": "Office",
    "interview": "Office",
    
    # Party variations
    "party": "Party",
    "celebration": "Party",
    "night out": "Party",
    "clubbing": "Party",
    
    # Date variations
    "date": "Date",
    "date night": "Date",
    "dinner": "Date",
    "romantic": "Date",
    
    # Beach variations
    "beach": "Beach",
    "beach outing": "Beach",
    "pool": "Beach",
    "swimming": "Beach",
    
    # Shopping variations
    "shopping": "Shopping",
    "mall": "Shopping",
    
    # Sports/Gym variations
    "gym": "Gym",
    "workout": "Gym",
    "exercise": "Gym",
    "fitness": "Gym",
    "sports": "Sports",
    "sports event": "Sports",
    "running": "Sports",
    "jogging": "Sports",
    
    # Religious variations
    "religious": "Religious",
    "religious event": "Religious",
    "temple": "Religious",
    "church": "Religious",
    "mosque": "Religious",
    
    # Wedding variations
    "tamil wedding": "Tamil Wedding",
    "traditional wedding": "Tamil Wedding",
    "indian wedding": "Tamil Wedding",
    "ethnic wedding": "Tamil Wedding",
    "western wedding": "Western Wedding",
    "church wedding": "Western Wedding",
    
    # Family variations
    "family": "Family Gathering",
    "family gathering": "Family Gathering",
    "family event": "Family Gathering",
    "reunion": "Family Gathering"
}


def normalize_event_name(event_name):
    """
    Normalize an event name to its standard format.
    Handles both user input and database variations.
    
    Args:
        event_name (str): Raw event name from user or database
        
    Returns:
        str: Standardized event name, or original if no mapping found
    """
    if not event_name:
        return "Casual"
    
    # Check direct mapping
    normalized = event_name.lower().strip()
    if normalized in EVENT_NAME_MAPPING:
        return EVENT_NAME_MAPPING[normalized]
    
    # Check if it's already a standard event (case-insensitive)
    for standard_event in STANDARD_EVENTS:
        if standard_event.lower() == normalized:
            return standard_event
    
    # Return original if no match found
    return event_name


def find_event_score(event_scores_dict, target_event):
    """
    Find event score from dictionary, handling both old and new event name formats.
    
    Args:
        event_scores_dict (dict): Dictionary of event names to scores
        target_event (str): The event we're looking for
        
    Returns:
        float: Score for the event, or 0.0 if not found
    """
    if not event_scores_dict:
        return 0.0
    
    # Normalize target event
    normalized_target = normalize_event_name(target_event)
    
    # Try exact match first
    if normalized_target in event_scores_dict:
        return event_scores_dict[normalized_target]
    
    # Try fuzzy matching with old format names
    for db_event_name, score in event_scores_dict.items():
        normalized_db = normalize_event_name(db_event_name)
        if normalized_db == normalized_target:
            return score
    
    return 0.0


def get_default_event_scores(clothing_type):
    """
    Get default event scores based on clothing type.
    Used when recalculating scores after type update.
    
    Args:
        clothing_type (str): Type of clothing (e.g., "Dress", "Jeans", "Blazer")
        
    Returns:
        dict: Dictionary mapping event names to scores (0.0 to 1.0)
    """
    clothing_type_lower = clothing_type.lower()
    
    # Athletic wear (check FIRST - before suits to avoid matching tracksuit as suit)
    if any(word in clothing_type_lower for word in ['track', 'gym', 'sport', 'athletic', 'legging', 'jogger', 'tracksuit']):
        return {
            "Casual": 0.6,
            "Office": 0.0,
            "Party": 0.0,
            "Gym": 0.95,
            "Beach": 0.4,
            "Date": 0.1,
            "Shopping": 0.5,
            "Sports": 0.95,
            "Religious": 0.0,
            "Tamil Wedding": 0.0,
            "Western Wedding": 0.0,
            "Family Gathering": 0.3
        }
    
    # Formal wear (blazers, suits, formal dresses, gowns) - check BEFORE general jackets
    elif any(word in clothing_type_lower for word in ['blazer', 'suit', 'formal dress', 'gown', 'tuxedo']):
        return {
            "Casual": 0.3,
            "Office": 0.95,
            "Party": 0.85,
            "Gym": 0.0,
            "Beach": 0.0,
            "Date": 0.9,
            "Shopping": 0.5,
            "Sports": 0.0,
            "Religious": 0.7,
            "Tamil Wedding": 0.6,
            "Western Wedding": 0.95,
            "Family Gathering": 0.85
        }
    
    # Formal shirts/blouses (office appropriate)
    elif any(word in clothing_type_lower for word in ['shirt', 'blouse']) and not any(word in clothing_type_lower for word in ['t-shirt', 'tshirt', 'sweat', 'polo']):
        return {
            "Casual": 0.75,
            "Office": 0.85,
            "Party": 0.6,
            "Gym": 0.0,
            "Beach": 0.3,
            "Date": 0.7,
            "Shopping": 0.8,
            "Sports": 0.1,
            "Religious": 0.6,
            "Tamil Wedding": 0.4,
            "Western Wedding": 0.6,
            "Family Gathering": 0.75
        }
    
    # Polo shirts (semi-formal, office casual)
    elif 'polo' in clothing_type_lower:
        return {
            "Casual": 0.85,
            "Office": 0.75,
            "Party": 0.5,
            "Gym": 0.2,
            "Beach": 0.4,
            "Date": 0.65,
            "Shopping": 0.85,
            "Sports": 0.7,
            "Religious": 0.5,
            "Tamil Wedding": 0.3,
            "Western Wedding": 0.5,
            "Family Gathering": 0.75
        }
    
    # Casual tops (t-shirts, tank tops)
    elif any(word in clothing_type_lower for word in ['t-shirt', 'tshirt', 'tank top']):
        return {
            "Casual": 0.95,
            "Office": 0.2,
            "Party": 0.4,
            "Gym": 0.3,
            "Beach": 0.7,
            "Date": 0.5,
            "Shopping": 0.9,
            "Sports": 0.6,
            "Religious": 0.1,
            "Tamil Wedding": 0.0,
            "Western Wedding": 0.1,
            "Family Gathering": 0.7
        }
    
    # General tops (semi-formal, can work for office in some settings)
    elif 'top' in clothing_type_lower:
        return {
            "Casual": 0.85,
            "Office": 0.7,
            "Party": 0.65,
            "Gym": 0.2,
            "Beach": 0.5,
            "Date": 0.7,
            "Shopping": 0.85,
            "Sports": 0.3,
            "Religious": 0.5,
            "Tamil Wedding": 0.3,
            "Western Wedding": 0.5,
            "Family Gathering": 0.75
        }
    
    # Dresses
    elif 'dress' in clothing_type_lower:
        return {
            "Casual": 0.85,
            "Office": 0.5,
            "Party": 0.9,
            "Gym": 0.0,
            "Beach": 0.7,
            "Date": 0.95,
            "Shopping": 0.85,
            "Sports": 0.0,
            "Religious": 0.5,
            "Tamil Wedding": 0.4,
            "Western Wedding": 0.7,
            "Family Gathering": 0.9
        }
    
    # Pants/Trousers/Jeans (checked after athletic wear)
    elif any(word in clothing_type_lower for word in ['trouser', 'pant', 'jean', 'slack']):
        return {
            "Casual": 0.9,
            "Office": 0.85,
            "Party": 0.6,
            "Gym": 0.0,
            "Beach": 0.3,
            "Date": 0.7,
            "Shopping": 0.9,
            "Sports": 0.2,
            "Religious": 0.6,
            "Tamil Wedding": 0.2,
            "Western Wedding": 0.5,
            "Family Gathering": 0.8
        }
    
    # Wedding Saree - Specifically for weddings (Tamil weddings)
    elif 'wedding saree' in clothing_type_lower or 'bridal saree' in clothing_type_lower:
        return {
            "Casual": 0.1,
            "Office": 0.2,
            "Party": 0.7,
            "Gym": 0.0,
            "Beach": 0.0,
            "Date": 0.5,
            "Shopping": 0.2,
            "Sports": 0.0,
            "Religious": 0.6,
            "Tamil Wedding": 0.98,
            "Western Wedding": 0.3,
            "Family Gathering": 0.8
        }
    
    # Traditional Saree - For religious events and Tamil cultural functions
    elif 'traditional saree' in clothing_type_lower or 'silk saree' in clothing_type_lower:
        return {
            "Casual": 0.2,
            "Office": 0.3,
            "Party": 0.6,
            "Gym": 0.0,
            "Beach": 0.0,
            "Date": 0.5,
            "Shopping": 0.3,
            "Sports": 0.0,
            "Religious": 0.98,
            "Tamil Wedding": 0.85,
            "Western Wedding": 0.2,
            "Family Gathering": 0.9
        }
    
    # Office Saree - Professional/formal sarees for meetings and office
    elif 'office saree' in clothing_type_lower or 'formal saree' in clothing_type_lower:
        return {
            "Casual": 0.5,
            "Office": 0.90,
            "Party": 0.6,
            "Gym": 0.0,
            "Beach": 0.0,
            "Date": 0.7,
            "Shopping": 0.6,
            "Sports": 0.0,
            "Religious": 0.5,
            "Tamil Wedding": 0.4,
            "Western Wedding": 0.3,
            "Family Gathering": 0.75
        }
    
    # Casual Saree - For casual outings, shopping, daily wear
    elif 'casual saree' in clothing_type_lower or 'cotton saree' in clothing_type_lower:
        return {
            "Casual": 0.85,
            "Office": 0.6,
            "Party": 0.5,
            "Gym": 0.0,
            "Beach": 0.0,
            "Date": 0.6,
            "Shopping": 0.80,
            "Sports": 0.0,
            "Religious": 0.4,
            "Tamil Wedding": 0.3,
            "Western Wedding": 0.2,
            "Family Gathering": 0.8
        }
    
    # Generic Saree (fallback when no specific type) - Moderate scores
    elif 'saree' in clothing_type_lower or 'sari' in clothing_type_lower:
        return {
            "Casual": 0.4,
            "Office": 0.5,
            "Party": 0.6,
            "Gym": 0.0,
            "Beach": 0.0,
            "Date": 0.6,
            "Shopping": 0.5,
            "Sports": 0.0,
            "Religious": 0.85,
            "Tamil Wedding": 0.85,
            "Western Wedding": 0.3,
            "Family Gathering": 0.85
        }
    
    # Traditional Kurta - For religious events and Tamil cultural functions
    elif 'traditional kurta' in clothing_type_lower or 'silk kurta' in clothing_type_lower:
        return {
            "Casual": 0.3,
            "Office": 0.4,
            "Party": 0.6,
            "Gym": 0.0,
            "Beach": 0.0,
            "Date": 0.6,
            "Shopping": 0.4,
            "Sports": 0.0,
            "Religious": 0.98,
            "Tamil Wedding": 0.85,
            "Western Wedding": 0.2,
            "Family Gathering": 0.9
        }
    
    # Casual Kurta - For daily wear, shopping, casual outings
    elif 'casual kurta' in clothing_type_lower or 'cotton kurta' in clothing_type_lower:
        return {
            "Casual": 0.90,
            "Office": 0.6,
            "Party": 0.5,
            "Gym": 0.0,
            "Beach": 0.0,
            "Date": 0.65,
            "Shopping": 0.85,
            "Sports": 0.0,
            "Religious": 0.4,
            "Tamil Wedding": 0.3,
            "Western Wedding": 0.2,
            "Family Gathering": 0.8
        }
    
    # Generic Kurta (fallback when no specific type) - Moderate scores for traditional events
    elif 'kurta' in clothing_type_lower or 'kurti' in clothing_type_lower:
        return {
            "Casual": 0.6,
            "Office": 0.5,
            "Party": 0.6,
            "Gym": 0.0,
            "Beach": 0.0,
            "Date": 0.6,
            "Shopping": 0.7,
            "Sports": 0.0,
            "Religious": 0.75,
            "Tamil Wedding": 0.70,
            "Western Wedding": 0.2,
            "Family Gathering": 0.85
        }
    
    # Wedding Lehenga - Specifically for weddings
    elif 'wedding lehenga' in clothing_type_lower or 'bridal lehenga' in clothing_type_lower:
        return {
            "Casual": 0.1,
            "Office": 0.1,
            "Party": 0.8,
            "Gym": 0.0,
            "Beach": 0.0,
            "Date": 0.5,
            "Shopping": 0.2,
            "Sports": 0.0,
            "Religious": 0.6,
            "Tamil Wedding": 0.98,
            "Western Wedding": 0.5,
            "Family Gathering": 0.8
        }
    
    # Generic Lehenga - For parties and weddings
    elif 'lehenga' in clothing_type_lower:
        return {
            "Casual": 0.2,
            "Office": 0.2,
            "Party": 0.90,
            "Gym": 0.0,
            "Beach": 0.0,
            "Date": 0.75,
            "Shopping": 0.3,
            "Sports": 0.0,
            "Religious": 0.7,
            "Tamil Wedding": 0.90,
            "Western Wedding": 0.6,
            "Family Gathering": 0.85
        }
    
    # Sherwani - For weddings and very formal/religious events
    elif 'sherwani' in clothing_type_lower:
        return {
            "Casual": 0.1,
            "Office": 0.3,
            "Party": 0.7,
            "Gym": 0.0,
            "Beach": 0.0,
            "Date": 0.5,
            "Shopping": 0.2,
            "Sports": 0.0,
            "Religious": 0.90,
            "Tamil Wedding": 0.95,
            "Western Wedding": 0.7,
            "Family Gathering": 0.85
        }
    
    # Salwar/Patiala - Traditional casual/semi-formal
    elif 'salwar' in clothing_type_lower or 'patiala' in clothing_type_lower:
        return {
            "Casual": 0.85,
            "Office": 0.6,
            "Party": 0.6,
            "Gym": 0.0,
            "Beach": 0.0,
            "Date": 0.6,
            "Shopping": 0.85,
            "Sports": 0.0,
            "Religious": 0.75,
            "Tamil Wedding": 0.6,
            "Western Wedding": 0.3,
            "Family Gathering": 0.85
        }
    
    # Jackets/Outerwear (casual jackets, not blazers which are already handled)
    elif any(word in clothing_type_lower for word in ['jacket', 'coat']) and not any(word in clothing_type_lower for word in ['blazer', 'suit']):
        return {
            "Casual": 0.85,
            "Office": 0.6,
            "Party": 0.6,
            "Gym": 0.2,
            "Beach": 0.2,
            "Date": 0.7,
            "Shopping": 0.8,
            "Sports": 0.3,
            "Religious": 0.5,
            "Tamil Wedding": 0.3,
            "Western Wedding": 0.6,
            "Family Gathering": 0.8
        }
    
    # Cardigans/Sweaters/Hoodies (more casual)
    elif any(word in clothing_type_lower for word in ['cardigan', 'hoodie', 'sweater', 'sweatshirt']):
        return {
            "Casual": 0.9,
            "Office": 0.4,
            "Party": 0.5,
            "Gym": 0.3,
            "Beach": 0.2,
            "Date": 0.6,
            "Shopping": 0.85,
            "Sports": 0.4,
            "Religious": 0.4,
            "Tamil Wedding": 0.2,
            "Western Wedding": 0.3,
            "Family Gathering": 0.75
        }
    
    # Skirts/Shorts
    elif any(word in clothing_type_lower for word in ['skirt', 'short']):
        return {
            "Casual": 0.9,
            "Office": 0.4,
            "Party": 0.7,
            "Gym": 0.3,
            "Beach": 0.85,
            "Date": 0.75,
            "Shopping": 0.9,
            "Sports": 0.5,
            "Religious": 0.2,
            "Tamil Wedding": 0.1,
            "Western Wedding": 0.3,
            "Family Gathering": 0.6
        }
    
    # Default scores for unknown types
    else:
        return {
            "Casual": 0.7,
            "Office": 0.5,
            "Party": 0.5,
            "Gym": 0.2,
            "Beach": 0.4,
            "Date": 0.6,
            "Shopping": 0.7,
            "Sports": 0.3,
            "Religious": 0.4,
            "Tamil Wedding": 0.4,
            "Western Wedding": 0.4,
            "Family Gathering": 0.6
        }
