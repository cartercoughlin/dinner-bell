"""Auto-assign categories to recipes based on title and ingredients."""


DISH_TYPES = {
    'Pasta': ['pasta', 'spaghetti', 'penne', 'fettuccine', 'linguine', 'macaroni', 'noodle', 'lasagna', 'ravioli', 'gnocchi', 'rigatoni', 'ziti', 'carbonara', 'alfredo', 'bolognese', 'mac and cheese'],
    'Soup': ['soup', 'stew', 'chowder', 'bisque', 'chili', 'gumbo', 'gazpacho', 'ramen', 'pho'],
    'Salad': ['salad', 'slaw', 'coleslaw', 'caesar'],
    'Sandwich': ['sandwich', 'burger', 'wrap', 'sub', 'panini', 'melt', 'blt'],
    'Tacos': ['taco', 'burrito', 'enchilada', 'fajita', 'quesadilla', 'tostada', 'nachos'],
    'Pizza': ['pizza', 'flatbread', 'calzone'],
    'Casserole': ['casserole', 'bake', 'gratin', 'pot pie'],
    'Bowl': ['bowl', 'poke', 'buddha bowl', 'grain bowl'],
    'Curry': ['curry', 'tikka', 'masala', 'vindaloo', 'korma'],
    'Stir fry': ['stir fry', 'stir-fry', 'lo mein', 'pad thai', 'fried rice'],
    'Sides': ['side dish', 'side', 'coleslaw', 'cornbread', 'mashed potato', 'baked beans', 'rice pilaf', 'roasted vegetable'],
}

MEAL_TYPES = {
    'Breakfast': ['pancake', 'waffle', 'oatmeal', 'breakfast', 'brunch', 'french toast', 'omelet', 'omelette', 'frittata', 'granola', 'quiche', 'crepe'],
    'Dessert': ['cake', 'cookie', 'brownie', 'pie', 'frosting', 'dessert', 'cupcake', 'ice cream', 'pudding', 'tart', 'cheesecake', 'cobbler', 'crumble', 'tiramisu', 'donut', 'doughnut', 'scone', 'muffin', 'cinnamon roll'],
    'Drinks': ['drink', 'cocktail', 'smoothie', 'lemonade', 'margarita', 'sangria', 'punch', 'mocktail', 'milkshake', 'hot chocolate', 'eggnog', 'cider'],
    'Appetizer': ['appetizer', 'dip', 'bruschetta', 'crostini', 'wings', 'spring roll', 'egg roll'],
    'Snack': ['snack', 'trail mix', 'granola bar', 'popcorn', 'hummus', 'guacamole'],
}

CUISINE_KEYWORDS = {
    'Italian': ['parmesan', 'mozzarella', 'marinara', 'pesto', 'risotto', 'prosciutto', 'bruschetta'],
    'Mexican': ['tortilla', 'salsa', 'chipotle', 'cilantro', 'cumin', 'guacamole', 'chorizo', 'mole', 'elote'],
    'Asian': ['soy sauce', 'sesame', 'hoisin', 'teriyaki', 'miso', 'kimchi', 'dumpling', 'gyoza', 'edamame'],
    'Indian': ['turmeric', 'garam masala', 'naan', 'tandoori', 'chutney', 'dal', 'biryani', 'samosa', 'paneer'],
    'Mediterranean': ['feta', 'tahini', 'pita', "za'atar", 'zaatar', 'tzatziki', 'falafel', 'shawarma', 'couscous'],
}

PROTEIN_KEYWORDS = {
    'Chicken': ['chicken'],
    'Beef': ['beef', 'steak', 'ground beef', 'brisket', 'short rib'],
    'Pork': ['pork', 'bacon', 'sausage', 'ham', 'prosciutto', 'pulled pork', 'pork chop'],
    'Seafood': ['salmon', 'shrimp', 'fish', 'tuna', 'cod', 'tilapia', 'crab', 'lobster', 'scallop', 'clam', 'mussel', 'halibut', 'swordfish', 'trout', 'mahi'],
    'Lamb': ['lamb'],
}

COOKING_STYLE = {
    'Grilled': ['grill', 'grilled', 'bbq', 'barbecue', 'charred'],
    'Slow cooker': ['slow cooker', 'crockpot', 'crock pot', 'braised', 'braise'],
    'Instant pot': ['instant pot', 'pressure cooker'],
    'One pot': ['one pot', 'one-pot', 'sheet pan', 'sheet-pan', 'skillet dinner'],
    'Quick': ['15 minute', '15-minute', '20 minute', '20-minute', '30 minute', '30-minute', 'quick', 'easy', 'weeknight'],
}


def auto_categorize(title, ingredient_names):
    """Return a list of auto-assigned category tags."""
    tags = set()
    title_lower = title.lower() if title else ''
    all_text = title_lower + ' ' + ' '.join(name.lower() for name in ingredient_names)

    # Dish types (title-only for most, all_text for pasta)
    for category, keywords in DISH_TYPES.items():
        search_in = all_text if category == 'Pasta' else title_lower
        if any(kw in search_in for kw in keywords):
            tags.add(category)

    # Meal types (search all text)
    for meal_type, keywords in MEAL_TYPES.items():
        if any(kw in all_text for kw in keywords):
            tags.add(meal_type)

    # Cuisine (search all text)
    for cuisine, keywords in CUISINE_KEYWORDS.items():
        if any(kw in all_text for kw in keywords):
            tags.add(cuisine)

    # Proteins (search all text)
    for protein, keywords in PROTEIN_KEYWORDS.items():
        if any(kw in all_text for kw in keywords):
            tags.add(protein)

    # Cooking style (title only)
    for style, keywords in COOKING_STYLE.items():
        if any(kw in title_lower for kw in keywords):
            tags.add(style)

    # Vegetarian if no meat detected
    meat_tags = {'Chicken', 'Beef', 'Pork', 'Seafood', 'Lamb'}
    if not tags.intersection(meat_tags):
        tags.add('Vegetarian')

    return sorted(tags)
