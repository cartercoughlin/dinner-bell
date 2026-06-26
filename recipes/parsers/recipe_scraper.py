import json
import re
import time
import random
from html import unescape as html_unescape
from urllib.parse import urlparse, quote

import requests
from bs4 import BeautifulSoup

from .ingredient_parser import parse_ingredients

USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0',
]


def _pick_user_agent():
    return random.choice(USER_AGENTS)


def _build_headers(url, user_agent):
    hostname = urlparse(url).hostname or ''
    return {
        'User-Agent': user_agent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate',
        'Referer': f'https://www.google.com/search?q={quote(hostname)}+recipe',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'cross-site',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
    }


def _fetch_html(url, session, fresh_ua=False):
    ua = _pick_user_agent() if fresh_ua else USER_AGENTS[0]
    headers = _build_headers(url, ua)
    resp = session.get(url, headers=headers, timeout=15, allow_redirects=True)
    resp.raise_for_status()
    # Use detected encoding, falling back to utf-8 to avoid mojibake
    resp.encoding = resp.apparent_encoding or 'utf-8'
    return resp.text


def _try_wayback_machine(url, session):
    """Fetch via Internet Archive Wayback Machine — bypasses Cloudflare/CDN caches."""
    try:
        api_url = f'https://archive.org/wayback/available?url={quote(url)}'
        r = session.get(api_url, timeout=10)
        r.raise_for_status()
        snapshot = r.json().get('archived_snapshots', {}).get('closest', {})
        if snapshot.get('available') and snapshot.get('url'):
            return _fetch_html(snapshot['url'], session)
    except Exception:
        pass
    return None


def parse_recipe_from_url(url):
    """Try up to 3 strategies to fetch and parse a recipe from a URL."""
    errors = []
    session = requests.Session()

    # Attempt 1: Direct fetch
    try:
        html = _fetch_html(url, session)
        recipe = _extract_recipe(html, url)
        if recipe:
            return recipe
        errors.append('Direct fetch returned HTML but recipe data was incomplete')
    except Exception as e:
        errors.append(f'Direct fetch failed: {e}')

    # Attempt 2: Retry with different UA
    time.sleep(1)
    try:
        html = _fetch_html(url, session, fresh_ua=True)
        recipe = _extract_recipe(html, url)
        if recipe:
            return recipe
        errors.append('Retry returned HTML but recipe data was incomplete')
    except Exception as e:
        errors.append(f'Retry failed: {e}')

    # Attempt 3: Wayback Machine snapshot (bypasses bot detection on popular recipe sites)
    try:
        html = _try_wayback_machine(url, session)
        if html:
            recipe = _extract_recipe(html, url)
            if recipe:
                return recipe
            errors.append('Wayback Machine returned HTML but recipe data was incomplete')
        else:
            errors.append('Wayback Machine: no snapshot available')
    except Exception as e:
        errors.append(f'Wayback Machine failed: {e}')

    raise ValueError(
        'Could not extract a complete recipe from this URL. '
        'The site may require JavaScript or have strong anti-bot protections. '
        'Try copy-pasting the recipe text manually.'
    )


def _extract_recipe(html, source_url):
    # Use lxml if available (handles large/complex HTML much better), fall back to html.parser
    try:
        soup = BeautifulSoup(html, 'lxml')
    except Exception:
        soup = BeautifulSoup(html, 'html.parser')

    for strategy in [_parse_schema_org_regex, _parse_schema_org, _parse_microdata, _parse_html_heuristic]:
        recipe = strategy(html if strategy == _parse_schema_org_regex else soup, source_url)
        if recipe and _is_valid(recipe):
            return recipe
    return None


def _is_valid(recipe):
    return bool(
        recipe.get('title')
        and recipe['title'] != 'Untitled Recipe'
        and recipe.get('ingredients')
        and recipe.get('directions')
        and 'No directions found' not in recipe['directions'][0]
    )


# --- Strategy 0: Regex-based JSON-LD (handles heavy ad-script pages where BS4 misses tags) ---

def _parse_schema_org_regex(html, source_url):
    """Extract JSON-LD directly from raw HTML using regex — bypasses parser issues."""
    try:
        # Match type="application/ld+json" and variants like type="application/ld+json;charset=utf-8"
        blocks = re.findall(
            r'<script[^>]*type=["\']application/ld\+json[^"\']*["\'][^>]*>(.*?)</script>',
            html, re.DOTALL,
        )
        for block in blocks:
            try:
                # Some CMSes HTML-encode JSON-LD content (e.g. &amp; instead of &)
                data = json.loads(html_unescape(block.strip()))
            except (json.JSONDecodeError, TypeError):
                continue
            recipe_data = _find_recipe_in_jsonld(data)
            if recipe_data:
                return _recipe_from_schema(recipe_data, source_url)
    except Exception:
        pass
    return None


def _find_recipe_in_jsonld(data):
    """Recursively search JSON-LD data for a Recipe object."""
    if isinstance(data, list):
        for item in data:
            result = _find_recipe_in_jsonld(item)
            if result:
                return result
    elif isinstance(data, dict):
        if _is_recipe_type(data.get('@type')):
            return data
        for key in ('@graph', 'itemListElement'):
            if key in data and isinstance(data[key], list):
                result = _find_recipe_in_jsonld(data[key])
                if result:
                    return result
    return None


def _recipe_from_schema(recipe_data, source_url):
    """Convert a schema.org Recipe dict to our standard format."""
    return {
        'title': recipe_data.get('name', 'Untitled Recipe'),
        'ingredients': parse_ingredients(recipe_data.get('recipeIngredient', [])),
        'directions': _parse_directions(recipe_data.get('recipeInstructions', [])),
        'prepTime': _parse_time(recipe_data.get('prepTime')),
        'cookTime': _parse_time(recipe_data.get('cookTime')),
        'servings': _parse_servings(recipe_data.get('recipeYield')),
        'sourceUrl': source_url,
        'tags': _parse_keywords(recipe_data.get('keywords')),
        'imageUrl': _parse_image(recipe_data.get('image')),
    }


# --- Strategy 1: JSON-LD schema.org (BS4) ---

def _parse_schema_org(soup, source_url):
    try:
        # Use regex to handle type variants like "application/ld+json;charset=utf-8"
        for script in soup.find_all('script', type=re.compile(r'application/ld\+json')):
            try:
                raw = script.string or ''
                data = json.loads(html_unescape(raw.strip()))
            except (json.JSONDecodeError, TypeError):
                continue
            recipe_data = _find_recipe_in_jsonld(data)
            if recipe_data:
                return _recipe_from_schema(recipe_data, source_url)
    except Exception:
        pass
    return None


def _is_recipe_type(type_val):
    if type_val == 'Recipe':
        return True
    if isinstance(type_val, list) and 'Recipe' in type_val:
        return True
    return False


# --- Strategy 2: Microdata ---

def _parse_microdata(soup, source_url):
    try:
        recipe_node = soup.find(attrs={'itemtype': re.compile(r'schema\.org/Recipe')})
        if not recipe_node:
            return None

        # Find itemprop="name" that isn't inside a Person/Organization node
        title = 'Untitled Recipe'
        for name_el in recipe_node.find_all(attrs={'itemprop': 'name'}):
            # Skip if this name belongs to a nested Person/Organization schema
            parent = name_el.parent
            inside_person = False
            while parent and parent != recipe_node:
                parent_type = parent.get('itemtype', '')
                if 'Person' in parent_type or 'Organization' in parent_type:
                    inside_person = True
                    break
                parent = parent.parent
            if not inside_person:
                title = name_el.get_text(strip=True)
                break

        ingredient_els = recipe_node.find_all(attrs={'itemprop': re.compile(r'recipeIngredient|ingredients')})
        ingredient_texts = [el.get_text(strip=True) for el in ingredient_els if el.get_text(strip=True)]

        instruction_els = recipe_node.find_all(attrs={'itemprop': 'recipeInstructions'})
        direction_texts = []
        for el in instruction_els:
            steps = el.find_all(attrs={'itemprop': re.compile(r'step|text')})
            if not steps:
                steps = el.find_all('li')
            if steps:
                for step in steps:
                    text = step.get_text(strip=True)
                    if text:
                        direction_texts.append(text)
            else:
                text = el.get_text(strip=True)
                if text:
                    direction_texts.extend(line.strip() for line in text.split('\n') if line.strip())

        prep_el = recipe_node.find(attrs={'itemprop': 'prepTime'})
        prep_str = (prep_el.get('content') or prep_el.get('datetime') or '') if prep_el else ''
        cook_el = recipe_node.find(attrs={'itemprop': 'cookTime'})
        cook_str = (cook_el.get('content') or cook_el.get('datetime') or '') if cook_el else ''
        yield_el = recipe_node.find(attrs={'itemprop': 'recipeYield'})
        yield_str = yield_el.get_text(strip=True) if yield_el else ''
        image_el = recipe_node.find(attrs={'itemprop': 'image'})
        image_url = (image_el.get('src') or image_el.get('content')) if image_el else None

        return {
            'title': title,
            'ingredients': parse_ingredients(ingredient_texts),
            'directions': direction_texts or ['No directions found. Please add them manually.'],
            'prepTime': _parse_time(prep_str),
            'cookTime': _parse_time(cook_str),
            'servings': _parse_servings(yield_str),
            'sourceUrl': source_url,
            'imageUrl': image_url,
        }
    except Exception:
        return None


# --- Strategy 3: HTML heuristics ---

def _parse_html_heuristic(soup, source_url):
    h1 = soup.find('h1')
    title = (h1.get_text(strip=True) if h1 else None) or 'Untitled Recipe'

    ingredient_selectors = [
        '.recipe-ingredients li', '.ingredients li', '[class*="ingredient"] li',
        '.wprm-recipe-ingredient', '.tasty-recipe-ingredients li',
        '.mntl-structured-ingredients__list-item',
    ]
    ingredients = []
    for sel in ingredient_selectors:
        for el in soup.select(sel):
            text = re.sub(r'\s+', ' ', el.get_text(strip=True))
            if text and len(text) < 200:
                ingredients.append(text)
    # deduplicate while preserving order
    seen = set()
    unique_ingredients = []
    for ing in ingredients:
        if ing not in seen:
            seen.add(ing)
            unique_ingredients.append(ing)

    direction_selectors = [
        '.recipe-instructions li', '.directions li', '[class*="instruction"] li',
        '.wprm-recipe-instruction', '.tasty-recipe-instructions li',
        '[class*="step"] p', '.mntl-sc-block-group--OL li',
    ]
    directions = []
    for sel in direction_selectors:
        for el in soup.select(sel):
            text = re.sub(r'\s+', ' ', el.get_text(strip=True))
            if text and len(text) < 1000 and not re.match(r'^(instructions?|directions?):?$', text, re.I):
                directions.append(text)

    servings_el = soup.select_one('[class*="serving"], [class*="yield"]')
    servings = None
    if servings_el:
        m = re.search(r'(\d+)', servings_el.get_text())
        if m:
            servings = int(m.group(1))

    image_el = (
        soup.select_one('[class*="recipe"] img, [class*="featured"] img')
        or soup.select_one('img[class*="wp-post-image"]')
    )
    image_url = image_el.get('src') if image_el else None
    if not image_url:
        og = soup.find('meta', property='og:image')
        if og:
            image_url = og.get('content')

    return {
        'title': title,
        'ingredients': parse_ingredients(unique_ingredients),
        'directions': directions or ['No directions found. Please add them manually.'],
        'servings': servings,
        'sourceUrl': source_url,
        'imageUrl': image_url,
    }


# --- Shared helpers ---

def _parse_directions(instructions):
    if isinstance(instructions, list):
        results = []
        for item in instructions:
            if isinstance(item, str):
                results.extend(_split_numbered_steps(item.strip()))
            elif isinstance(item, dict):
                if item.get('text'):
                    results.extend(_split_numbered_steps(item['text'].strip()))
                elif item.get('@type') == 'HowToSection' and item.get('itemListElement'):
                    results.extend(_parse_directions(item['itemListElement']))
        return [r for r in results if r]
    if isinstance(instructions, str):
        return _split_numbered_steps(instructions)
    return []


def _split_numbered_steps(text):
    """Split a block of text that contains numbered steps (e.g. '1. Do X 2. Do Y')."""
    if not text:
        return []
    # First try splitting on newlines
    if '\n' in text:
        lines = [s.strip() for s in text.split('\n') if s.strip()]
        if len(lines) > 1:
            return [re.sub(r'^\d+\.\s*', '', line) for line in lines]
    # Try splitting on numbered patterns like "1. ... 2. ..."
    # Handles cases with or without space before the number (e.g., "dish.3. Arrange")
    parts = re.split(r'(?:^|(?<=\.)|\s)(\d+)\.\s*', text)
    if len(parts) > 3:  # At least 2 numbered steps found
        steps = []
        for i in range(2, len(parts), 2):
            step = parts[i].strip()
            if step:
                steps.append(step)
        if steps:
            return steps
    return [text.strip()]


def _parse_time(time_string):
    if not time_string:
        return None
    m = re.match(r'PT(?:(\d+)H)?(?:(\d+)M)?', str(time_string))
    if m:
        hours = int(m.group(1) or 0)
        minutes = int(m.group(2) or 0)
        return hours * 60 + minutes
    return None


def _parse_servings(yield_val):
    if not yield_val:
        return None
    if isinstance(yield_val, (int, float)):
        return int(yield_val)
    if isinstance(yield_val, str):
        m = re.search(r'(\d+)', yield_val)
        return int(m.group(1)) if m else None
    if isinstance(yield_val, list) and yield_val:
        return _parse_servings(yield_val[0])
    return None


def _parse_keywords(keywords):
    if not keywords:
        return None
    if isinstance(keywords, list):
        tags = [k for k in keywords if isinstance(k, str)]
    elif isinstance(keywords, str):
        tags = [k.strip() for k in keywords.split(',') if k.strip()]
    else:
        return None
    return _clean_tags(tags)


# Prefixes and patterns that indicate metadata, not real tags
_JUNK_TAG_PREFIXES = (
    'content-type:', 'contentid:', 'locale:', 'displaytype:',
    'shorttitle:', 'subsection:', 'totaltime:', 'filtertime:',
    'occasion:', 'category:', 'collection:',
)

_JUNK_TAG_PATTERNS = re.compile(
    r'^[0-9a-f]{8}-[0-9a-f]{4}-|'   # UUIDs
    r'^\d{2}:\d{2}:\d{2}$|'          # time durations like 00:35:00
    r'^<\d+',                          # time filters like <1HR
    re.IGNORECASE,
)


def _clean_tags(tags):
    """Filter out metadata junk from scraped keyword tags."""
    cleaned = []
    seen = set()
    for tag in tags:
        tag = tag.strip()
        if not tag or len(tag) > 50:
            continue
        tag_lower = tag.lower()
        # Skip metadata prefixes
        if any(tag_lower.startswith(p) for p in _JUNK_TAG_PREFIXES):
            continue
        # Skip junk patterns
        if _JUNK_TAG_PATTERNS.search(tag):
            continue
        # Deduplicate case-insensitively
        if tag_lower in seen:
            continue
        seen.add(tag_lower)
        cleaned.append(tag)
    return cleaned or None


def _parse_image(image):
    if not image:
        return None
    if isinstance(image, str):
        return image
    if isinstance(image, list) and image:
        first = image[0]
        return first if isinstance(first, str) else first.get('url')
    if isinstance(image, dict):
        return image.get('url')
    return None
