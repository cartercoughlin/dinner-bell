"""Auto-assign categories/tags to recipes based on title and ingredients."""

import re

PROTEIN_KEYWORDS = {
    'chicken': 'chicken',
    'turkey': 'turkey',
    'beef': 'beef',
    'steak': 'beef',
    'ground beef': 'beef',
    'pork': 'pork',
    'bacon': 'pork',
    'sausage': 'pork',
    'ham': 'pork',
    'lamb': 'lamb',
    'salmon': 'seafood',
    'shrimp': 'seafood',
    'fish': 'seafood',
    'tuna': 'seafood',
    'crab': 'seafood',
    'lobster': 'seafood',
    'scallop': 'seafood',
    'cod': 'seafood',
    'tilapia': 'seafood',
    'tofu': 'vegetarian',
    'tempeh': 'vegetarian',
}

CUISINE_KEYWORDS = {
    'italian': ['pasta', 'parmesan', 'mozzarella', 'basil', 'marinara', 'pesto', 'risotto', 'lasagna', 'pizza'],
    'mexican': ['tortilla', 'taco', 'burrito', 'salsa', 'enchilada', 'chimichurri', 'jalapeño', 'jalapeno', 'cilantro', 'cumin', 'chipotle', 'quesadilla'],
    'asian': ['soy sauce', 'ginger', 'sesame', 'rice vinegar', 'sriracha', 'hoisin', 'teriyaki', 'stir fry', 'wok', 'noodle'],
    'indian': ['curry', 'turmeric', 'garam masala', 'naan', 'tikka', 'masala', 'cardamom', 'chutney'],
    'mediterranean': ['olive oil', 'feta', 'hummus', 'tahini', 'pita', 'za\'atar', 'zaatar', 'tzatziki'],
}

MEAL_TYPE_KEYWORDS = {
    'breakfast': ['egg', 'pancake', 'waffle', 'oatmeal', 'cereal', 'breakfast', 'brunch', 'french toast', 'omelet', 'omelette'],
    'dessert': ['cake', 'cookie', 'brownie', 'pie', 'chocolate', 'sugar', 'frosting', 'dessert', 'cupcake', 'ice cream', 'sweet'],
    'appetizer': ['appetizer', 'dip', 'bruschetta', 'crostini', 'hors d\'oeuvre'],
    'snack': ['snack', 'trail mix', 'granola bar', 'popcorn'],
}

DISH_TYPE_KEYWORDS = {
    'soup': ['soup', 'stew', 'chowder', 'bisque', 'broth', 'chili'],
    'salad': ['salad', 'slaw', 'coleslaw'],
    'pasta': ['pasta', 'spaghetti', 'penne', 'fettuccine', 'linguine', 'macaroni', 'noodle'],
    'sandwich': ['sandwich', 'burger', 'wrap', 'sub', 'panini'],
    'casserole': ['casserole', 'bake'],
    'tacos': ['taco'],
    'bowl': ['bowl'],
}


def auto_categorize(title, ingredient_names):
    """Return a list of auto-assigned category tags."""
    tags = set()
    title_lower = title.lower() if title else ''
    all_text = title_lower + ' ' + ' '.join(name.lower() for name in ingredient_names)

    # Detect proteins
    for keyword, protein in PROTEIN_KEYWORDS.items():
        if keyword in all_text:
            tags.add(protein)

    # Detect cuisine
    for cuisine, keywords in CUISINE_KEYWORDS.items():
        if any(kw in all_text for kw in keywords):
            tags.add(cuisine)

    # Detect meal type (primarily from title)
    for meal_type, keywords in MEAL_TYPE_KEYWORDS.items():
        if any(kw in all_text for kw in keywords):
            tags.add(meal_type)

    # Detect dish type
    for dish_type, keywords in DISH_TYPE_KEYWORDS.items():
        if any(kw in title_lower for kw in keywords):
            tags.add(dish_type)

    # Default to dinner if no meal type detected
    meal_types = {'breakfast', 'dessert', 'appetizer', 'snack'}
    if not tags.intersection(meal_types):
        tags.add('dinner')

    # Check for vegetarian (no meat proteins found)
    meat_proteins = {'chicken', 'turkey', 'beef', 'pork', 'lamb', 'seafood'}
    if not tags.intersection(meat_proteins):
        tags.add('vegetarian')

    return sorted(tags)
