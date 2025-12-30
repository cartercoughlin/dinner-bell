import { useState, FormEvent } from 'react';
import { RecipeFormData, Ingredient } from '../types/recipe';

interface RecipeFormProps {
  initialData?: RecipeFormData;
  onSubmit: (data: RecipeFormData) => void;
  onCancel: () => void;
}

function RecipeForm({ initialData, onSubmit, onCancel }: RecipeFormProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [servings, setServings] = useState(initialData?.servings || 4);
  const [prepTime, setPrepTime] = useState(initialData?.prepTime?.toString() || '');
  const [cookTime, setCookTime] = useState(initialData?.cookTime?.toString() || '');
  const [directions, setDirections] = useState(initialData?.directions?.join('\n\n') || '');
  const [sourceUrl, setSourceUrl] = useState(initialData?.sourceUrl || '');
  const [tags, setTags] = useState(initialData?.tags?.join(', ') || '');
  const [tools, setTools] = useState(initialData?.tools?.join(', ') || '');
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || '');
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    initialData?.ingredients || [{ id: crypto.randomUUID(), name: '', amount: '', unit: '' }]
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const addIngredient = () => {
    setIngredients([...ingredients, { id: crypto.randomUUID(), name: '', amount: '', unit: '' }]);
  };

  const removeIngredient = (id: string) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((ing) => ing.id !== id));
    }
  };

  const updateIngredient = (id: string, field: keyof Ingredient, value: string) => {
    setIngredients(
      ingredients.map((ing) =>
        ing.id === id ? { ...ing, [field]: value } : ing
      )
    );
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!directions.trim()) {
      newErrors.directions = 'Directions are required';
    }

    const validIngredients = ingredients.filter((ing) => ing.name.trim());
    if (validIngredients.length === 0) {
      newErrors.ingredients = 'At least one ingredient is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const formData: RecipeFormData = {
      title: title.trim(),
      servings,
      ingredients: ingredients.filter((ing) => ing.name.trim()),
      directions: directions
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line),
      prepTime: prepTime ? parseInt(prepTime) : undefined,
      cookTime: cookTime ? parseInt(cookTime) : undefined,
      sourceUrl: sourceUrl.trim() || undefined,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t),
      tools: tools
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t),
      imageUrl: imageUrl.trim() || undefined,
    };

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <label htmlFor="title" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
          Recipe Title *
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{
            width: '100%',
            padding: '0.5rem',
            fontSize: '1rem',
            border: errors.title ? '2px solid #f44336' : '1px solid #ccc',
            borderRadius: '4px',
          }}
        />
        {errors.title && <p style={{ color: '#f44336', fontSize: '0.875rem', marginTop: '0.25rem' }}>{errors.title}</p>}
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <label htmlFor="servings" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
          Servings
        </label>
        <input
          id="servings"
          type="number"
          min="1"
          value={servings}
          onChange={(e) => setServings(parseInt(e.target.value) || 1)}
          style={{
            width: '100px',
            padding: '0.5rem',
            fontSize: '1rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
          }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <label htmlFor="prepTime" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Prep Time (minutes)
          </label>
          <input
            id="prepTime"
            type="number"
            min="0"
            placeholder="e.g., 15"
            value={prepTime}
            onChange={(e) => setPrepTime(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              fontSize: '1rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
            }}
          />
        </div>
        <div>
          <label htmlFor="cookTime" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Cook Time (minutes)
          </label>
          <input
            id="cookTime"
            type="number"
            min="0"
            placeholder="e.g., 30"
            value={cookTime}
            onChange={(e) => setCookTime(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              fontSize: '1rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
            }}
          />
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <label style={{ fontWeight: '500' }}>Ingredients *</label>
          <button
            type="button"
            onClick={addIngredient}
            style={{
              padding: '0.25rem 0.75rem',
              fontSize: '0.875rem',
              backgroundColor: '#646cff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            + Add Ingredient
          </button>
        </div>
        {errors.ingredients && (
          <p style={{ color: '#f44336', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{errors.ingredients}</p>
        )}
        {ingredients.map((ingredient) => (
          <div
            key={ingredient.id}
            style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '0.5rem', marginBottom: '0.5rem' }}
          >
            <input
              type="text"
              placeholder="Ingredient name"
              value={ingredient.name}
              onChange={(e) => updateIngredient(ingredient.id, 'name', e.target.value)}
              style={{
                padding: '0.5rem',
                fontSize: '1rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
            />
            <input
              type="text"
              placeholder="Amount"
              value={ingredient.amount}
              onChange={(e) => updateIngredient(ingredient.id, 'amount', e.target.value)}
              style={{
                padding: '0.5rem',
                fontSize: '1rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
            />
            <input
              type="text"
              placeholder="Unit"
              value={ingredient.unit}
              onChange={(e) => updateIngredient(ingredient.id, 'unit', e.target.value)}
              style={{
                padding: '0.5rem',
                fontSize: '1rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
            />
            <button
              type="button"
              onClick={() => removeIngredient(ingredient.id)}
              disabled={ingredients.length === 1}
              style={{
                padding: '0.5rem 0.75rem',
                fontSize: '1rem',
                backgroundColor: ingredients.length === 1 ? '#ccc' : '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: ingredients.length === 1 ? 'not-allowed' : 'pointer',
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <label htmlFor="directions" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
          Directions * (one step per line)
        </label>
        <textarea
          id="directions"
          value={directions}
          onChange={(e) => setDirections(e.target.value)}
          rows={8}
          placeholder="1. Preheat oven to 350°F&#10;2. Mix dry ingredients&#10;3. Add wet ingredients and stir..."
          style={{
            width: '100%',
            padding: '0.5rem',
            fontSize: '1rem',
            border: errors.directions ? '2px solid #f44336' : '1px solid #ccc',
            borderRadius: '4px',
            fontFamily: 'inherit',
            resize: 'vertical',
          }}
        />
        {errors.directions && (
          <p style={{ color: '#f44336', fontSize: '0.875rem', marginTop: '0.25rem' }}>{errors.directions}</p>
        )}
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <label htmlFor="tags" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
          Tags (comma-separated)
        </label>
        <input
          id="tags"
          type="text"
          placeholder="e.g., dinner, Italian, vegetarian"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          style={{
            width: '100%',
            padding: '0.5rem',
            fontSize: '1rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
          }}
        />
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <label htmlFor="tools" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
          Tools/Equipment (comma-separated)
        </label>
        <input
          id="tools"
          type="text"
          placeholder="e.g., oven, skillet, food processor"
          value={tools}
          onChange={(e) => setTools(e.target.value)}
          style={{
            width: '100%',
            padding: '0.5rem',
            fontSize: '1rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
          }}
        />
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <label htmlFor="sourceUrl" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
          Source URL
        </label>
        <input
          id="sourceUrl"
          type="url"
          placeholder="https://..."
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          style={{
            width: '100%',
            padding: '0.5rem',
            fontSize: '1rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
          }}
        />
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <label htmlFor="imageUrl" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
          Image URL
        </label>
        <input
          id="imageUrl"
          type="url"
          placeholder="https://..."
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          style={{
            width: '100%',
            padding: '0.5rem',
            fontSize: '1rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
        <button
          type="submit"
          style={{
            padding: '0.75rem 2rem',
            fontSize: '1rem',
            backgroundColor: '#646cff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '500',
          }}
        >
          Save Recipe
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '0.75rem 2rem',
            fontSize: '1rem',
            backgroundColor: '#f0f0f0',
            color: '#333',
            border: '1px solid #ccc',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '500',
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default RecipeForm;
