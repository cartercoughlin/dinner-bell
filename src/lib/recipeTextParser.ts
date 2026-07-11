import { RecipeFormData } from '../types/recipe';
import { parseIngredients } from './parseIngredients';

const BRANDING =
  /half[- \s]*baked|harvest|tieghan|gerard|copyright|©|all rights|pinterest|instagram|facebook/i;

const INGREDIENT_HEADER =
  /\b(ingredients?|what you(?:'|')?ll need|shopping list|you will need|for the [a-z]+)\b/i;

const DIRECTION_HEADER =
  /\b(directions?|instructions?|steps?|method|how to (?:make|prepare)|preparation|procedure|to make)\b/i;

const META_LINE =
  /^(prep(?:aration)?|cook|total|ready in|yield|serves?|servings?|makes?|courses?|difficulty)\b/i;

const UNITS =
  /\b(cups?|c\.|tbsp|tablespoons?|tsp|teaspoons?|oz|ounces?|lb|lbs?|pounds?|g|grams?|kg|kilograms?|ml|milliliters?|liters?|l|pinch|dash|cans?|packages?|pkg|cloves?|heads?|bunches?|sprigs?|stalks?|slices?|pieces?|sticks?|bags?|boxes?|jars?|bottles?)\b/i;

const AMOUNT_START =
  /^[\s•\-*□■▪→]*((\d+\s+)?\d+\s*\/\s*\d+|\d+[.,]\d+|\d+|[¼½¾⅓⅔⅛⅜⅝⅞])\b/;

const STEP_START =
  /^[\s•\-*]*(?:step\s*)?(\d{1,2})(?:\s*[\.\):\-]|\s+(?=[A-Za-z]))/i;

const COOKING_VERBS =
  /\b(preheat|bake|roast|broil|grill|fry|sauté|saute|simmer|boil|steam|whisk|beat|stir|mix|combine|fold|blend|chop|dice|mince|slice|grate|peel|drain|rinse|season|salt|pepper|heat|warm|cool|chill|refrigerat|freeze|marinat|coat|toss|pour|drizzle|sprinkle|spread|layer|place|put|transfer|remove|set aside|cover|uncover|serve|garnish|reduce|bring|cook until|add the|add in|return to|let stand|allow to)\b/i;

type Section = 'none' | 'ingredients' | 'directions';

function normalizeRawText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[|]{2,}/g, ' ')
    .replace(/\t/g, ' ')
    .replace(/ +/g, ' ')
    .replace(/\n{3,}/g, '\n\n');
}

function splitLines(text: string): string[] {
  return normalizeRawText(text)
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

function isNoiseLine(line: string): boolean {
  if (line.length < 2) return true;
  if (/^\d{1,3}$/.test(line)) return true;
  if (/^page\s+\d+/i.test(line)) return true;
  if (/^https?:\/\//i.test(line)) return true;
  if (/^[\W\d]+$/.test(line)) return true;
  const alpha = line.replace(/[^a-zA-Z]/g, '');
  if (alpha.length < 2 && line.length < 12) return true;
  return false;
}

function detectSectionHeader(line: string): Section {
  const compact = line.replace(/[^a-zA-Z\s']/g, ' ').replace(/\s+/g, ' ').trim();
  if (compact.length > 48) return 'none';
  if (DIRECTION_HEADER.test(compact) && !INGREDIENT_HEADER.test(compact)) return 'directions';
  if (INGREDIENT_HEADER.test(compact) && !DIRECTION_HEADER.test(compact)) return 'ingredients';
  if (DIRECTION_HEADER.test(line)) return 'directions';
  if (INGREDIENT_HEADER.test(line)) return 'ingredients';
  return 'none';
}

function ingredientScore(line: string): number {
  let score = 0;
  const len = line.length;

  if (AMOUNT_START.test(line)) score += 4;
  if (UNITS.test(line)) score += 3;
  if (/^[\s•\-*□■▪→]+/.test(line) && len < 80) score += 2;
  if (len < 70) score += 1;
  if (len > 55 && COOKING_VERBS.test(line) && !UNITS.test(line)) score -= 2;
  if (STEP_START.test(line)) score -= 4;
  if (COOKING_VERBS.test(line) && len > 45) score -= 3;
  if (/\.\s+[A-Z]/.test(line) && len > 50) score -= 2;
  if (/^(and|or|plus)\s/i.test(line) && AMOUNT_START.test(line)) score += 1;

  return score;
}

function directionScore(line: string): number {
  let score = 0;
  const len = line.length;

  if (STEP_START.test(line)) score += 5;
  if (COOKING_VERBS.test(line)) score += 3;
  if (len > 55) score += 2;
  if (len > 90) score += 1;
  if (/[.!?]\s*$/.test(line) && len > 40) score += 1;
  if (AMOUNT_START.test(line) && UNITS.test(line) && len < 65) score -= 4;
  if (AMOUNT_START.test(line) && len < 45 && !COOKING_VERBS.test(line)) score -= 2;
  if (len < 25 && UNITS.test(line) && AMOUNT_START.test(line)) score -= 3;

  return score;
}

function cleanIngredientLine(line: string): string {
  return line
    .replace(/^[^a-zA-Z0-9\d(¼½¾⅓⅔⅛⅜⅝⅞)]+\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanDirectionLine(line: string): string {
  return line
    .replace(/^[\s•\-*□■▪→]+/, '')
    .replace(/^(?:step\s*)?\d{1,2}\s*[\.\):\-]\s*/i, '')
    .replace(/^\d{1,2}\s+(?=[A-Za-z])/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isContinuationOfDirection(line: string): boolean {
  if (STEP_START.test(line)) return false;
  if (AMOUNT_START.test(line) && UNITS.test(line)) return false;
  if (detectSectionHeader(line) !== 'none') return false;
  if (line.length < 8) return false;
  return !INGREDIENT_HEADER.test(line) && !DIRECTION_HEADER.test(line);
}

function extractTitle(lines: string[]): { title: string; startIndex: number } {
  for (let i = 0; i < Math.min(lines.length, 18); i++) {
    const line = lines[i];
    if (isNoiseLine(line) || META_LINE.test(line)) continue;
    if (detectSectionHeader(line) !== 'none') return { title: 'Imported Recipe', startIndex: i };

    const alphaOnly = line.replace(/[^a-zA-Z]/g, '');
    if (
      line.length > 6 &&
      line.length < 80 &&
      !BRANDING.test(line) &&
      !line.includes('http') &&
      alphaOnly.length > 4 &&
      !AMOUNT_START.test(line) &&
      !STEP_START.test(line)
    ) {
      return {
        title: line.replace(/^[|—\-\s]+|[|—\-\s]+$/g, '').trim(),
        startIndex: i + 1,
      };
    }
  }
  return { title: 'Imported Recipe', startIndex: 0 };
}

function extractMetadata(lines: string[]) {
  let servings: number | undefined;
  let prepTime: number | undefined;
  let cookTime: number | undefined;

  for (const line of lines) {
    const s = line.match(/\b(?:serves?|servings?|yield|makes?)\s*[:\-]?\s*(\d+)/i);
    if (s && !servings) servings = parseInt(s[1], 10);

    const prep = line.match(/\bprep(?:aration)?\s*(?:time)?\s*[:\-]?\s*(\d+)/i);
    if (prep && !prepTime) prepTime = parseInt(prep[1], 10);

    const cook = line.match(/\bcook(?:ing)?\s*(?:time)?\s*[:\-]?\s*(\d+)/i);
    if (cook && !cookTime) cookTime = parseInt(cook[1], 10);
  }

  return { servings, prepTime, cookTime };
}

function findBestSplitIndex(lines: string[]): number {
  const n = lines.length;
  if (n < 4) return Math.max(1, Math.floor(n / 2));

  let bestSplit = Math.floor(n / 2);
  let bestScore = -Infinity;

  const minSplit = Math.max(2, Math.floor(n * 0.2));
  const maxSplit = Math.min(n - 2, Math.ceil(n * 0.8));

  for (let split = minSplit; split <= maxSplit; split++) {
    let score = 0;
    for (let i = 0; i < split; i++) {
      score += ingredientScore(lines[i]) - directionScore(lines[i]);
    }
    for (let i = split; i < n; i++) {
      score += directionScore(lines[i]) - ingredientScore(lines[i]);
    }
    if (score > bestScore) {
      bestScore = score;
      bestSplit = split;
    }
  }

  return bestSplit;
}

function parseWithExplicitSections(lines: string[]): { ingredients: string[]; directions: string[] } | null {
  const ingredientLines: string[] = [];
  const directionLines: string[] = [];
  let section: Section = 'none';
  let foundHeader = false;

  for (const raw of lines) {
    const header = detectSectionHeader(raw);
    if (header !== 'none') {
      section = header;
      foundHeader = true;
      continue;
    }
    if (isNoiseLine(raw) || META_LINE.test(raw)) continue;

    if (section === 'ingredients') {
      const cleaned = cleanIngredientLine(raw);
      if (cleaned.length > 2 && directionScore(cleaned) < ingredientScore(cleaned)) {
        ingredientLines.push(cleaned);
      }
    } else if (section === 'directions') {
      if (isContinuationOfDirection(raw) && directionLines.length > 0) {
        directionLines[directionLines.length - 1] += ` ${cleanDirectionLine(raw)}`;
        continue;
      }
      const cleaned = cleanDirectionLine(raw);
      if (cleaned.length > 3 && ingredientScore(cleaned) <= directionScore(cleaned)) {
        directionLines.push(cleaned);
      }
    }
  }

  if (!foundHeader || (ingredientLines.length === 0 && directionLines.length === 0)) {
    return null;
  }

  return { ingredients: ingredientLines, directions: directionLines };
}

function parseWithScoring(lines: string[]): { ingredients: string[]; directions: string[] } {
  const ingredientLines: string[] = [];
  const directionLines: string[] = [];

  const splitAt = findBestSplitIndex(lines);

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (isNoiseLine(raw) || META_LINE.test(raw) || detectSectionHeader(raw) !== 'none') continue;

    const iScore = ingredientScore(raw);
    const dScore = directionScore(raw);

    if (i < splitAt) {
      if (iScore >= dScore || (AMOUNT_START.test(raw) && iScore >= 0)) {
        const cleaned = cleanIngredientLine(raw);
        if (cleaned.length > 2) ingredientLines.push(cleaned);
      } else {
        const cleaned = cleanDirectionLine(raw);
        if (cleaned.length > 3) directionLines.push(cleaned);
      }
    } else {
      if (dScore >= iScore || STEP_START.test(raw) || COOKING_VERBS.test(raw)) {
        if (isContinuationOfDirection(raw) && directionLines.length > 0) {
          directionLines[directionLines.length - 1] += ` ${cleanDirectionLine(raw)}`;
        } else {
          const cleaned = cleanDirectionLine(raw);
          if (cleaned.length > 3) directionLines.push(cleaned);
        }
      } else {
        const cleaned = cleanIngredientLine(raw);
        if (cleaned.length > 2) ingredientLines.push(cleaned);
      }
    }
  }

  return { ingredients: ingredientLines, directions: directionLines };
}

function rebalanceMisplaced(
  ingredients: string[],
  directions: string[]
): { ingredients: string[]; directions: string[] } {
  const finalIngredients: string[] = [];
  const finalDirections: string[] = [...directions];

  for (const line of ingredients) {
    if (directionScore(line) > ingredientScore(line) + 2 && line.length > 40) {
      finalDirections.push(cleanDirectionLine(line));
    } else {
      finalIngredients.push(line);
    }
  }

  const cleanedDirections: string[] = [];
  for (const line of finalDirections) {
    if (ingredientScore(line) > directionScore(line) + 2 && AMOUNT_START.test(line) && line.length < 70) {
      finalIngredients.push(cleanIngredientLine(line));
    } else {
      cleanedDirections.push(line);
    }
  }

  return { ingredients: finalIngredients, directions: cleanedDirections };
}

export function parseRecipeText(
  combinedText: string
): Omit<RecipeFormData, 'sourceUrl' | 'tags' | 'tools' | 'imageUrl'> {
  const allLines = splitLines(combinedText);

  if (allLines.length === 0) {
    throw new Error('No text found in the image. Try a clearer, well-lit photo.');
  }

  const { title, startIndex } = extractTitle(allLines);
  const meta = extractMetadata(allLines);
  const bodyLines = allLines.slice(startIndex).filter((l) => !isNoiseLine(l));

  let parsed = parseWithExplicitSections(bodyLines);

  if (!parsed || parsed.ingredients.length < 2 || parsed.directions.length < 1) {
    const scored = parseWithScoring(bodyLines);
    if (!parsed) {
      parsed = scored;
    } else {
      parsed = {
        ingredients:
          parsed.ingredients.length >= 2 ? parsed.ingredients : scored.ingredients,
        directions:
          parsed.directions.length >= 1 ? parsed.directions : scored.directions,
      };
    }
  }

  const balanced = rebalanceMisplaced(parsed.ingredients, parsed.directions);

  return {
    title,
    ingredients: parseIngredients(balanced.ingredients),
    directions:
      balanced.directions.length > 0
        ? balanced.directions
        : ['No directions found — add steps below.'],
    servings: meta.servings ?? 4,
    prepTime: meta.prepTime,
    cookTime: meta.cookTime,
  };
}
