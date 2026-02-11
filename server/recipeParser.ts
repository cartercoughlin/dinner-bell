import * as cheerio from 'cheerio';
import crypto from 'node:crypto';
import axios from 'axios';

interface ParsedRecipe {
  title: string;
  ingredients: Array<{ id: string; name: string; amount: string; unit: string }>;
  directions: string[];
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  sourceUrl: string;
  tags?: string[];
  tools?: string[];
  imageUrl?: string;
}

// Rotate through realistic browser User-Agent strings to reduce fingerprinting
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0',
];

function pickUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// Build headers that look like a real browser visit from a Google search result
function buildHeaders(url: string, userAgent: string): Record<string, string> {
  const { hostname } = new URL(url);
  return {
    'User-Agent': userAgent,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer': `https://www.google.com/search?q=${encodeURIComponent(hostname)}+recipe`,
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'cross-site',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0',
  };
}

export async function parseRecipeFromUrl(url: string): Promise<ParsedRecipe> {
  const errors: string[] = [];

  // --- Attempt 1: Direct fetch with realistic headers ---
  try {
    console.log(`[Attempt 1] Direct fetch: ${url}`);
    const html = await fetchWithAxios(url);
    const recipe = extractRecipe(html, url);
    if (recipe) {
      console.log(`✓ Parsed recipe on first attempt`);
      return recipe;
    }
    errors.push('Direct fetch returned HTML but recipe data was incomplete');
  } catch (err: any) {
    errors.push(`Direct fetch failed: ${err.message}`);
    console.log(`⚠ Attempt 1 failed: ${err.message}`);
  }

  // --- Attempt 2: Retry with a different User-Agent and slight delay ---
  await delay(1000);
  try {
    console.log(`[Attempt 2] Retry with different UA: ${url}`);
    const html = await fetchWithAxios(url, { freshUA: true });
    const recipe = extractRecipe(html, url);
    if (recipe) {
      console.log(`✓ Parsed recipe on retry`);
      return recipe;
    }
    errors.push('Retry returned HTML but recipe data was incomplete');
  } catch (err: any) {
    errors.push(`Retry failed: ${err.message}`);
    console.log(`⚠ Attempt 2 failed: ${err.message}`);
  }

  // --- Attempt 3: Try Google webcache ---
  try {
    console.log(`[Attempt 3] Google webcache: ${url}`);
    const cacheUrl = `https://webcache.googleusercontent.com/search?q=cache:${encodeURIComponent(url)}`;
    const html = await fetchWithAxios(cacheUrl);
    const recipe = extractRecipe(html, url);
    if (recipe) {
      console.log(`✓ Parsed recipe from Google cache`);
      return recipe;
    }
    errors.push('Google cache returned HTML but recipe data was incomplete');
  } catch (err: any) {
    errors.push(`Google cache failed: ${err.message}`);
    console.log(`⚠ Attempt 3 failed: ${err.message}`);
  }

  // All attempts exhausted — return the best partial result or throw
  console.error(`All attempts failed for ${url}:`, errors);
  throw new Error(
    `Could not extract a complete recipe from this URL. The site may require JavaScript or have strong anti-bot protections. Try copy-pasting the recipe text manually.`
  );
}

/**
 * Fetch HTML from a URL with browser-like headers.
 */
async function fetchWithAxios(url: string, opts?: { freshUA?: boolean }): Promise<string> {
  const ua = opts?.freshUA ? pickUserAgent() : USER_AGENTS[0];
  const headers = buildHeaders(url, ua);

  const response = await axios.get(url, {
    timeout: 15000,
    headers,
    maxRedirects: 5,
    // Accept any 2xx status
    validateStatus: (status) => status >= 200 && status < 300,
  });

  return response.data;
}

/**
 * Try every extraction strategy on the HTML and return the first valid result.
 */
function extractRecipe(html: string, sourceUrl: string): ParsedRecipe | null {
  const $ = cheerio.load(html);

  // Strategy 1: schema.org JSON-LD (most reliable, used by 90%+ of recipe sites)
  const schemaRecipe = parseSchemaOrgRecipe($, sourceUrl);
  if (schemaRecipe && isValidRecipe(schemaRecipe)) {
    return schemaRecipe;
  }

  // Strategy 2: Microdata (schema.org via itemtype attributes)
  const microdataRecipe = parseMicrodataRecipe($, sourceUrl);
  if (microdataRecipe && isValidRecipe(microdataRecipe)) {
    return microdataRecipe;
  }

  // Strategy 3: HTML heuristic parsing (class names, common patterns)
  const htmlRecipe = parseHtmlRecipe($, sourceUrl);
  if (htmlRecipe && isValidRecipe(htmlRecipe)) {
    return htmlRecipe;
  }

  return null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isValidRecipe(recipe: ParsedRecipe): boolean {
  return !!(
    recipe.title &&
    recipe.title !== 'Untitled Recipe' &&
    recipe.ingredients.length > 0 &&
    recipe.directions.length > 0 &&
    !recipe.directions[0].includes('No directions found')
  );
}

// ---------------------------------------------------------------------------
// Strategy 1: JSON-LD schema.org
// ---------------------------------------------------------------------------

function isRecipeType(type: any): boolean {
  if (type === 'Recipe') return true;
  if (Array.isArray(type) && type.includes('Recipe')) return true;
  return false;
}

function parseSchemaOrgRecipe($: cheerio.CheerioAPI, sourceUrl: string): ParsedRecipe | null {
  try {
    const scripts = $('script[type="application/ld+json"]');

    for (let i = 0; i < scripts.length; i++) {
      const scriptContent = $(scripts[i]).html();
      if (!scriptContent) continue;

      try {
        const data = JSON.parse(scriptContent);
        const items = Array.isArray(data) ? data : [data];

        let recipe: any = null;

        for (const item of items) {
          if (isRecipeType(item['@type'])) {
            recipe = item;
            break;
          }
          if (item['@graph'] && Array.isArray(item['@graph'])) {
            recipe = item['@graph'].find((subItem: any) => isRecipeType(subItem['@type']));
            if (recipe) break;
          }
        }

        if (recipe) {
          return {
            title: recipe.name || 'Untitled Recipe',
            ingredients: parseIngredients(recipe.recipeIngredient || []),
            directions: parseDirections(recipe.recipeInstructions || []),
            prepTime: parseTime(recipe.prepTime),
            cookTime: parseTime(recipe.cookTime),
            servings: parseServings(recipe.recipeYield),
            sourceUrl,
            tags: parseKeywords(recipe.keywords),
            imageUrl: parseImage(recipe.image),
          };
        }
      } catch {
        continue;
      }
    }

    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Strategy 2: Microdata (itemtype="http://schema.org/Recipe")
// ---------------------------------------------------------------------------

function parseMicrodataRecipe($: cheerio.CheerioAPI, sourceUrl: string): ParsedRecipe | null {
  try {
    const recipeNode = $('[itemtype*="schema.org/Recipe"]');
    if (recipeNode.length === 0) return null;

    const title = recipeNode.find('[itemprop="name"]').first().text().trim() || 'Untitled Recipe';

    const ingredientEls = recipeNode.find('[itemprop="recipeIngredient"], [itemprop="ingredients"]');
    const ingredientTexts: string[] = [];
    ingredientEls.each((_, el) => {
      const text = $(el).text().trim();
      if (text) ingredientTexts.push(text);
    });

    const instructionEls = recipeNode.find('[itemprop="recipeInstructions"]');
    const directionTexts: string[] = [];
    instructionEls.each((_, el) => {
      // Could be a single block of text or individual steps
      const steps = $(el).find('[itemprop="step"], [itemprop="text"], li');
      if (steps.length > 0) {
        steps.each((_, step) => {
          const text = $(step).text().trim();
          if (text) directionTexts.push(text);
        });
      } else {
        const text = $(el).text().trim();
        if (text) {
          // Split on newlines if it's a big block
          text.split(/\n+/).forEach((line) => {
            const trimmed = line.trim();
            if (trimmed) directionTexts.push(trimmed);
          });
        }
      }
    });

    const prepTimeStr = recipeNode.find('[itemprop="prepTime"]').attr('content') ||
      recipeNode.find('[itemprop="prepTime"]').attr('datetime') || '';
    const cookTimeStr = recipeNode.find('[itemprop="cookTime"]').attr('content') ||
      recipeNode.find('[itemprop="cookTime"]').attr('datetime') || '';
    const yieldStr = recipeNode.find('[itemprop="recipeYield"]').text().trim();
    const imageEl = recipeNode.find('[itemprop="image"]').first();
    const imageUrl = imageEl.attr('src') || imageEl.attr('content') || undefined;

    return {
      title,
      ingredients: parseIngredients(ingredientTexts),
      directions: directionTexts.length > 0 ? directionTexts : ['No directions found. Please add them manually.'],
      prepTime: parseTime(prepTimeStr),
      cookTime: parseTime(cookTimeStr),
      servings: parseServings(yieldStr),
      sourceUrl,
      imageUrl,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Strategy 3: HTML heuristic parsing
// ---------------------------------------------------------------------------

function parseHtmlRecipe($: cheerio.CheerioAPI, sourceUrl: string): ParsedRecipe {
  const title = $('h1').first().text().trim() ||
    $('[class*="recipe-title"]').first().text().trim() ||
    $('[class*="entry-title"]').first().text().trim() ||
    'Untitled Recipe';

  // Try to find ingredients
  const ingredients: string[] = [];
  const ingredientSelectors = [
    '.recipe-ingredients li',
    '.ingredients li',
    '[class*="ingredient"] li',
    '.wprm-recipe-ingredient',
    '.tasty-recipe-ingredients li',
    '.mntl-structured-ingredients__list-item',
  ];

  $(ingredientSelectors.join(', ')).each((_, el) => {
    const text = $(el).text().trim().replace(/\s+/g, ' ');
    if (text && text.length > 0 && text.length < 200) {
      ingredients.push(text);
    }
  });

  // Try to find directions
  const directions: string[] = [];
  const directionSelectors = [
    '.recipe-instructions li',
    '.directions li',
    '[class*="instruction"] li',
    '.wprm-recipe-instruction',
    '.tasty-recipe-instructions li',
    '[class*="step"] p',
    '.mntl-sc-block-group--OL li',
  ];

  $(directionSelectors.join(', ')).each((_, el) => {
    const text = $(el).text().trim().replace(/\s+/g, ' ');
    if (text && text.length > 0 && !text.match(/^(instructions?|directions?):?$/i) && text.length < 1000) {
      directions.push(text);
    }
  });

  // Try to find servings
  const servingsText = $('[class*="serving"], [class*="yield"]').first().text();
  const servingsMatch = servingsText.match(/(\d+)/);
  const servings = servingsMatch ? parseInt(servingsMatch[1]) : undefined;

  // Try to find image
  const imageUrl = $('[class*="recipe"] img, [class*="featured"] img').first().attr('src') ||
    $('img[class*="wp-post-image"]').first().attr('src') ||
    $('meta[property="og:image"]').attr('content');

  return {
    title,
    ingredients: parseIngredients(ingredients),
    directions: directions.length > 0 ? directions : ['No directions found. Please add them manually.'],
    servings,
    sourceUrl,
    imageUrl: imageUrl ? (imageUrl.startsWith('http') ? imageUrl : new URL(imageUrl, sourceUrl).href) : undefined,
  };
}

// ---------------------------------------------------------------------------
// Shared parsing helpers
// ---------------------------------------------------------------------------

const COMMON_UNITS = [
  'cup', 'cups', 'tablespoon', 'tablespoons', 'tbsp', 'tbsps', 'teaspoon', 'teaspoons', 'tsp', 'tsps',
  'ounce', 'ounces', 'oz', 'pound', 'pounds', 'lb', 'lbs', 'gram', 'grams', 'g', 'kilogram', 'kilograms', 'kg',
  'milliliter', 'milliliters', 'ml', 'liter', 'liters', 'l', 'pinch', 'pinches', 'dash', 'dashes', 'clove', 'cloves',
  'can', 'cans', 'package', 'packages', 'pkg', 'container', 'containers', 'jar', 'jars', 'bottle', 'bottles',
  'slice', 'slices', 'piece', 'pieces', 'head', 'heads', 'bunch', 'bunches', 'sprig', 'sprigs', 'stalk', 'stalks',
  'clove', 'cloves', 'ear', 'ears', 'inch', 'inches'
];

export function parseIngredients(ingredientList: string[]): Array<{ id: string; name: string; amount: string; unit: string }> {
  return ingredientList.map((ingredient) => {
    let cleaned = ingredient.trim()
      .replace(/^([A-Z|]|\d{1,2}[.,])\s+/, '')
      .replace(/^[^a-zA-Z\d(¼-¾)]+\s*/, '')
      .replace(/\s+/g, ' ');

    const amountRegex = /^(\d+\s+\d\/\d|\d+\/\d|\d+(\.\d+)?|\d+)?\s*/;
    const amountMatch = cleaned.match(amountRegex);

    let amount = '';
    let remaining = cleaned;

    if (amountMatch && amountMatch[1]) {
      amount = amountMatch[1].trim();
      remaining = cleaned.substring(amountMatch[0].length).trim();
    }

    let unit = '';
    const words = remaining.split(' ');
    if (words.length > 0) {
      const firstWord = words[0].toLowerCase().replace(/[.,]/g, '');
      if (COMMON_UNITS.includes(firstWord)) {
        unit = words[0];
        remaining = words.slice(1).join(' ');
      } else if (words.length > 1) {
        const twoWords = (words[0] + ' ' + words[1]).toLowerCase().replace(/[.,]/g, '');
        if (COMMON_UNITS.includes(twoWords)) {
          unit = words[0] + ' ' + words[1];
          remaining = words.slice(2).join(' ');
        }
      }
    }

    const name = remaining.trim() || cleaned;
    const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);

    return {
      id: crypto.randomUUID(),
      name: capitalizedName,
      amount,
      unit,
    };
  });
}

function parseDirections(instructions: any): string[] {
  if (Array.isArray(instructions)) {
    return instructions.flatMap((instruction) => {
      if (typeof instruction === 'string') {
        return [instruction.trim()];
      }
      if (instruction.text) {
        return [instruction.text.trim()];
      }
      if (instruction['@type'] === 'HowToStep' && instruction.text) {
        return [instruction.text.trim()];
      }
      if (instruction['@type'] === 'HowToSection' && instruction.itemListElement) {
        return parseDirections(instruction.itemListElement);
      }
      return [];
    }).filter(Boolean);
  }

  if (typeof instructions === 'string') {
    if (instructions.includes('\n')) {
      return instructions.split(/\n+/).map((s) => s.trim()).filter(Boolean);
    }
    return [instructions.trim()];
  }

  return [];
}

function parseTime(timeString?: string): number | undefined {
  if (!timeString) return undefined;

  const match = timeString.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (match) {
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    return hours * 60 + minutes;
  }

  return undefined;
}

function parseServings(yield_?: any): number | undefined {
  if (!yield_) return undefined;

  if (typeof yield_ === 'number') {
    return yield_;
  }

  if (typeof yield_ === 'string') {
    const match = yield_.match(/(\d+)/);
    return match ? parseInt(match[1]) : undefined;
  }

  if (Array.isArray(yield_) && yield_.length > 0) {
    return parseServings(yield_[0]);
  }

  return undefined;
}

function parseKeywords(keywords?: any): string[] | undefined {
  if (!keywords) return undefined;

  if (Array.isArray(keywords)) {
    return keywords.filter((k) => typeof k === 'string');
  }

  if (typeof keywords === 'string') {
    return keywords.split(',').map((k) => k.trim()).filter(Boolean);
  }

  return undefined;
}

function parseImage(image?: any): string | undefined {
  if (!image) return undefined;

  if (typeof image === 'string') {
    return image;
  }

  if (Array.isArray(image) && image.length > 0) {
    const first = image[0];
    return typeof first === 'string' ? first : first?.url;
  }

  if (image.url) {
    return image.url;
  }

  return undefined;
}
