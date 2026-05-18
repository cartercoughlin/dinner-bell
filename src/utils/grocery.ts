import { Ingredient, Recipe } from '../types/recipe';

type GroceryItem = {
  key: string;
  name: string;
  amounts: string[];
  recipes: string[];
};

export type GroceryCategory = {
  name: string;
  items: GroceryItem[];
};

const CATEGORY_ORDER = [
  'Produce',
  'Meat and Seafood',
  'Dairy and Eggs',
  'Bakery and Bread',
  'Pasta and Grains',
  'Canned and Jarred',
  'Condiments and Sauces',
  'Spices and Seasonings',
  'Oils and Vinegars',
  'Baking',
  'Frozen',
  'Beverages',
  'Other',
];

const CATEGORIES: Record<string, string[]> = {
  Produce: ['lettuce', 'tomato', 'onion', 'garlic', 'pepper', 'cilantro', 'parsley', 'basil', 'spinach', 'kale', 'carrot', 'celery', 'cucumber', 'zucchini', 'potato', 'corn', 'mushroom', 'avocado', 'lemon', 'lime', 'apple', 'banana', 'berry', 'ginger', 'shallot'],
  'Meat and Seafood': ['chicken', 'beef', 'pork', 'steak', 'turkey', 'lamb', 'bacon', 'sausage', 'salmon', 'shrimp', 'fish', 'tuna', 'cod', 'crab'],
  'Dairy and Eggs': ['milk', 'cream', 'butter', 'cheese', 'cheddar', 'mozzarella', 'parmesan', 'feta', 'ricotta', 'sour cream', 'yogurt', 'egg'],
  'Bakery and Bread': ['bread', 'bun', 'roll', 'tortilla', 'pita', 'naan', 'baguette', 'bagel', 'breadcrumb', 'panko'],
  'Pasta and Grains': ['pasta', 'spaghetti', 'penne', 'rice', 'quinoa', 'couscous', 'oat', 'orzo', 'noodle'],
  'Canned and Jarred': ['canned', 'tomato paste', 'tomato sauce', 'beans', 'chickpeas', 'broth', 'stock', 'olives', 'capers', 'salsa'],
  'Condiments and Sauces': ['ketchup', 'mustard', 'mayonnaise', 'mayo', 'soy sauce', 'hot sauce', 'barbecue', 'pesto', 'marinara', 'dressing', 'tahini', 'miso'],
  'Spices and Seasonings': ['salt', 'pepper', 'cumin', 'paprika', 'chili powder', 'cinnamon', 'oregano', 'garlic powder', 'onion powder', 'seasoning', 'spice'],
  'Oils and Vinegars': ['olive oil', 'vegetable oil', 'canola oil', 'sesame oil', 'vinegar', 'balsamic'],
  Baking: ['flour', 'sugar', 'baking soda', 'baking powder', 'yeast', 'cornstarch', 'vanilla', 'cocoa', 'chocolate', 'honey', 'maple syrup'],
  Frozen: ['frozen', 'ice cream'],
  Beverages: ['water', 'juice', 'wine', 'beer', 'coffee', 'tea', 'soda'],
};

const PREP_WORDS = new Set([
  'fresh',
  'frozen',
  'canned',
  'dry',
  'dried',
  'large',
  'medium',
  'small',
  'thinly',
  'finely',
  'roughly',
  'whole',
  'halved',
  'chopped',
  'diced',
  'minced',
  'sliced',
  'grated',
  'shredded',
  'crushed',
  'ground',
  'melted',
  'toasted',
  'cooked',
  'peeled',
  'trimmed',
  'rinsed',
  'drained',
  'divided',
  'packed',
  'optional',
  'about',
  'additional',
  'plus',
  'for',
  'serving',
  'garnish',
  'seeded',
]);

const INGREDIENT_ALIASES: Array<[string, string]> = [
  ['scallions', 'green onion'],
  ['scallion', 'green onion'],
  ['spring onions', 'green onion'],
  ['spring onion', 'green onion'],
  ['garbanzo beans', 'chickpea'],
  ['garbanzo bean', 'chickpea'],
  ['chickpeas', 'chickpea'],
  ['red bell peppers', 'bell pepper'],
  ['green bell peppers', 'bell pepper'],
  ['yellow bell peppers', 'bell pepper'],
  ['orange bell peppers', 'bell pepper'],
  ['red bell pepper', 'bell pepper'],
  ['green bell pepper', 'bell pepper'],
  ['yellow bell pepper', 'bell pepper'],
  ['orange bell pepper', 'bell pepper'],
  ['bell peppers', 'bell pepper'],
  ['sweet peppers', 'bell pepper'],
  ['roma tomatoes', 'tomato'],
  ['cherry tomatoes', 'tomato'],
  ['grape tomatoes', 'tomato'],
  ['tomatoes', 'tomato'],
  ['russet potatoes', 'potato'],
  ['yukon gold potatoes', 'potato'],
  ['potatoes', 'potato'],
  ['cloves garlic', 'garlic'],
  ['garlic cloves', 'garlic'],
  ['clove garlic', 'garlic'],
  ['garlic clove', 'garlic'],
  ['yellow onions', 'onion'],
  ['white onions', 'onion'],
  ['red onions', 'onion'],
  ['sweet onions', 'onion'],
  ['yellow onion', 'onion'],
  ['white onion', 'onion'],
  ['red onion', 'onion'],
  ['sweet onion', 'onion'],
  ['onions', 'onion'],
  ['limes', 'lime'],
  ['lemons', 'lemon'],
  ['eggs', 'egg'],
  ['salt and black pepper', 'salt and pepper'],
  ['kosher salt and black pepper', 'salt and pepper'],
  ['sea salt and black pepper', 'salt and pepper'],
  ['kosher salt', 'salt'],
  ['sea salt', 'salt'],
  ['table salt', 'salt'],
  ['black pepper', 'pepper'],
  ['white pepper', 'pepper'],
  ['peppercorns', 'pepper'],
  ['extra virgin olive oil', 'olive oil'],
  ['evoo', 'olive oil'],
  ['vegetable oil', 'neutral oil'],
  ['canola oil', 'neutral oil'],
  ['all-purpose flour', 'flour'],
  ['all purpose flour', 'flour'],
  ['ap flour', 'flour'],
  ['arrowroot flour', 'cornstarch'],
  ['granulated sugar', 'sugar'],
  ['caster sugar', 'sugar'],
  ['confectioners sugar', 'powdered sugar'],
  ['powdered sugar', 'powdered sugar'],
  ['brown sugar', 'brown sugar'],
  ['parmesan cheese', 'parmesan'],
  ['parmigiano reggiano', 'parmesan'],
  ['mozzarella cheese', 'mozzarella'],
  ['cheddar cheese', 'cheddar'],
  ['salted butter', 'butter'],
  ['unsalted butter', 'butter'],
  ['butter melted', 'butter'],
];

function ingredientLabel(ingredient: Ingredient) {
  return [ingredient.amount, ingredient.unit].filter(Boolean).join(' ').trim();
}

function singularize(word: string) {
  if (word.endsWith('ies') && word.length > 4) return `${word.slice(0, -3)}y`;
  if (word.endsWith('oes') && word.length > 4) return word.slice(0, -2);
  if (word.endsWith('ses') && word.length > 4) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss') && word.length > 3) return word.slice(0, -1);
  return word;
}

function normalizeIngredientName(name: string) {
  let normalized = name
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  for (const [alias, canonical] of INGREDIENT_ALIASES) {
    const pattern = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
    normalized = normalized.replace(pattern, canonical);
  }

  const words = normalized
    .split(/\s+/)
    .map(singularize)
    .filter((word) => word && !PREP_WORDS.has(word));

  return words.join(' ').trim();
}

function categoryFor(name: string) {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('salt') || lowerName === 'pepper' || lowerName.includes('peppercorn')) {
    return 'Spices and Seasonings';
  }
  if (lowerName.includes('bell pepper') || lowerName.includes('poblano') || lowerName.includes('jalape')) {
    return 'Produce';
  }

  const matches = Object.entries(CATEGORIES)
    .flatMap(([category, keywords]) =>
      keywords
        .filter((keyword) => lowerName.includes(keyword))
        .map((keyword) => ({ category, length: keyword.length }))
    )
    .sort((a, b) => b.length - a.length);

  return matches[0]?.category ?? 'Other';
}

export function buildGroceryCategories(recipes: Recipe[]): GroceryCategory[] {
  const items = new Map<string, GroceryItem & { category: string; recipeSet: Set<string> }>();

  recipes.forEach((recipe) => {
    recipe.ingredients.forEach((ingredient) => {
      const key = normalizeIngredientName(ingredient.name);
      if (!key) return;

      const amount = ingredientLabel(ingredient);
      const existing = items.get(key);

      if (existing) {
        existing.recipeSet.add(recipe.title);
        if (amount) existing.amounts.push(amount);
        return;
      }

      items.set(key, {
        key,
        name: key,
        amounts: amount ? [amount] : [],
        recipes: [],
        recipeSet: new Set([recipe.title]),
        category: categoryFor(key),
      });
    });
  });

  const grouped = new Map<string, GroceryItem[]>();
  items.forEach((item) => {
    const categoryItems = grouped.get(item.category) ?? [];
    categoryItems.push({
      key: item.key,
      name: item.name,
      amounts: item.amounts,
      recipes: Array.from(item.recipeSet).sort(),
    });
    grouped.set(item.category, categoryItems);
  });

  return CATEGORY_ORDER
    .filter((category) => grouped.has(category))
    .map((category) => ({
      name: category,
      items: (grouped.get(category) ?? []).sort((a, b) => a.name.localeCompare(b.name)),
    }));
}
