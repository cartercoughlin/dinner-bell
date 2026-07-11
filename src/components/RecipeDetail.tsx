import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Recipe } from '../types/recipe';
import { MakeModeModal } from './MakeModeModal';
import RecipeCoverPhoto from './RecipeCoverPhoto';

interface RecipeDetailProps {
  recipe: Recipe;
  onEdit: () => void;
  onDelete: () => void;
  onBack: () => void;
  onCoverChange?: (imageUrl: string) => void;
}

interface FullscreenImageViewerProps {
  src: string;
  alt: string;
  onClose: () => void;
}

function FullscreenImageViewer({ src, alt, onClose }: FullscreenImageViewerProps) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="image-viewer-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Recipe photo"
      onClick={onClose}
    >
      <button
        type="button"
        className="image-viewer-close"
        onClick={onClose}
        aria-label="Close full screen photo"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <line x1="4" y1="4" x2="16" y2="16" />
          <line x1="16" y1="4" x2="4" y2="16" />
        </svg>
      </button>
      <img
        className="image-viewer-image"
        src={src}
        alt={alt}
        onClick={(event) => event.stopPropagation()}
      />
    </div>,
    document.body
  );
}

function RecipeDetail({ recipe, onEdit, onDelete, onBack, onCoverChange }: RecipeDetailProps) {
  const [isMaking, setIsMaking] = useState(false);
  const [isImageOpen, setIsImageOpen] = useState(false);
  const openImage = () => {
    if (recipe.imageUrl) setIsImageOpen(true);
  };

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

      {onCoverChange ? (
        <div className="recipe-detail-cover-edit">
          <RecipeCoverPhoto
            imageUrl={recipe.imageUrl || ''}
            imageAlt={recipe.title}
            onImageChange={onCoverChange}
            onImageOpen={recipe.imageUrl ? openImage : undefined}
            compact
          />
        </div>
      ) : recipe.imageUrl ? (
        <button
          type="button"
          className="recipe-detail-image"
          onClick={openImage}
          aria-label="Open recipe photo full screen"
        >
          <img src={recipe.imageUrl} alt={recipe.title} />
        </button>
      ) : null}

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
            <span>Make</span>
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

      {recipe.tags && recipe.tags.length > 0 && (
        <div className="recipe-detail-categories">
          {recipe.tags.map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </div>
      )}

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

      {recipe.ingredients.length > 0 && (
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
      )}

      {recipe.directions.length > 0 && (
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
      )}

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

      {isImageOpen && recipe.imageUrl && (
        <FullscreenImageViewer
          src={recipe.imageUrl}
          alt={recipe.title}
          onClose={() => setIsImageOpen(false)}
        />
      )}
    </div>
  );
}

export default RecipeDetail;
