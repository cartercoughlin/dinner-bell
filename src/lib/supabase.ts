import { createClient } from '@supabase/supabase-js';
import { Ingredient, MealPlan, MealType, Recipe } from '../types/recipe';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase = url && key ? createClient(url, key) : null;
export const isSupabaseEnabled = supabase !== null;

const TOKEN_KEY = 'dinner-bell-user-token';
const PUBLIC_APP_URL = import.meta.env.VITE_PUBLIC_APP_URL as string | undefined;

/** Stable per-device UUID — the "account" until real auth is added. */
export function getUserToken(): string {
  let token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(TOKEN_KEY, token);
  }
  return token;
}

/** Switch this device to a different household token and reload. */
export function setUserToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getFamilyInviteBaseUrl(): string | null {
  if (PUBLIC_APP_URL?.trim()) return PUBLIC_APP_URL.replace(/\/+$/, '');
  if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
    return window.location.origin;
  }
  return null;
}

// ── Row ↔ domain mappers ─────────────────────────────────────────────────

export function recipeToRow(recipe: Recipe, userToken: string) {
  return {
    id: recipe.id,
    user_token: userToken,
    title: recipe.title,
    ingredients: recipe.ingredients as unknown as Ingredient[],
    directions: recipe.directions,
    servings: recipe.servings,
    prep_time: recipe.prepTime ?? null,
    cook_time: recipe.cookTime ?? null,
    source_url: recipe.sourceUrl ?? null,
    tags: recipe.tags ?? null,
    tools: recipe.tools ?? null,
    image_url: recipe.imageUrl ?? null,
    date_added: recipe.dateAdded,
    last_made: recipe.lastMade ?? null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToRecipe(row: any): Recipe {
  return {
    id: row.id,
    title: row.title,
    ingredients: row.ingredients ?? [],
    directions: row.directions ?? [],
    servings: row.servings,
    prepTime: row.prep_time ?? undefined,
    cookTime: row.cook_time ?? undefined,
    sourceUrl: row.source_url ?? undefined,
    tags: row.tags ?? undefined,
    tools: row.tools ?? undefined,
    imageUrl: row.image_url ?? undefined,
    dateAdded: row.date_added,
    lastMade: row.last_made ?? undefined,
  };
}

export function mealPlanToRow(mp: MealPlan, userToken: string) {
  return {
    id: mp.id,
    user_token: userToken,
    date: mp.date,
    meal_type: mp.mealType,
    recipe_id: mp.recipeId,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToMealPlan(row: any): MealPlan {
  return {
    id: row.id,
    date: row.date,
    mealType: row.meal_type as MealType,
    recipeId: row.recipe_id,
  };
}
