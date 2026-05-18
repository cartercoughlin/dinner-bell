import html
import re
import uuid

COMMON_UNITS = [
    'cup', 'cups', 'tablespoon', 'tablespoons', 'tbsp', 'tbsps',
    'teaspoon', 'teaspoons', 'tsp', 'tsps', 'ounce', 'ounces', 'oz',
    'pound', 'pounds', 'lb', 'lbs', 'gram', 'grams', 'g',
    'kilogram', 'kilograms', 'kg', 'milliliter', 'milliliters', 'ml',
    'liter', 'liters', 'l', 'pinch', 'pinches', 'dash', 'dashes',
    'clove', 'cloves', 'can', 'cans', 'package', 'packages', 'pkg',
    'container', 'containers', 'jar', 'jars', 'bottle', 'bottles',
    'slice', 'slices', 'piece', 'pieces', 'head', 'heads',
    'bunch', 'bunches', 'sprig', 'sprigs', 'stalk', 'stalks',
    'ear', 'ears', 'inch', 'inches', 'box', 'bulb', 'bulbs'
]


def parse_ingredients(ingredient_list):
    """Parse a list of ingredient strings into structured dicts."""
    results = []
    for ingredient in ingredient_list:
        cleaned = ingredient.strip()
        # Decode HTML entities (&nbsp;, &amp;, etc.)
        cleaned = html.unescape(cleaned)
        cleaned = re.sub(r'^([A-Z|]|\d{1,2}[.,])\s+', '', cleaned)
        cleaned = re.sub(r'^[^a-zA-Z\d(\u00bc-\u00be)]+\s*', '', cleaned)
        cleaned = re.sub(r'\s+', ' ', cleaned)

        amount_match = re.match(r'^(\d+[\-\u2013]\d+(\.\d+)?|\d+\s+\d/\d|\d+/\d|\d+(\.\d+)?|\d+)?\s*', cleaned)
        amount = ''
        remaining = cleaned

        if amount_match and amount_match.group(1):
            amount = amount_match.group(1).strip()
            remaining = cleaned[amount_match.end():].strip()

        unit = ''
        words = remaining.split(' ')
        if words:
            first_word = re.sub(r'[.,]', '', words[0].lower())
            if first_word in COMMON_UNITS:
                unit = words[0]
                remaining = ' '.join(words[1:])
            elif len(words) > 1:
                two_words = re.sub(r'[.,]', '', (words[0] + ' ' + words[1]).lower())
                if two_words in COMMON_UNITS:
                    unit = words[0] + ' ' + words[1]
                    remaining = ' '.join(words[2:])

        name = remaining.strip() or cleaned
        name = name[0].upper() + name[1:] if name else name

        results.append({
            'id': str(uuid.uuid4()),
            'name': name,
            'amount': amount,
            'unit': unit,
        })
    return results
