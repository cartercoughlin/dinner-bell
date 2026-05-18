import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecipes } from '../contexts/RecipeContext';
import { MakeModeModal } from './MakeModeModal';
import { Recipe } from '../types/recipe';

export function RecipeList() {
  const { recipes } = useRecipes();
  const navigate = useNavigate();
  const [makingRecipe, setMakingRecipe] = useState<Recipe | null>(null);

  if (recipes.length === 0) {
    return (
      <div className="empty-state">
        <h2>No recipes yet</h2>
        <p>Add your first recipe to get started!</p>
      </div>
    );
  }

  return (
    <>
      <div className="recipe-list">
        <div className="recipe-grid">
          {recipes.map((recipe) => (
            <div
              key={recipe.id}
              className="recipe-card"
              onClick={() => navigate(`/recipe/${recipe.id}`)}
              style={{ cursor: 'pointer' }}
            >
              {recipe.imageUrl && (
                <img className="recipe-card-image" src={recipe.imageUrl} alt="" loading="lazy" />
              )}
              <h3>{recipe.title}</h3>
              <p>{recipe.ingredients.length} ingredients · {recipe.servings} servings</p>
              {recipe.tags && recipe.tags.length > 0 && (
                <div className="tags">
                  {recipe.tags.map((tag) => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
              )}
              <div className="recipe-card-footer">
                <button
                  className="make-btn"
                  onClick={e => {
                    e.stopPropagation();
                    setMakingRecipe(recipe);
                  }}
                  aria-label={`Make ${recipe.title}`}
                >
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="currentColor">
                    <path d="M3 2.5a.5.5 0 0 1 .757-.429l9 5a.5.5 0 0 1 0 .858l-9 5A.5.5 0 0 1 3 12.5v-10Z" />
                  </svg>
                  Make
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {makingRecipe && (
        <MakeModeModal
          recipe={makingRecipe}
          onClose={() => setMakingRecipe(null)}
        />
      )}
    </>
  );
}
