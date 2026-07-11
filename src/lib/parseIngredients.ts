import { Ingredient } from '../types/recipe';

const COMMON_UNITS = [
  'cup', 'cups', 'tbsp', 'tablespoon', 'tablespoons', 'tsp', 'teaspoon', 'teaspoons',
  'oz', 'ounce', 'ounces', 'lb', 'lbs', 'pound', 'pounds', 'g', 'gram', 'grams',
  'kg', 'kilogram', 'kilograms', 'ml', 'milliliter', 'milliliters', 'l', 'liter', 'liters',
  'pinch', 'pinches', 'dash', 'dashes', 'can', 'cans', 'package', 'packages', 'pkg',
  'container', 'containers', 'jar', 'jars', 'bottle', 'bottles', 'slice', 'slices',
  'piece', 'pieces', 'head', 'heads', 'bunch', 'bunches', 'sprig', 'sprigs', 'stalk', 'stalks',
  'clove', 'cloves', 'ear', 'ears', 'inch', 'inches',
];

export function parseIngredients(ingredientList: string[]): Ingredient[] {
  return ingredientList.map((ingredient) => {
    let cleaned = ingredient
      .trim()
      .replace(/^([A-Z|]|\d{1,2}[.,])\s+/, '')
      .replace(/^[^a-zA-Z\d(¼-¾)]+\s*/, '')
      .replace(/\s+/g, ' ');

    const amountRegex = /^(\d+\s+\d\/\d|\d+\/\d|\d+(\.\d+)?|\d+)?\s*/;
    const amountMatch = cleaned.match(amountRegex);

    let amount = '';
    let remaining = cleaned;

    if (amountMatch?.[1]) {
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
        const twoWords = `${words[0]} ${words[1]}`.toLowerCase().replace(/[.,]/g, '');
        if (COMMON_UNITS.includes(twoWords)) {
          unit = `${words[0]} ${words[1]}`;
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
