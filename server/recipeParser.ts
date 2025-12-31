import * as cheerio from 'cheerio';
import crypto from 'node:crypto';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// @ts-ignore
puppeteer.use(StealthPlugin());

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

export async function parseRecipeFromUrl(url: string): Promise<ParsedRecipe> {
  let browser;
  try {
    console.log(`Fetching URL with Puppeteer: ${url}`);

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Set a realistic viewport
    await page.setViewport({ width: 1280, height: 800 });

    // Set realistic headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
    });

    // Navigate to the URL
    let response;
    try {
      response = await page.goto(url, {
        waitUntil: 'load',
        timeout: 45000,
      });
    } catch (e: any) {
      if (e.message.includes('detached')) {
        console.log('Frame detached, retrying once...');
        response = await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 45000,
        });
      } else {
        throw e;
      }
    }

    // Wait for any final JS content to stabilize
    await new Promise(resolve => setTimeout(resolve, 3000));

    if (!response || !response.ok()) {
      const status = response ? response.status() : 'unknown';
      // If it's a redirect, we might still have content we can parse
      if (status !== 301 && status !== 302 && status !== 'unknown') {
        throw new Error(`Failed to load page: status ${status}`);
      }
    }

    // Get the HTML content from the main frame
    const html = await page.evaluate(() => document.documentElement.outerHTML);
    const $ = cheerio.load(html);

    // Try to parse schema.org JSON-LD first (most reliable)
    const schemaRecipe = parseSchemaOrgRecipe($, url);
    if (schemaRecipe) {
      return schemaRecipe;
    }

    // Fallback to HTML parsing
    return parseHtmlRecipe($, url);
  } catch (error) {
    throw error;
  } finally {
    if (browser) {
      await browser.close().catch(console.error);
    }
  }
}

function isRecipeType(type: any): boolean {
  if (type === 'Recipe') return true;
  if (Array.isArray(type) && type.includes('Recipe')) return true;
  return false;
}

function parseSchemaOrgRecipe($: cheerio.CheerioAPI, sourceUrl: string): ParsedRecipe | null {
  try {
    // Look for JSON-LD script tags with Recipe schema
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
      } catch (parseError) {
        continue;
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

function parseHtmlRecipe($: cheerio.CheerioAPI, sourceUrl: string): ParsedRecipe {
  // Fallback HTML parsing for sites without schema.org
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
    '.tasty-recipe-ingredients li'
  ];

  $(ingredientSelectors.join(', ')).each((_, el) => {
    const text = $(el).text().trim().replace(/\s+/g, ' ');
    if (text && text.length > 0 && text.length < 200) { // Avoid picking up large text blocks
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
    '[class*="step"]'
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
    // Clean up the ingredient string and remove leading noise common in OCR
    // Remove things like "E ", "| ", "l ", etc at the very start
    let cleaned = ingredient.trim()
      .replace(/^([A-Z|]|\d{1,2}[.,])\s+/, '') // Remove single capital letter or index noise
      .replace(/^[^a-zA-Z\d(¼-¾)]+\s*/, '')   // Remove symbols
      .replace(/\s+/g, ' ');

    // 1. Try to find the amount (numbers, fractions, decimals at the start)
    // Updated regex to better handle fractions like 1/2 or 1 1/2
    const amountRegex = /^(\d+\s+\d\/\d|\d+\/\d|\d+(\.\d+)?|\d+)?\s*/;
    const amountMatch = cleaned.match(amountRegex);

    let amount = '';
    let remaining = cleaned;

    if (amountMatch && amountMatch[1]) {
      amount = amountMatch[1].trim();
      remaining = cleaned.substring(amountMatch[0].length).trim();
    }

    // 2. Try to find the unit
    let unit = '';
    const words = remaining.split(' ');
    if (words.length > 0) {
      // Check first word
      const firstWord = words[0].toLowerCase().replace(/[.,]/g, '');
      if (COMMON_UNITS.includes(firstWord)) {
        unit = words[0];
        remaining = words.slice(1).join(' ');
      } else if (words.length > 1) {
        // Check if first two words make a unit (e.g., "fluid oz")
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
    // Some sites put all steps in one string with newlines or numbers
    if (instructions.includes('\n')) {
      return instructions.split(/\n+/).map((s) => s.trim()).filter(Boolean);
    }
    // If it's a long string without obvious separators, we might have to just return it as one step
    return [instructions.trim()];
  }

  return [];
}

function parseTime(timeString?: string): number | undefined {
  if (!timeString) return undefined;

  // Parse ISO 8601 duration (e.g., PT15M, PT1H30M)
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
