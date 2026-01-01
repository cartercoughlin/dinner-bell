import { useState, FormEvent } from 'react';
import { RecipeFormData, Ingredient } from '../types/recipe';

interface RecipeFormProps {
  initialData?: RecipeFormData;
  onSubmit: (data: RecipeFormData) => void;
  onCancel: () => void;
}

// API endpoint - defaults to localhost for development
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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

  // URL import state
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState('');

  // Ingredient bulk parse state
  const [bulkIngredientsText, setBulkIngredientsText] = useState('');
  const [isParsingIngredients, setIsParsingIngredients] = useState(false);

  // Image import state
  const [isImportingImages, setIsImportingImages] = useState(false);
  const [imageImportError, setImageImportError] = useState('');

  const addIngredient = () => {
    setIngredients([...ingredients, { id: crypto.randomUUID(), name: '', amount: '', unit: '' }]);
  };

  const handleBulkAddIngredients = async () => {
    if (!bulkIngredientsText.trim()) return;

    setIsParsingIngredients(true);
    try {
      const response = await fetch(`${API_URL}/api/parse-ingredients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: bulkIngredientsText }),
      });

      if (!response.ok) {
        throw new Error('Failed to parse ingredients');
      }

      const { ingredients: parsedIngredients } = await response.json();

      // Filter out empty ingredients from the current list
      const currentList = ingredients.filter(ing => ing.name.trim() !== '');

      setIngredients([...currentList, ...parsedIngredients]);
      setBulkIngredientsText('');
    } catch (error) {
      console.error('Error parsing ingredients:', error);
      alert('Failed to parse ingredients. Please check your connection to the server.');
    } finally {
      setIsParsingIngredients(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsImportingImages(true);
    setImageImportError('');

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('images', files[i]);
    }

    try {
      const response = await fetch(`${API_URL}/api/parse-images`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to parse images');
      }

      const { recipe } = await response.json();

      // Update form with OCR results
      if (recipe.title) setTitle(recipe.title);
      if (recipe.ingredients && recipe.ingredients.length > 0) {
        setIngredients(recipe.ingredients);
      }
      if (recipe.directions && recipe.directions.length > 0) {
        setDirections(recipe.directions.join('\n\n'));
      }
      if (recipe.servings) setServings(recipe.servings);
      if (recipe.prepTime) setPrepTime(recipe.prepTime.toString());
      if (recipe.cookTime) setCookTime(recipe.cookTime.toString());

      // Clear the input
      e.target.value = '';
    } catch (error) {
      console.error('Error importing from images:', error);
      setImageImportError(error instanceof Error ? error.message : 'Failed to import from images');
    } finally {
      setIsImportingImages(false);
    }
  };

  const removeIngredient = (id: string) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((ing) => ing.id !== id));
    }
  };

  const handleImportFromUrl = async (urlToImport?: string) => {
    const url = urlToImport || importUrl;
    if (!url.trim()) {
      setImportError('Please enter a URL');
      return;
    }

    setIsImporting(true);
    setImportError('');

    try {
      const response = await fetch(`${API_URL}/api/parse-recipe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to import recipe');
      }

      const { recipe } = await response.json();

      // Populate form with imported data
      setTitle(recipe.title || '');
      setServings(recipe.servings || 4);
      setPrepTime(recipe.prepTime?.toString() || '');
      setCookTime(recipe.cookTime?.toString() || '');
      setDirections(recipe.directions?.join('\n\n') || '');
      setSourceUrl(recipe.sourceUrl || url.trim());
      setTags(recipe.tags?.join(', ') || '');
      setTools(recipe.tools?.join(', ') || '');
      setImageUrl(recipe.imageUrl || '');
      setIngredients(recipe.ingredients || [{ id: crypto.randomUUID(), name: '', amount: '', unit: '' }]);

      setImportUrl('');
      setImportError('');
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Failed to import recipe. Please try again.');
    } finally {
      setIsImporting(false);
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
      {/* URL Import Section */}
      <div style={{
        marginBottom: '2rem',
        padding: '1.5rem',
        backgroundColor: 'rgba(100, 108, 255, 0.1)',
        borderRadius: '8px',
        border: '2px dashed rgba(100, 108, 255, 0.3)'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.125rem' }}>
          Import from URL
        </h3>
        <p style={{ marginBottom: '1rem', color: '#666', fontSize: '0.875rem' }}>
          Paste a recipe URL to automatically fill in the details (works with most recipe websites)
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <input
              type="url"
              placeholder="https://example.com/recipe"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              onPaste={(e) => {
                const pastedUrl = e.clipboardData.getData('text').trim();
                if (pastedUrl && (pastedUrl.startsWith('http://') || pastedUrl.startsWith('https://'))) {
                  setImportUrl(pastedUrl);
                  handleImportFromUrl(pastedUrl);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleImportFromUrl();
                }
              }}
              disabled={isImporting}
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '1rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
                backgroundColor: isImporting ? '#f5f5f5' : 'white',
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => handleImportFromUrl()}
            disabled={isImporting}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              backgroundColor: isImporting ? '#ccc' : '#646cff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isImporting ? 'not-allowed' : 'pointer',
              fontWeight: '500',
              whiteSpace: 'nowrap',
            }}
          >
            {isImporting ? 'Importing...' : 'Import'}
          </button>
        </div>
        {importError && (
          <p style={{ color: '#f44336', fontSize: '0.875rem', marginTop: '0.5rem', marginBottom: 0 }}>
            {importError}
          </p>
        )}
      </div>

      {/* Image Import Section */}
      <div style={{
        marginBottom: '2rem',
        padding: '1.5rem',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        borderRadius: '8px',
        border: '2px dashed rgba(76, 175, 80, 0.3)'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.125rem', color: '#2e7d32' }}>
          Import from Photos
        </h3>
        <p style={{ marginBottom: '1rem', color: '#666', fontSize: '0.875rem' }}>
          Upload one or more photos of a printed recipe or cookbook page (OCR)
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleImageUpload}
            disabled={isImportingImages}
            style={{
              width: '100%',
              padding: '0.5rem',
              fontSize: '1rem',
              backgroundColor: 'white',
              border: '1px solid #ccc',
              borderRadius: '4px',
            }}
          />
          {isImportingImages && (
            <p style={{ color: '#2e7d32', fontSize: '0.875rem', margin: '0.5rem 0 0 0', fontWeight: '500' }}>
              Scanning images... This can take a few seconds.
            </p>
          )}
          {imageImportError && (
            <p style={{ color: '#f44336', fontSize: '0.875rem', margin: '0.5rem 0 0 0' }}>
              {imageImportError}
            </p>
          )}
        </div>
      </div>

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
            + Add Individual Ingredient
          </button>
        </div>

        {/* Bulk Add Section */}
        <div style={{
          marginBottom: '1rem',
          padding: '1rem',
          backgroundColor: '#f9f9f9',
          borderRadius: '4px',
          border: '1px solid #eee'
        }}>
          <label htmlFor="bulkIngredients" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#666' }}>
            Quickly add multiple ingredients (one per line)
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <textarea
              id="bulkIngredients"
              value={bulkIngredientsText}
              onChange={(e) => setBulkIngredientsText(e.target.value)}
              placeholder="e.g.&#10;1 cup flour&#10;2 tbsp sugar&#10;1 tsp salt"
              rows={3}
              style={{
                flex: 1,
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid #ccc',
                fontFamily: 'inherit',
                fontSize: '0.875rem'
              }}
            />
            <button
              type="button"
              onClick={handleBulkAddIngredients}
              disabled={isParsingIngredients || !bulkIngredientsText.trim()}
              style={{
                alignSelf: 'flex-end',
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                backgroundColor: isParsingIngredients ? '#ccc' : '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isParsingIngredients ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {isParsingIngredients ? 'Parsing...' : 'Add All'}
            </button>
          </div>
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
