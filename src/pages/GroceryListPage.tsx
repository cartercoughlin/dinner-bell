import { useMemo, useState } from 'react';
import { useRecipes } from '../contexts/RecipeContext';
import { buildGroceryCategories } from '../utils/grocery';
import { startOfWeek, toDateKey, addDays } from '../utils/dates';

const CHECKED_KEY = 'dinner-bell-grocery-checked';

function GroceryListPage() {
  const { recipes, mealPlans } = useRecipes();
  const [source, setSource] = useState<'week' | 'all'>('week');
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    const stored = localStorage.getItem(CHECKED_KEY);
    return stored ? JSON.parse(stored) : {};
  });

  const selectedRecipes = useMemo(() => {
    if (source === 'all') return recipes;

    const weekStart = startOfWeek();
    const weekDates = new Set(Array.from({ length: 7 }, (_, index) => toDateKey(addDays(weekStart, index))));
    const recipeIds = new Set(
      mealPlans
        .filter((mealPlan) => weekDates.has(mealPlan.date))
        .map((mealPlan) => mealPlan.recipeId)
    );

    return recipes.filter((recipe) => recipeIds.has(recipe.id));
  }, [mealPlans, recipes, source]);

  const categories = useMemo(() => buildGroceryCategories(selectedRecipes), [selectedRecipes]);

  const toggleItem = (key: string) => {
    setChecked((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (!next[key]) delete next[key];
      localStorage.setItem(CHECKED_KEY, JSON.stringify(next));
      return next;
    });
  };

  const reset = () => {
    localStorage.removeItem(CHECKED_KEY);
    setChecked({});
  };

  const copy = async () => {
    const text = categories
      .flatMap((category) => [
        `${category.name}:`,
        ...category.items.map((item) => {
          const amount = item.amounts.length ? ` (${item.amounts.join(', ')})` : '';
          return `- ${item.name}${amount}`;
        }),
        '',
      ])
      .join('\n')
      .trim();

    if (text) await navigator.clipboard.writeText(text);
  };

  return (
    <div className="stack">
      <div className="page-toolbar">
        <h1>Grocery List</h1>
        <div className="toolbar-actions">
          <button type="button" onClick={copy}>Copy</button>
          <button type="button" onClick={reset}>Reset</button>
        </div>
      </div>

      <div className="segmented-control">
        <button type="button" className={source === 'week' ? 'active' : ''} onClick={() => setSource('week')}>
          This week
        </button>
        <button type="button" className={source === 'all' ? 'active' : ''} onClick={() => setSource('all')}>
          All recipes
        </button>
      </div>

      {categories.length === 0 ? (
        <div className="empty-state">
          <h2>No grocery items</h2>
          <p>Add meals to the calendar or switch to all recipes.</p>
        </div>
      ) : (
        <div className="grocery-categories">
          {categories.map((category) => (
            <section className="grocery-category" key={category.name}>
              <h2>{category.name}</h2>
              {category.items.map((item) => (
                <label className={`grocery-item ${checked[item.key] ? 'checked' : ''}`} key={item.key}>
                  <input
                    type="checkbox"
                    checked={Boolean(checked[item.key])}
                    onChange={() => toggleItem(item.key)}
                  />
                  <span>
                    <strong>{item.name}</strong>
                    {item.amounts.length > 0 && <em>{item.amounts.join(', ')}</em>}
                    <small>{item.recipes.join(', ')}</small>
                  </span>
                </label>
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export default GroceryListPage;

