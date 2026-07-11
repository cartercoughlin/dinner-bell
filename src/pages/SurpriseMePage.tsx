import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRecipes } from '../contexts/RecipeContext';

function SurpriseMePage() {
  const { recipes } = useRecipes();
  const navigate = useNavigate();
  const [seed, setSeed] = useState(0);
  const recipe = useMemo(() => {
    if (!recipes.length) return undefined;
    return recipes[Math.floor(Math.random() * recipes.length)];
  }, [recipes, seed]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!recipe) {
    return (
      <div className="empty-state">
        <h2>No recipes yet</h2>
        <p>Add a recipe before using Surprise Me.</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="page-toolbar">
        <h1>Surprise Me</h1>
        <button type="button" onClick={() => setSeed(s => s + 1)}>🔄</button>
      </div>
      <div className="recipe-card" onClick={() => navigate(`/recipe/${recipe.id}`)} style={{ cursor: 'pointer' }}>
        <h3>{recipe.title}</h3>
        <p>{recipe.ingredients.length} ingredients</p>
        <p>{recipe.servings} servings</p>
      </div>
      <Link className="text-link" to={`/recipe/${recipe.id}`}>View recipe</Link>
    </div>
  );
}

export default SurpriseMePage;

