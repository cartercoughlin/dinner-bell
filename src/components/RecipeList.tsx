import { useNavigate } from 'react-router-dom';
import { useRecipes } from '../contexts/RecipeContext';

export function RecipeList() {
  const { recipes } = useRecipes();
  const navigate = useNavigate();

  if (recipes.length === 0) {
    return (
      <div className="empty-state">
        <h2>No recipes yet</h2>
        <p>Add your first recipe to get started!</p>
      </div>
    );
  }

  return (
    <div className="recipe-list">
      <div className="recipe-grid">
        {recipes.map((recipe) => (
          <div
            key={recipe.id}
            className="recipe-card"
            onClick={() => navigate(`/recipe/${recipe.id}`)}
            style={{ cursor: 'pointer' }}
          >
            <h3>{recipe.title}</h3>
            <p>{recipe.ingredients.length} ingredients</p>
            <p>{recipe.servings} servings</p>
            {recipe.tags && recipe.tags.length > 0 && (
              <div className="tags">
                {recipe.tags.map((tag) => (
                  <span key={tag} className="tag">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
