import { Ingredient } from '../types/recipe';

// Common words that appear in step text but don't identify an ingredient
const STOP_WORDS = new Set([
  'and', 'the', 'for', 'with', 'into', 'until', 'about', 'over', 'from',
  'fresh', 'dried', 'ground', 'chopped', 'diced', 'sliced', 'minced',
  'large', 'small', 'medium', 'cup', 'cups', 'tablespoon', 'teaspoon',
  'ounce', 'pound', 'gram', 'pinch',
]);

function significantWords(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

function stepMatchesIngredient(step: string, ingredient: Ingredient): boolean {
  const stepLower = step.toLowerCase();
  const name = ingredient.name.toLowerCase().trim();

  if (stepLower.includes(name)) return true;

  for (const word of significantWords(name)) {
    try {
      // Match plural/singular: "egg" matches "eggs", "tomato" matches "tomatoes"
      if (new RegExp(`\\b${word}e?s?\\b`, 'i').test(stepLower)) return true;
    } catch {
      if (stepLower.includes(word)) return true;
    }
  }

  return false;
}

/**
 * Returns one array of ingredients per direction step.
 * An ingredient appears in every step whose text mentions it.
 * Ingredients not mentioned anywhere are assigned to step 0.
 */
export function matchIngredientsToSteps(
  ingredients: Ingredient[],
  directions: string[]
): Ingredient[][] {
  const result: Ingredient[][] = directions.map(() => []);
  const unmatched: Ingredient[] = [];

  for (const ingredient of ingredients) {
    let matched = false;

    for (let i = 0; i < directions.length; i++) {
      if (stepMatchesIngredient(directions[i], ingredient)) {
        result[i].push(ingredient);
        matched = true;
      }
    }

    if (!matched) unmatched.push(ingredient);
  }

  // Prep/unidentified ingredients go on step 0
  if (unmatched.length > 0) {
    result[0] = [...unmatched, ...result[0]];
  }

  return result;
}
