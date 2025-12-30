import { Recipe } from '../types/recipe';

interface RecipeDetailProps {
  recipe: Recipe;
  onEdit: () => void;
  onDelete: () => void;
  onBack: () => void;
}

function RecipeDetail({ recipe, onEdit, onDelete, onBack }: RecipeDetailProps) {
  return (
    <div style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          onClick={onBack}
          style={{
            padding: '0.5rem 1rem',
            fontSize: '0.875rem',
            backgroundColor: '#f0f0f0',
            color: '#333',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer',
            marginBottom: '1rem',
          }}
        >
          ← Back to Recipes
        </button>
      </div>

      {recipe.imageUrl && (
        <div style={{ marginBottom: '1.5rem' }}>
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
            style={{
              width: '100%',
              maxHeight: '400px',
              objectFit: 'cover',
              borderRadius: '8px',
            }}
          />
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0 }}>{recipe.title}</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={onEdit}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              backgroundColor: '#646cff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Delete
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem', color: '#666' }}>
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
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {recipe.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  padding: '0.25rem 0.75rem',
                  fontSize: '0.875rem',
                  backgroundColor: '#e3f2fd',
                  color: '#1976d2',
                  borderRadius: '16px',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {recipe.tools && recipe.tools.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h3>Equipment Needed</h3>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {recipe.tools.map((tool) => (
              <span
                key={tool}
                style={{
                  padding: '0.25rem 0.75rem',
                  fontSize: '0.875rem',
                  backgroundColor: '#fff3e0',
                  color: '#e65100',
                  borderRadius: '16px',
                }}
              >
                {tool}
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: '2rem' }}>
        <h2>Ingredients</h2>
        <ul style={{ lineHeight: '1.8' }}>
          {recipe.ingredients.map((ingredient) => (
            <li key={ingredient.id}>
              {ingredient.amount && <strong>{ingredient.amount} </strong>}
              {ingredient.unit && <span>{ingredient.unit} </span>}
              {ingredient.name}
            </li>
          ))}
        </ul>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2>Directions</h2>
        <ol style={{ lineHeight: '1.8', paddingLeft: '1.5rem' }}>
          {recipe.directions.map((step, index) => (
            <li key={index} style={{ marginBottom: '0.75rem' }}>
              {step}
            </li>
          ))}
        </ol>
      </div>

      {recipe.sourceUrl && (
        <div style={{ marginBottom: '1.5rem' }}>
          <strong>Source: </strong>
          <a
            href={recipe.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#646cff' }}
          >
            {recipe.sourceUrl}
          </a>
        </div>
      )}

      {recipe.lastMade && (
        <div style={{ color: '#666', fontSize: '0.875rem' }}>
          <strong>Last Made:</strong> {new Date(recipe.lastMade).toLocaleDateString()}
        </div>
      )}

      <div style={{ color: '#999', fontSize: '0.75rem', marginTop: '2rem' }}>
        Added {new Date(recipe.dateAdded).toLocaleDateString()}
      </div>
    </div>
  );
}

export default RecipeDetail;
