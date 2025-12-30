export interface Ingredient {
  id: string;
  name: string;
  amount: string;
  unit: string;
}

export interface Recipe {
  id: string;
  title: string;
  ingredients: Ingredient[];
  directions: string[];
  prepTime?: number; // in minutes
  cookTime?: number; // in minutes
  servings: number;
  sourceUrl?: string;
  tags?: string[];
  tools?: string[]; // e.g., "grill", "crock pot", "skillet"
  imageUrl?: string;
  dateAdded: string;
  lastMade?: string;
}

export interface RecipeFormData {
  title: string;
  ingredients: Ingredient[];
  directions: string[];
  prepTime?: number;
  cookTime?: number;
  servings: number;
  sourceUrl?: string;
  tags?: string[];
  tools?: string[];
  imageUrl?: string;
}
