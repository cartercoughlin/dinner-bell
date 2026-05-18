import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRecipes } from '../contexts/RecipeContext';
import { MealType } from '../types/recipe';
import { addDays, startOfWeek, toDateKey } from '../utils/dates';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner'];

function CalendarPage() {
  const { recipes, getMealPlan, setMealPlan, removeMealPlan, getRecipe } = useRecipes();
  const [weekStart, setWeekStart] = useState(() => startOfWeek());
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart]
  );
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);

  const assignRandom = (date: string, mealType: MealType) => {
    if (!recipes.length) return;
    const recipe = recipes[Math.floor(Math.random() * recipes.length)];
    setMealPlan(date, mealType, recipe.id);
  };

  return (
    <div className="stack">
      <div className="page-toolbar">
        <div>
          <h1>Calendar</h1>
          <p className="toolbar-subtitle">
            {weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </p>
        </div>
        <div className="toolbar-actions">
          <button type="button" onClick={() => setWeekStart(addDays(weekStart, -7))}>Prev</button>
          <button type="button" onClick={() => setWeekStart(startOfWeek())}>Today</button>
          <button type="button" onClick={() => setWeekStart(addDays(weekStart, 7))}>Next</button>
        </div>
      </div>

      <Link className="text-link" to="/grocery-list">Open grocery list</Link>

      <div className="calendar-mobile-list" aria-label="Meal calendar">
        {days.map((day) => {
          const dateKey = toDateKey(day);
          const isToday = dateKey === toDateKey(new Date());

          return (
            <section className="calendar-mobile-day" key={dateKey}>
              <div className="calendar-mobile-day-header">
                <div>
                  <span>{day.toLocaleDateString(undefined, { weekday: 'long' })}</span>
                  <strong>{day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</strong>
                </div>
                {isToday && <em>Today</em>}
              </div>

              {MEAL_TYPES.map((mealType) => {
                const mealPlan = getMealPlan(dateKey, mealType);
                const recipe = mealPlan ? getRecipe(mealPlan.recipeId) : undefined;

                return (
                  <div className="calendar-mobile-meal" key={mealType}>
                    <span className="calendar-mobile-meal-name">{mealType}</span>
                    {recipe ? (
                      <div className="calendar-mobile-event">
                        <Link to={`/recipe/${recipe.id}`}>{recipe.title}</Link>
                        <button type="button" onClick={() => removeMealPlan(dateKey, mealType)}>
                          Remove
                        </button>
                      </div>
                    ) : (
                      <select
                        aria-label={`Add ${mealType} on ${dateKey}`}
                        value=""
                        onChange={(event) => {
                          if (event.target.value === '__random__') {
                            assignRandom(dateKey, mealType);
                          } else if (event.target.value) {
                            setMealPlan(dateKey, mealType, event.target.value);
                          }
                        }}
                      >
                        <option value="">Add meal</option>
                        <option value="__random__">Random recipe</option>
                        {recipes.map((option) => (
                          <option key={option.id} value={option.id}>{option.title}</option>
                        ))}
                      </select>
                    )}
                  </div>
                );
              })}
            </section>
          );
        })}
      </div>

      <div className="calendar-week" role="table" aria-label="Meal calendar">
        <div className="calendar-corner" aria-hidden="true" />
        {days.map((day) => {
          const isToday = toDateKey(day) === toDateKey(new Date());

          return (
            <div className={`calendar-day-header ${isToday ? 'today' : ''}`} key={toDateKey(day)} role="columnheader">
              <span>{day.toLocaleDateString(undefined, { weekday: 'short' })}</span>
              <strong>{day.getDate()}</strong>
            </div>
          );
        })}

        {MEAL_TYPES.map((mealType) => (
          <div className="calendar-row" role="row" key={mealType}>
            <div className="calendar-meal-label" role="rowheader">{mealType}</div>
            {days.map((day) => {
              const dateKey = toDateKey(day);
              const mealPlan = getMealPlan(dateKey, mealType);
              const recipe = mealPlan ? getRecipe(mealPlan.recipeId) : undefined;

              return (
                <div className="calendar-cell" role="cell" key={`${dateKey}-${mealType}`}>
                  {recipe ? (
                    <div className="calendar-event">
                      <Link to={`/recipe/${recipe.id}`}>{recipe.title}</Link>
                      <button type="button" aria-label={`Remove ${recipe.title}`} onClick={() => removeMealPlan(dateKey, mealType)}>
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="calendar-empty-meal">
                      <select
                        aria-label={`Add ${mealType} on ${dateKey}`}
                        value=""
                        onChange={(event) => {
                          if (event.target.value === '__random__') {
                            assignRandom(dateKey, mealType);
                          } else if (event.target.value) {
                            setMealPlan(dateKey, mealType, event.target.value);
                          }
                        }}
                      >
                        <option value="">Add</option>
                        <option value="__random__">Random</option>
                        {recipes.map((option) => (
                          <option key={option.id} value={option.id}>{option.title}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default CalendarPage;
