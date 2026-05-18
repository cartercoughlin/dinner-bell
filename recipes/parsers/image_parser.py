import os
import re

from .ingredient_parser import parse_ingredients

try:
    import pytesseract
    from PIL import Image
    HAS_OCR = True
except ImportError:
    HAS_OCR = False


def parse_recipe_from_images(image_paths):
    """Extract recipe data from one or more images using OCR."""
    if not HAS_OCR:
        raise RuntimeError(
            'OCR dependencies (pytesseract, Pillow) are not installed. '
            'Install them with: pip install pytesseract Pillow'
        )

    combined_text = ''
    for path in image_paths:
        if not os.path.exists(path):
            continue
        if os.path.getsize(path) < 1000:
            continue
        img = Image.open(path)
        text = pytesseract.image_to_string(img, lang='eng')
        combined_text += text + '\n'

    lines = [l.strip() for l in combined_text.split('\n') if l.strip()]

    # Find title
    title = 'Imported Recipe'
    branding = re.compile(
        r'half[- \s]*baked|harvest|tieghan|gerard|calories|prep|cook|total|time|servings|recipe',
        re.I,
    )
    for line in lines[:15]:
        alpha_only = re.sub(r'[^a-zA-Z]', '', line).lower()
        if len(line) > 8 and not branding.search(line) and 'http' not in line and len(alpha_only) > 5:
            title = re.sub(r'^[|\u2014\-\s]+|[|\u2014\-\s]+$', '', line).strip()
            break

    ingredients = []
    directions = []
    servings = None
    prep_time = None
    cook_time = None

    current_section = 'none'

    ingredient_kw = re.compile(r"(ingredients|what you'll need|shopping list)", re.I)
    direction_kw = re.compile(r'(directions|instructions|steps|method|how to make)', re.I)
    servings_kw = re.compile(r'servings?:?\s*(\d+)', re.I)
    prep_kw = re.compile(r'prep\s*time:?\s*(\d+)', re.I)
    cook_kw = re.compile(r'cook\s*time:?\s*(\d+)', re.I)

    for line in lines:
        m = servings_kw.search(line)
        if m and servings is None:
            servings = int(m.group(1))
        m = prep_kw.search(line)
        if m and prep_time is None:
            prep_time = int(m.group(1))
        m = cook_kw.search(line)
        if m and cook_time is None:
            cook_time = int(m.group(1))

        if direction_kw.search(line):
            current_section = 'directions'
            continue
        if ingredient_kw.search(line) and current_section != 'directions':
            current_section = 'ingredients'
            continue

        if current_section == 'ingredients':
            cleaned = re.sub(r'^[^a-zA-Z0-9\d(\u00bc-\u00be)]+\s*', '', line).strip()
            if cleaned and len(cleaned) > 2:
                ingredients.append(cleaned)
        elif current_section == 'directions':
            cleaned = re.sub(r'^\d+\.?\s*(\d+\.?\s*)?', '', line)
            cleaned = re.sub(r'^[|\u2022\-]\s*', '', cleaned).strip()
            if cleaned and len(cleaned) > 3 and 'footer' not in cleaned and 'http' not in cleaned:
                directions.append(cleaned)

    if not ingredients and not directions:
        half = len(lines) // 2
        ingredients = lines[1:half]
        directions = lines[half:]

    return {
        'title': title,
        'ingredients': parse_ingredients(ingredients),
        'directions': directions or ['No directions found in scanning. Please add manually.'],
        'servings': servings,
        'prepTime': prep_time,
        'cookTime': cook_time,
    }
