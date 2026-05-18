import { useState, FormEvent } from 'react';
import { RecipeFormData, Ingredient } from '../types/recipe';

interface RecipeFormProps {
  initialData?: RecipeFormData;
  onSubmit: (data: RecipeFormData) => void;
  onCancel: () => void;
}

// API endpoint - defaults to localhost for development
// In production the frontend is served from the same Express server, so API
// calls use relative URLs (empty string).  During local dev, VITE_API_URL
// can point to the separate backend on port 3001.
const API_URL = import.meta.env.VITE_API_URL ?? '';

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

  const hasOptionalDetails = Boolean(tags || tools || sourceUrl || imageUrl);

  return (
    <form className="recipe-form" onSubmit={handleSubmit}>
      <section className="form-section recipe-import-panel">
        <div className="recipe-import-url">
          <label htmlFor="importUrl">Import from URL</label>
          <div className="form-inline">
            <input
              id="importUrl"
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
            />
            <button className="primary-btn" type="button" onClick={() => handleImportFromUrl()} disabled={isImporting}>
              {isImporting ? 'Importing' : 'Import'}
            </button>
          </div>
          {importError && <p className="form-error">{importError}</p>}
        </div>

        <div className="recipe-import-photo">
          <span>Import from Photos</span>
          <label className={`secondary-btn file-import-btn ${isImportingImages ? 'is-disabled' : ''}`}>
            Choose Photos
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              disabled={isImportingImages}
            />
          </label>
          {isImportingImages && <p className="form-note">Scanning images...</p>}
          {imageImportError && <p className="form-error">{imageImportError}</p>}
        </div>
      </section>

      <section className="form-section">
        <div className="form-grid form-grid--title">
          <div className="form-field">
            <label htmlFor="title">Recipe Title *</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-invalid={Boolean(errors.title)}
            />
            {errors.title && <p className="form-error">{errors.title}</p>}
          </div>

          <div className="form-field">
            <label htmlFor="servings">Servings</label>
            <input
              id="servings"
              type="number"
              min="1"
              value={servings}
              onChange={(e) => setServings(parseInt(e.target.value) || 1)}
            />
          </div>
        </div>

        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="prepTime">Prep Time</label>
            <input
              id="prepTime"
              type="number"
              min="0"
              placeholder="15"
              value={prepTime}
              onChange={(e) => setPrepTime(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="cookTime">Cook Time</label>
            <input
              id="cookTime"
              type="number"
              min="0"
              placeholder="30"
              value={cookTime}
              onChange={(e) => setCookTime(e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="form-section">
        <div className="form-section-header">
          <label>Ingredients *</label>
          <button className="secondary-btn compact-btn" type="button" onClick={addIngredient}>
            Add Ingredient
          </button>
        </div>

        <details className="bulk-ingredients">
          <summary>Paste ingredient list</summary>
          <div className="bulk-ingredients-body">
            <textarea
              id="bulkIngredients"
              value={bulkIngredientsText}
              onChange={(e) => setBulkIngredientsText(e.target.value)}
              placeholder={'1 cup flour\n2 tbsp sugar\n1 tsp salt'}
              rows={3}
            />
            <button
              className="success-btn"
              type="button"
              onClick={handleBulkAddIngredients}
              disabled={isParsingIngredients || !bulkIngredientsText.trim()}
            >
              {isParsingIngredients ? 'Parsing' : 'Add All'}
            </button>
          </div>
        </details>

        {errors.ingredients && <p className="form-error">{errors.ingredients}</p>}

        <div className="ingredient-list-editor">
          {ingredients.map((ingredient) => (
            <div className="ingredient-row" key={ingredient.id}>
              <input
                type="text"
                placeholder="Ingredient"
                value={ingredient.name}
                onChange={(e) => updateIngredient(ingredient.id, 'name', e.target.value)}
              />
              <input
                type="text"
                placeholder="Amount"
                value={ingredient.amount}
                onChange={(e) => updateIngredient(ingredient.id, 'amount', e.target.value)}
              />
              <input
                type="text"
                placeholder="Unit"
                value={ingredient.unit}
                onChange={(e) => updateIngredient(ingredient.id, 'unit', e.target.value)}
              />
              <button
                className="icon-remove-btn"
                type="button"
                onClick={() => removeIngredient(ingredient.id)}
                disabled={ingredients.length === 1}
                aria-label="Remove ingredient"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="form-section">
        <div className="form-field">
          <label htmlFor="directions">Directions *</label>
          <textarea
            id="directions"
            value={directions}
            onChange={(e) => setDirections(e.target.value)}
            rows={7}
            placeholder={'1. Preheat oven to 350°F\n2. Mix dry ingredients\n3. Add wet ingredients and stir'}
            aria-invalid={Boolean(errors.directions)}
          />
          {errors.directions && <p className="form-error">{errors.directions}</p>}
        </div>
      </section>

      <details className="form-section optional-details" open={hasOptionalDetails}>
        <summary>More details</summary>
        <div className="optional-details-body">
          <div className="form-field">
            <label htmlFor="tags">Tags</label>
            <input
              id="tags"
              type="text"
              placeholder="dinner, Italian, vegetarian"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="tools">Tools/Equipment</label>
            <input
              id="tools"
              type="text"
              placeholder="oven, skillet, food processor"
              value={tools}
              onChange={(e) => setTools(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="sourceUrl">Source URL</label>
            <input
              id="sourceUrl"
              type="url"
              placeholder="https://..."
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="imageUrl">Image URL</label>
            <input
              id="imageUrl"
              type="url"
              placeholder="https://..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </div>
        </div>
      </details>

      <div className="form-actions">
        <button className="primary-btn" type="submit">Save Recipe</button>
        <button className="secondary-btn" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export default RecipeForm;
