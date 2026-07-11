import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { MealPlan, MealType, Recipe, RecipeFormData } from '../types/recipe';
import {
  supabase,
  isSupabaseEnabled,
  getStoredUserEmail,
  getUserToken,
  normalizeUserEmail,
  recipeToRow,
  rowToRecipe,
  mealPlanToRow,
  rowToMealPlan,
  setUserEmail,
} from '../lib/supabase';

interface RecipeContextType {
  recipes: Recipe[];
  loading: boolean;
  addRecipe: (recipe: RecipeFormData) => Recipe;
  updateRecipe: (recipe: Recipe) => void;
  deleteRecipe: (id: string) => void;
  getRecipe: (id: string) => Recipe | undefined;
  mealPlans: MealPlan[];
  setMealPlan: (date: string, mealType: MealType, recipeId: string) => void;
  removeMealPlan: (date: string, mealType: MealType) => void;
  getMealPlan: (date: string, mealType: MealType) => MealPlan | undefined;
  userEmail: string;
  connectEmail: (email: string) => Promise<void>;
}

const RecipeContext = createContext<RecipeContextType | undefined>(undefined);

const LS_RECIPES = 'dinner-bell-recipes';
const LS_MEAL_PLANS = 'dinner-bell-meal-plans';

function readLS<T>(key: string): T[] {
  try {
    const s = localStorage.getItem(key);
    return s ? (JSON.parse(s) as T[]) : [];
  } catch {
    return [];
  }
}

export function RecipeProvider({ children }: { children: ReactNode }) {
  // Seed state from localStorage so existing data shows instantly
  const [recipes, setRecipes] = useState<Recipe[]>(() => readLS<Recipe>(LS_RECIPES));
  const [mealPlans, setMealPlans] = useState<MealPlan[]>(() => readLS<MealPlan>(LS_MEAL_PLANS));
  const [userEmail, setUserEmailState] = useState(() => getStoredUserEmail());
  const [loading, setLoading] = useState(isSupabaseEnabled);

  const didLoad = useRef(false);

  // ── Initial load from Supabase ────────────────────────────────────────
  useEffect(() => {
    if (!isSupabaseEnabled || didLoad.current) return;
    didLoad.current = true;

    const token = getUserToken();

    Promise.all([
      supabase!.from('recipes').select('*').eq('user_token', token).order('date_added'),
      supabase!.from('meal_plans').select('*').eq('user_token', token),
    ])
      .then(([{ data: rRows, error: rErr }, { data: mpRows, error: mpErr }]) => {
        if (rErr || mpErr) {
          console.error('Supabase load error:', rErr ?? mpErr);
          return; // Keep localStorage data as graceful fallback
        }

        const cloudRecipes = (rRows ?? []).map(rowToRecipe);
        const cloudMealPlans = (mpRows ?? []).map(rowToMealPlan);

        if (cloudRecipes.length > 0) {
          // Cloud is the authoritative source
          setRecipes(cloudRecipes);
          setMealPlans(cloudMealPlans);
        } else {
          // Cloud empty — migrate any existing localStorage data
          const localRecipes = readLS<Recipe>(LS_RECIPES);
          const localMealPlans = readLS<MealPlan>(LS_MEAL_PLANS);

          if (localRecipes.length > 0) {
            supabase!
              .from('recipes')
              .insert(localRecipes.map(r => recipeToRow(r, token)))
              .then(({ error }) => {
                if (error) {
                  console.error('Migration error (recipes):', error);
                  return;
                }
                if (localMealPlans.length > 0) {
                  supabase!
                    .from('meal_plans')
                    .insert(localMealPlans.map(mp => mealPlanToRow(mp, token)));
                }
                localStorage.removeItem(LS_RECIPES);
                localStorage.removeItem(LS_MEAL_PLANS);
              });

            // Keep in-memory state — no flicker
            setRecipes(localRecipes);
            setMealPlans(localMealPlans);
          }
        }
      })
      .catch(err => console.error('Supabase fetch failed:', err))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── localStorage sync — only when Supabase is NOT configured ─────────
  useEffect(() => {
    if (isSupabaseEnabled) return;
    localStorage.setItem(LS_RECIPES, JSON.stringify(recipes));
  }, [recipes]);

  useEffect(() => {
    if (isSupabaseEnabled) return;
    localStorage.setItem(LS_MEAL_PLANS, JSON.stringify(mealPlans));
  }, [mealPlans]);

  // ── Mutations (optimistic update + background Supabase sync) ─────────

  const addRecipe = (recipeData: RecipeFormData): Recipe => {
    const newRecipe: Recipe = {
      ...recipeData,
      id: crypto.randomUUID(),
      dateAdded: new Date().toISOString(),
    };
    setRecipes(prev => [...prev, newRecipe]);

    if (isSupabaseEnabled) {
      const token = getUserToken();
      supabase!
        .from('recipes')
        .insert(recipeToRow(newRecipe, token))
        .then(({ error }) => {
          if (error) console.error('Supabase insert failed:', error);
        });
    }

    return newRecipe;
  };

  const updateRecipe = (recipe: Recipe) => {
    setRecipes(prev => prev.map(r => (r.id === recipe.id ? recipe : r)));

    if (isSupabaseEnabled) {
      const token = getUserToken();
      supabase!
        .from('recipes')
        .upsert(recipeToRow(recipe, token))
        .then(({ error }) => {
          if (error) console.error('Supabase upsert failed:', error);
        });
    }
  };

  const deleteRecipe = (id: string) => {
    setRecipes(prev => prev.filter(r => r.id !== id));
    setMealPlans(prev => prev.filter(mp => mp.recipeId !== id));

    if (isSupabaseEnabled) {
      supabase!
        .from('recipes')
        .delete()
        .eq('id', id)
        .then(({ error }) => {
          if (error) console.error('Supabase delete failed:', error);
        });
    }
  };

  const getRecipe = (id: string) => recipes.find(r => r.id === id);

  const setMealPlan = (date: string, mealType: MealType, recipeId: string) => {
    const plan: MealPlan = { id: `${date}-${mealType}`, date, mealType, recipeId };
    setMealPlans(prev => [
      ...prev.filter(mp => !(mp.date === date && mp.mealType === mealType)),
      plan,
    ]);

    if (isSupabaseEnabled) {
      const token = getUserToken();
      supabase!
        .from('meal_plans')
        .upsert(mealPlanToRow(plan, token))
        .then(({ error }) => {
          if (error) console.error('Supabase upsert (meal_plan) failed:', error);
        });
    }
  };

  const removeMealPlan = (date: string, mealType: MealType) => {
    const id = `${date}-${mealType}`;
    setMealPlans(prev => prev.filter(mp => mp.id !== id));

    if (isSupabaseEnabled) {
      supabase!
        .from('meal_plans')
        .delete()
        .eq('id', id)
        .then(({ error }) => {
          if (error) console.error('Supabase delete (meal_plan) failed:', error);
        });
    }
  };

  const getMealPlan = (date: string, mealType: MealType) =>
    mealPlans.find(mp => mp.date === date && mp.mealType === mealType);

  const connectEmail = async (email: string) => {
    const normalizedEmail = normalizeUserEmail(email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new Error('Enter a valid email address.');
    }

    const nextToken = setUserEmail(normalizedEmail);
    setUserEmailState(normalizedEmail);

    if (!isSupabaseEnabled) return;

    setLoading(true);
    try {
      const [{ data: existingRows, error: recipesError }, { data: existingMealRows, error: mealPlansError }] =
        await Promise.all([
          supabase!.from('recipes').select('*').eq('user_token', nextToken).order('date_added'),
          supabase!.from('meal_plans').select('*').eq('user_token', nextToken),
        ]);

      if (recipesError || mealPlansError) {
        throw recipesError ?? mealPlansError;
      }

      const existingRecipes = (existingRows ?? []).map(rowToRecipe);
      const existingMealPlans = (existingMealRows ?? []).map(rowToMealPlan);
      const seenTitles = new Set(existingRecipes.map(recipe => recipe.title.toLowerCase().trim()));
      const recipesToCopy = recipes.filter(recipe => !seenTitles.has(recipe.title.toLowerCase().trim()));
      const mergedRecipes = [...existingRecipes, ...recipesToCopy];

      if (recipesToCopy.length > 0) {
        const { error } = await supabase!
          .from('recipes')
          .upsert(recipesToCopy.map(recipe => recipeToRow(recipe, nextToken)));
        if (error) throw error;
      }

      const seenMealPlanIds = new Set(existingMealPlans.map(plan => plan.id));
      const mealPlansToCopy = mealPlans.filter(plan => !seenMealPlanIds.has(plan.id));
      const mergedMealPlans = [...existingMealPlans, ...mealPlansToCopy];

      if (mealPlansToCopy.length > 0) {
        const { error } = await supabase!
          .from('meal_plans')
          .upsert(mealPlansToCopy.map(plan => mealPlanToRow(plan, nextToken)));
        if (error) throw error;
      }

      setRecipes(mergedRecipes);
      setMealPlans(mergedMealPlans);
    } finally {
      setLoading(false);
    }
  };

  return (
    <RecipeContext.Provider
      value={{
        recipes,
        loading,
        addRecipe,
        updateRecipe,
        deleteRecipe,
        getRecipe,
        mealPlans,
        setMealPlan,
        removeMealPlan,
        getMealPlan,
        userEmail,
        connectEmail,
      }}
    >
      {children}
    </RecipeContext.Provider>
  );
}

export function useRecipes() {
  const context = useContext(RecipeContext);
  if (context === undefined) throw new Error('useRecipes must be used within a RecipeProvider');
  return context;
}
