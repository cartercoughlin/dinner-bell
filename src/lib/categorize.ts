/**
 * Auto-assign categories to recipes based on title and ingredients.
 * Mirrors recipes/parsers/categorizer.py for client-side use.
 */

const DISH_TYPES: Record<string, string[]> = {
  pasta: ['pasta', 'spaghetti', 'penne', 'fettuccine', 'linguine', 'macaroni', 'noodle', 'lasagna', 'ravioli', 'gnocchi', 'orzo', 'rigatoni', 'ziti', 'carbonara', 'alfredo', 'bolognese', 'mac and cheese'],
  soup: ['soup', 'stew', 'chowder', 'bisque', 'broth', 'chili', 'gumbo', 'gazpacho', 'ramen', 'pho'],
  salad: ['salad', 'slaw', 'coleslaw', 'caesar'],
  sandwich: ['sandwich', 'burger', 'wrap', 'sub', 'panini', 'hoagie', 'po boy', 'melt', 'club', 'blt'],
  tacos: ['taco', 'burrito', 'enchilada', 'fajita', 'quesadilla', 'tostada', 'nachos'],
  pizza: ['pizza', 'flatbread', 'calzone'],
  casserole: ['casserole', 'bake', 'gratin', 'au gratin', 'pot pie', 'shepherd'],
  bowl: ['bowl', 'poke', 'buddha bowl', 'grain bowl'],
  curry: ['curry', 'tikka', 'masala', 'vindaloo', 'korma'],
  stir_fry: ['stir fry', 'stir-fry', 'lo mein', 'pad thai', 'fried rice'],
  sides: ['side dish', 'side', 'coleslaw', 'cornbread', 'mashed potato', 'baked beans', 'rice pilaf', 'roasted vegetable'],
};

const MEAL_TYPES: Record<string, string[]> = {
  breakfast: ['egg', 'pancake', 'waffle', 'oatmeal', 'cereal', 'breakfast', 'brunch', 'french toast', 'omelet', 'omelette', 'frittata', 'hash', 'granola', 'smoothie bowl', 'eggs benedict', 'quiche', 'crepe'],
  dessert: ['cake', 'cookie', 'brownie', 'pie', 'chocolate', 'frosting', 'dessert', 'cupcake', 'ice cream', 'pudding', 'tart', 'cheesecake', 'mousse', 'cobbler', 'crumble', 'fudge', 'truffle', 'macaron', 'tiramisu', 'sorbet', 'panna cotta', 'cinnamon roll', 'donut', 'doughnut', 'scone', 'muffin'],
  appetizer: ['appetizer', 'dip', 'bruschetta', 'crostini', 'hors d\'oeuvre', 'deviled egg', 'spring roll', 'egg roll', 'wings', 'meatball'],
  drinks: ['drink', 'cocktail', 'smoothie', 'juice', 'lemonade', 'margarita', 'sangria', 'punch', 'mocktail', 'milkshake', 'iced tea', 'hot chocolate', 'eggnog', 'cider', 'slushie', 'frappe', 'espresso', 'latte', 'chai'],
  snack: ['snack', 'trail mix', 'granola bar', 'popcorn', 'hummus', 'guacamole', 'chips'],
};

const CUISINE_KEYWORDS: Record<string, string[]> = {
  italian: ['parmesan', 'mozzarella', 'marinara', 'pesto', 'risotto', 'prosciutto', 'bruschetta', 'antipasto', 'ciabatta'],
  mexican: ['tortilla', 'salsa', 'chimichurri', 'jalapeño', 'jalapeno', 'cilantro', 'cumin', 'chipotle', 'guacamole', 'chorizo', 'mole', 'elote'],
  asian: ['soy sauce', 'ginger', 'sesame', 'rice vinegar', 'sriracha', 'hoisin', 'teriyaki', 'wok', 'wasabi', 'miso', 'dashi', 'tofu', 'tempeh', 'kimchi', 'dumpling', 'gyoza', 'sushi', 'edamame'],
  indian: ['turmeric', 'garam masala', 'naan', 'tandoori', 'chutney', 'dal', 'biryani', 'samosa', 'paneer'],
  mediterranean: ['feta', 'tahini', 'pita', 'za\'atar', 'zaatar', 'tzatziki', 'falafel', 'shawarma', 'couscous', 'bulgur'],
};

/** All known categories for the picker UI. */
export const PRESET_CATEGORIES = [
  'Pasta', 'Soup', 'Salad', 'Sandwich', 'Tacos', 'Pizza', 'Casserole', 'Bowl', 'Curry', 'Stir fry', 'Sides',
  'Breakfast', 'Dessert', 'Appetizer', 'Drinks', 'Snack',
  'Italian', 'Mexican', 'Asian', 'Indian', 'Mediterranean',
  'Chicken', 'Beef', 'Pork', 'Seafood', 'Vegetarian',
  'Quick', 'Grilled', 'Slow cooker', 'Instant pot', 'One pot',
];

const PROTEIN_KEYWORDS: Record<string, string[]> = {
  chicken: ['chicken'],
  beef: ['beef', 'steak', 'ground beef', 'brisket', 'short rib'],
  pork: ['pork', 'bacon', 'sausage', 'ham', 'prosciutto', 'pork chop', 'pulled pork'],
  seafood: ['salmon', 'shrimp', 'fish', 'tuna', 'cod', 'tilapia', 'crab', 'lobster', 'scallop', 'clam', 'mussel', 'anchovy', 'mahi', 'halibut', 'swordfish', 'trout'],
  lamb: ['lamb'],
};

const COOKING_STYLE: Record<string, string[]> = {
  grilled: ['grill', 'grilled', 'bbq', 'barbecue', 'char-grilled', 'charred'],
  'slow cooker': ['slow cooker', 'crockpot', 'crock pot', 'braised', 'braise'],
  'instant pot': ['instant pot', 'pressure cooker'],
  'one pot': ['one pot', 'one-pot', 'sheet pan', 'sheet-pan', 'skillet dinner'],
  quick: ['15 minute', '15-minute', '20 minute', '20-minute', '30 minute', '30-minute', 'quick', 'easy', 'weeknight'],
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Auto-detect categories from a recipe's title and ingredient names.
 * Returns a sorted list of category strings.
 */
export function autoCategories(
  title: string,
  ingredientNames: string[],
): string[] {
  const tags = new Set<string>();
  const titleLower = (title || '').toLowerCase();
  const allText = titleLower + ' ' + ingredientNames.map(n => n.toLowerCase()).join(' ');

  // Dish types (match title only for specificity, except pasta/noodle which also check ingredients)
  for (const [category, keywords] of Object.entries(DISH_TYPES)) {
    const searchIn = category === 'pasta' ? allText : titleLower;
    if (keywords.some(kw => searchIn.includes(kw))) {
      tags.add(capitalize(category.replace('_', ' ')));
    }
  }

  // Meal types
  for (const [mealType, keywords] of Object.entries(MEAL_TYPES)) {
    if (keywords.some(kw => allText.includes(kw))) {
      tags.add(capitalize(mealType));
    }
  }

  // Cuisine
  for (const [cuisine, keywords] of Object.entries(CUISINE_KEYWORDS)) {
    if (keywords.some(kw => allText.includes(kw))) {
      tags.add(capitalize(cuisine));
    }
  }

  // Proteins
  for (const [protein, keywords] of Object.entries(PROTEIN_KEYWORDS)) {
    if (keywords.some(kw => allText.includes(kw))) {
      tags.add(capitalize(protein));
    }
  }

  // Cooking style (title only)
  for (const [style, keywords] of Object.entries(COOKING_STYLE)) {
    if (keywords.some(kw => titleLower.includes(kw))) {
      tags.add(capitalize(style));
    }
  }

  // Vegetarian if no meat detected
  const meatTags = new Set(['Chicken', 'Beef', 'Pork', 'Seafood', 'Lamb']);
  if (![...tags].some(t => meatTags.has(t))) {
    tags.add('Vegetarian');
  }

  return [...tags].sort();
}
