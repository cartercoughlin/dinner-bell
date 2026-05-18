import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { MealPlan, MealType, Recipe, RecipeFormData } from '../types/recipe';

interface RecipeContextType {
  recipes: Recipe[];
  addRecipe: (recipe: RecipeFormData) => Recipe;
  updateRecipe: (recipe: Recipe) => void;
  deleteRecipe: (id: string) => void;
  getRecipe: (id: string) => Recipe | undefined;
  mealPlans: MealPlan[];
  setMealPlan: (date: string, mealType: MealType, recipeId: string) => void;
  removeMealPlan: (date: string, mealType: MealType) => void;
  getMealPlan: (date: string, mealType: MealType) => MealPlan | undefined;
}

const RecipeContext = createContext<RecipeContextType | undefined>(undefined);

const STORAGE_KEY = 'dinner-bell-recipes';
const MEAL_PLAN_STORAGE_KEY = 'dinner-bell-meal-plans';

export function RecipeProvider({ children }: { children: ReactNode }) {
  const [recipes, setRecipes] = useState<Recipe[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });
  const [mealPlans, setMealPlans] = useState<MealPlan[]>(() => {
    const stored = localStorage.getItem(MEAL_PLAN_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
  }, [recipes]);

  useEffect(() => {
    localStorage.setItem(MEAL_PLAN_STORAGE_KEY, JSON.stringify(mealPlans));
  }, [mealPlans]);

  const addRecipe = (recipeData: RecipeFormData): Recipe => {
    const newRecipe: Recipe = {
      ...recipeData,
      id: crypto.randomUUID(),
      dateAdded: new Date().toISOString(),
    };
    setRecipes((prev) => [...prev, newRecipe]);
    return newRecipe;
  };

  const updateRecipe = (recipe: Recipe) => {
    setRecipes((prev) =>
      prev.map((r) =>
        r.id === recipe.id ? recipe : r
      )
    );
  };

  const deleteRecipe = (id: string) => {
    setRecipes((prev) => prev.filter((recipe) => recipe.id !== id));
    setMealPlans((prev) => prev.filter((mealPlan) => mealPlan.recipeId !== id));
  };

  const getRecipe = (id: string) => {
    return recipes.find((recipe) => recipe.id === id);
  };

  const setMealPlan = (date: string, mealType: MealType, recipeId: string) => {
    setMealPlans((prev) => {
      const nextPlan: MealPlan = {
        id: `${date}-${mealType}`,
        date,
        mealType,
        recipeId,
      };

      return [
        ...prev.filter((mealPlan) => mealPlan.date !== date || mealPlan.mealType !== mealType),
        nextPlan,
      ];
    });
  };

  const removeMealPlan = (date: string, mealType: MealType) => {
    setMealPlans((prev) =>
      prev.filter((mealPlan) => mealPlan.date !== date || mealPlan.mealType !== mealType)
    );
  };

  const getMealPlan = (date: string, mealType: MealType) => {
    return mealPlans.find((mealPlan) => mealPlan.date === date && mealPlan.mealType === mealType);
  };

  return (
    <RecipeContext.Provider
      value={{
        recipes,
        addRecipe,
        updateRecipe,
        deleteRecipe,
        getRecipe,
        mealPlans,
        setMealPlan,
        removeMealPlan,
        getMealPlan,
      }}
    >
      {children}
    </RecipeContext.Provider>
  );
}

export function useRecipes() {
  const context = useContext(RecipeContext);
  if (context === undefined) {
    throw new Error('useRecipes must be used within a RecipeProvider');
  }
  return context;
}
