import { useState } from 'react';
import { Recipe } from '../types/recipe';
import { MakeModeModal } from './MakeModeModal';

interface RecipeDetailProps {
  recipe: Recipe;
  onEdit: () => void;
  onDelete: () => void;
  onBack: () => void;
}

function RecipeDetail({ recipe, onEdit, onDelete, onBack }: RecipeDetailProps) {
  const [isMaking, setIsMaking] = useState(false);

  return (
    <div className="recipe-detail">
      <div className="recipe-detail-back">
        <button
          onClick={onBack}
          className="secondary-btn"
        >
          ← Back to Recipes
        </button>
      </div>

      {recipe.imageUrl && (
        <div className="recipe-detail-image">
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
          />
        </div>
      )}

      <div className="recipe-detail-header">
        <h1>{recipe.title}</h1>
        <div className="recipe-detail-actions">
          <button
            onClick={() => setIsMaking(true)}
            className="recipe-action-btn recipe-action-btn--make"
            aria-label="Make recipe"
            title="Make"
          >
            <span aria-hidden="true">🍳</span>
          </button>
          <button
            onClick={onEdit}
            className="recipe-action-btn recipe-action-btn--edit"
            aria-label="Edit recipe"
            title="Edit"
          >
            <span aria-hidden="true">✏️</span>
          </button>
          <button
            onClick={onDelete}
            className="recipe-action-btn recipe-action-btn--delete"
            aria-label="Delete recipe"
            title="Delete"
          >
            <span aria-hidden="true">🗑️</span>
          </button>
        </div>
      </div>

      <div className="recipe-detail-meta">
        <div>
          <strong>Servings:</strong> {recipe.servings}
        </div>
        {recipe.prepTime && (
          <div>
            <strong>Prep:</strong> {recipe.prepTime} mins
          </div>
        )}
        {recipe.cookTime && (
          <div>
            <strong>Cook:</strong> {recipe.cookTime} mins
          </div>
        )}
      </div>

      {recipe.tags && recipe.tags.length > 0 && (
        <div className="recipe-detail-section">
          <div className="recipe-detail-pills">
            {recipe.tags.map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {recipe.tools && recipe.tools.length > 0 && (
        <div className="recipe-detail-section">
          <h3>Equipment Needed</h3>
          <div className="recipe-detail-pills">
            {recipe.tools.map((tool) => (
              <span key={tool} className="tool-pill">
                {tool}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="recipe-detail-section">
        <h2>Ingredients</h2>
        <ul className="recipe-detail-list">
          {recipe.ingredients.map((ingredient) => (
            <li key={ingredient.id}>
              {ingredient.amount && <strong>{ingredient.amount} </strong>}
              {ingredient.unit && <span>{ingredient.unit} </span>}
              {ingredient.name}
            </li>
          ))}
        </ul>
      </div>

      <div className="recipe-detail-section">
        <h2>Directions</h2>
        <ol className="recipe-detail-list recipe-detail-list--ordered">
          {recipe.directions.map((step, index) => (
            <li key={index}>
              {step}
            </li>
          ))}
        </ol>
      </div>

      {recipe.sourceUrl && (
        <div className="recipe-detail-section">
          <strong>Source: </strong>
          <a
            href={recipe.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {recipe.sourceUrl}
          </a>
        </div>
      )}

      {recipe.lastMade && (
        <div className="recipe-detail-note">
          <strong>Last Made:</strong> {new Date(recipe.lastMade).toLocaleDateString()}
        </div>
      )}

      <div className="recipe-detail-added">
        Added {new Date(recipe.dateAdded).toLocaleDateString()}
      </div>

      {isMaking && (
        <MakeModeModal recipe={recipe} onClose={() => setIsMaking(false)} />
      )}
    </div>
  );
}

export default RecipeDetail;
