import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { RecipeFormData, Ingredient } from '../types/recipe';
import { fileToCoverImageDataUrl } from '../lib/imageUtils';
import { getApiUrl, readApiError } from '../lib/api';
import { parseIngredients } from '../lib/parseIngredients';
import { PRESET_CATEGORIES } from '../lib/categorize';
import RecipeCoverPhoto from './RecipeCoverPhoto';

interface RecipeFormProps {
  initialData?: RecipeFormData;
  isEditMode?: boolean;
  onSubmit: (data: RecipeFormData) => void;
  onCancel: () => void;
}

type CreationPath = 'link' | 'photo' | 'manual' | null;

function cleanHtml(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/u0022/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeImportUrl(value: string): string {
  let urlText = value.trim();
  const urlMatch = urlText.match(/https?:\/\/[^\s"'<>]+/i);
  if (urlMatch) urlText = urlMatch[0];

  try {
    const parsed = new URL(urlText);
    const wrappedUrl =
      parsed.searchParams.get('url') ||
      parsed.searchParams.get('u') ||
      parsed.searchParams.get('q');

    if (wrappedUrl?.startsWith('http://') || wrappedUrl?.startsWith('https://')) {
      return wrappedUrl;
    }
  } catch {
    return urlText;
  }

  return urlText;
}

function emptyIngredient(): Ingredient {
  return { id: crypto.randomUUID(), name: '', amount: '', unit: '' };
}

function RecipeForm({ initialData, isEditMode = false, onSubmit, onCancel }: RecipeFormProps) {
  const [creationPath, setCreationPath] = useState<CreationPath>(initialData ? 'manual' : null);
  const [title, setTitle] = useState(initialData?.title || '');
  const [servings, setServings] = useState(initialData?.servings || 4);
  const [prepTime, setPrepTime] = useState(initialData?.prepTime?.toString() || '');
  const [cookTime, setCookTime] = useState(initialData?.cookTime?.toString() || '');
  const [directions, setDirections] = useState(initialData?.directions?.join('\n') || '');
  const [sourceUrl, setSourceUrl] = useState(initialData?.sourceUrl || '');
  const [categories, setCategories] = useState<string[]>(initialData?.tags ?? []);
  const [customCategory, setCustomCategory] = useState('');
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [tools, setTools] = useState(initialData?.tools?.join(', ') || '');
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || '');
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    initialData?.ingredients?.filter((ing) => ing.name.trim()) || []
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [ingredientPaste, setIngredientPaste] = useState('');
  const [isParsingIngredients, setIsParsingIngredients] = useState(false);

  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importedTitle, setImportedTitle] = useState<string | null>(null);

  const [isAddingCoverPhoto, setIsAddingCoverPhoto] = useState(false);
  const [coverPhotoError, setCoverPhotoError] = useState('');

  useEffect(() => {
    if (!initialData) return;

    setTitle(initialData.title || '');
    setServings(initialData.servings || 4);
    setPrepTime(initialData.prepTime?.toString() || '');
    setCookTime(initialData.cookTime?.toString() || '');
    setDirections(initialData.directions?.join('\n') || '');
    setSourceUrl(initialData.sourceUrl || '');
    setCategories(initialData.tags ?? []);
    setTools(initialData.tools?.join(', ') || '');
    setImageUrl(initialData.imageUrl || '');
    setIngredients(initialData.ingredients?.filter((ing) => ing.name.trim()) || []);
    setErrors({});
    setImportedTitle(null);
    setImportError('');
    setCoverPhotoError('');
    setIngredientPaste('');
    setCreationPath('manual');
  }, [initialData]);

  const applyImportedRecipe = (recipe: Partial<RecipeFormData> & { title?: string }) => {
    if (recipe.title) setTitle(cleanHtml(recipe.title));
    if (recipe.servings) setServings(recipe.servings);
    if (recipe.prepTime) setPrepTime(recipe.prepTime.toString());
    if (recipe.cookTime) setCookTime(recipe.cookTime.toString());
    if (recipe.directions?.length) setDirections(recipe.directions.join('\n'));
    if (recipe.sourceUrl) setSourceUrl(recipe.sourceUrl);
    if (recipe.tags?.length) setCategories(prev => {
      const presetLower = PRESET_CATEGORIES.map(c => c.toLowerCase());
      const validTags = recipe.tags!.filter(t => presetLower.includes(t.toLowerCase()));
      const merged = [...prev];
      for (const t of validTags) {
        if (!merged.some(m => m.toLowerCase() === t.toLowerCase())) merged.push(t);
      }
      return merged;
    });
    if (recipe.tools?.length) setTools(recipe.tools.join(', '));
    if (recipe.imageUrl) setImageUrl(recipe.imageUrl);
    if (recipe.ingredients?.length) {
      setIngredients(recipe.ingredients.filter((ing) => ing.name.trim()));
    }
  };

  const handleParseIngredients = async () => {
    if (!ingredientPaste.trim()) return;

    setIsParsingIngredients(true);
    const existing = ingredients.filter((ing) => ing.name.trim());
    const lines = ingredientPaste.split('\n').map((l) => l.trim()).filter(Boolean);

    try {
      const response = await fetch(`${getApiUrl()}/api/parse-ingredients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: ingredientPaste }),
      });

      if (response.ok) {
        const { ingredients: parsedIngredients } = await response.json();
        setIngredients([...existing, ...parsedIngredients]);
      } else {
        setIngredients([...existing, ...parseIngredients(lines)]);
      }
      setIngredientPaste('');
    } catch {
      setIngredients([...existing, ...parseIngredients(lines)]);
      setIngredientPaste('');
    } finally {
      setIsParsingIngredients(false);
    }
  };

  const handleUsePhotoOnly = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsAddingCoverPhoto(true);
    setCoverPhotoError('');

    try {
      setImageUrl(await fileToCoverImageDataUrl(file));
      setCreationPath('photo');
    } catch (err) {
      setCoverPhotoError(err instanceof Error ? err.message : 'Could not add photo');
    } finally {
      setIsAddingCoverPhoto(false);
    }
  };

  const handleImportFromUrl = async (urlToImport?: string) => {
    const url = normalizeImportUrl(urlToImport || importUrl);
    if (!url) {
      setImportError('Paste a recipe link to import');
      return;
    }

    setIsImporting(true);
    setImportError('');

    try {
      const apiUrl = getApiUrl();

      const response = await fetch(`${apiUrl}/api/parse-recipe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response, 'Failed to import recipe'));
      }

      const { recipe } = await response.json();
      applyImportedRecipe({ ...recipe, sourceUrl: recipe.sourceUrl || url });
      setImportUrl('');
      setImportedTitle(cleanHtml(recipe.title) || 'Recipe');
      setCreationPath('link');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to import recipe';
      // Rewrite cryptic browser errors into user-friendly messages
      if (message.includes('did not match') || message.includes('TypeError') || message.includes('Failed to fetch') || message.includes('NetworkError')) {
        setImportError('Could not reach the recipe server. Check your internet connection or try again.');
      } else {
        setImportError(message);
      }
    } finally {
      setIsImporting(false);
    }
  };

  const addIngredient = () => {
    setIngredients([...ingredients, emptyIngredient()]);
  };

  const removeIngredient = (id: string) => {
    setIngredients(ingredients.filter((ing) => ing.id !== id));
  };

  const updateIngredient = (id: string, field: keyof Ingredient, value: string) => {
    setIngredients(
      ingredients.map((ing) => (ing.id === id ? { ...ing, [field]: value } : ing))
    );
  };

  const toggleCategory = (cat: string) => {
    setCategories(prev =>
      prev.some(c => c.toLowerCase() === cat.toLowerCase())
        ? prev.filter(c => c.toLowerCase() !== cat.toLowerCase())
        : [...prev, cat]
    );
  };

  const addCustomCategory = () => {
    const val = customCategory.trim();
    if (val && !categories.some(c => c.toLowerCase() === val.toLowerCase())) {
      setCategories(prev => [...prev, val]);
    }
    setCustomCategory('');
  };


  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) newErrors.title = 'Add a recipe name';
    if (!creationPath) newErrors.creationPath = 'Choose how you want to add this recipe';
    if (creationPath === 'photo' && !imageUrl) newErrors.image = 'Add a photo';

    const validIngredients = ingredients.filter((ing) => ing.name.trim());
    if (creationPath && validIngredients.length === 0) {
      newErrors.ingredients = 'Add at least one ingredient';
    }
    if (creationPath && !directions.trim()) newErrors.directions = 'Add at least one step';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSubmit({
      title: title.trim(),
      servings,
      ingredients: ingredients.filter((ing) => ing.name.trim()),
      directions: directions
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
      prepTime: prepTime ? parseInt(prepTime, 10) : undefined,
      cookTime: cookTime ? parseInt(cookTime, 10) : undefined,
      sourceUrl: sourceUrl.trim() || undefined,
      tags: categories,
      tools: tools
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      imageUrl: imageUrl.trim() || undefined,
    });
  };

  const hasOptionalDetails = Boolean(tools || sourceUrl);
  const showIngredientRows = ingredients.length > 0;
  const showWrittenRecipeFields = creationPath === 'manual' || creationPath === 'link' || creationPath === 'photo';
  const saveLabel = isEditMode ? 'Save changes' : 'Save recipe';

  return (
    <form className="recipe-form" onSubmit={handleSubmit}>
      <section className="form-section recipe-create-section">
        <div className="recipe-create-options" role="radiogroup" aria-label="Choose how to create this recipe">
          <button
            type="button"
            className={`recipe-create-option ${creationPath === 'link' ? 'is-selected' : ''}`}
            onClick={() => setCreationPath('link')}
            role="radio"
            aria-checked={creationPath === 'link'}
          >
            <span>Create from link</span>
            <span className="recipe-create-option-note">Paste a recipe URL</span>
          </button>
          <button
            type="button"
            className={`recipe-create-option ${creationPath === 'photo' ? 'is-selected' : ''}`}
            onClick={() => setCreationPath('photo')}
            role="radio"
            aria-checked={creationPath === 'photo'}
          >
            <span>Add from photo</span>
            <span className="recipe-create-option-note">Use photo, write details</span>
          </button>
          <button
            type="button"
            className={`recipe-create-option ${creationPath === 'manual' ? 'is-selected' : ''}`}
            onClick={() => setCreationPath('manual')}
            role="radio"
            aria-checked={creationPath === 'manual'}
          >
            <span>Write manually</span>
            <span className="recipe-create-option-note">Add details yourself</span>
          </button>
        </div>

        {errors.creationPath && <p className="form-error">{errors.creationPath}</p>}

        {creationPath === 'link' && (
          <div className="recipe-path-panel">
            <label htmlFor="importUrl">Recipe link</label>
            <div className="form-inline">
              <input
                id="importUrl"
                type="text"
                autoCapitalize="off"
                placeholder="https://…"
                value={importUrl}
                onChange={(e) => {
                  setImportUrl(e.target.value);
                  setImportedTitle(null);
                }}
                onPaste={(e) => {
                  const pastedUrl = normalizeImportUrl(e.clipboardData.getData('text'));
                  if (pastedUrl.startsWith('http://') || pastedUrl.startsWith('https://')) {
                    e.preventDefault();
                    setImportUrl(pastedUrl);
                    setImportedTitle(null);
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
              <button
                className="primary-btn"
                type="button"
                onClick={() => handleImportFromUrl()}
                disabled={isImporting}
              >
                {isImporting ? (
                  <>
                    <span className="import-btn-spinner" aria-hidden="true" />
                    Importing
                  </>
                ) : (
                  'Import'
                )}
              </button>
            </div>
            {importError && <p className="form-error">{importError}</p>}
          </div>
        )}

        {creationPath === 'photo' && (
          <div className="recipe-path-panel recipe-path-panel--compact">
            <label className={`secondary-btn file-import-btn ${isAddingCoverPhoto ? 'is-disabled' : ''}`}>
              {isAddingCoverPhoto ? 'Adding…' : imageUrl ? 'Change photo' : 'Choose photo'}
              <input
                type="file"
                accept="image/*"
                onChange={handleUsePhotoOnly}
                disabled={isAddingCoverPhoto}
              />
            </label>
            {errors.image && <p className="form-error">{errors.image}</p>}
            {coverPhotoError && <p className="form-error">{coverPhotoError}</p>}
          </div>
        )}
      </section>

      {importedTitle && (
        <div className="import-success-banner import-success-banner--compact" role="status">
          Imported <strong>{importedTitle}</strong> — tweak anything below, then save.
        </div>
      )}

      {(imageUrl || creationPath === 'manual') && (
        <section className="form-section form-section--flush">
          <RecipeCoverPhoto imageUrl={imageUrl} onImageChange={setImageUrl} />
        </section>
      )}

      <section className="form-section recipe-basics-section">
        <div className="form-field recipe-title-field">
          <label htmlFor="title">Recipe name</label>
          <input
            id="title"
            type="text"
            className="recipe-title-input"
            placeholder="e.g. Weeknight pasta"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-invalid={Boolean(errors.title)}
          />
          {errors.title && <p className="form-error">{errors.title}</p>}
        </div>

        <div className="form-field">
          <label>Categories</label>
          {categories.length > 0 && (
            <div className="category-selected-list">
              {categories.map(cat => (
                <span key={cat} className="category-tag">
                  {cat}
                  <button type="button" onClick={() => toggleCategory(cat)} aria-label={`Remove ${cat}`}>×</button>
                </span>
              ))}
            </div>
          )}
          <div className="category-add-row">
            <select
              value=""
              onChange={e => {
                if (e.target.value) toggleCategory(e.target.value);
              }}
            >
              <option value="" disabled>Add a category...</option>
              {PRESET_CATEGORIES
                .filter(cat => !categories.some(c => c.toLowerCase() === cat.toLowerCase()))
                .map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
            </select>
            {!showCustomCategory ? (
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setShowCustomCategory(true)}
              >
                + Custom
              </button>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Custom category"
                  value={customCategory}
                  autoFocus
                  onChange={e => setCustomCategory(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomCategory();
                      setShowCustomCategory(false);
                    }
                    if (e.key === 'Escape') {
                      setCustomCategory('');
                      setShowCustomCategory(false);
                    }
                  }}
                />
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    addCustomCategory();
                    setShowCustomCategory(false);
                  }}
                  disabled={!customCategory.trim()}
                >
                  Add
                </button>
              </>
            )}
          </div>
        </div>

        <div className="recipe-meta-row">
          <div className="form-field recipe-meta-field">
            <label htmlFor="servings">Serves</label>
            <input
              id="servings"
              type="number"
              min="1"
              value={servings}
              onChange={(e) => setServings(parseInt(e.target.value, 10) || 1)}
            />
          </div>
          <div className="form-field recipe-meta-field">
            <label htmlFor="prepTime">Prep (min)</label>
            <input
              id="prepTime"
              type="number"
              min="0"
              placeholder="—"
              value={prepTime}
              onChange={(e) => setPrepTime(e.target.value)}
            />
          </div>
          <div className="form-field recipe-meta-field">
            <label htmlFor="cookTime">Cook (min)</label>
            <input
              id="cookTime"
              type="number"
              min="0"
              placeholder="—"
              value={cookTime}
              onChange={(e) => setCookTime(e.target.value)}
            />
          </div>
        </div>
      </section>

      {showWrittenRecipeFields && (
        <>
          <section className="form-section">
            <div className="form-section-header">
              <div>
                <label htmlFor="ingredientPaste">Ingredients</label>
                <p className="form-hint">Paste a list (one per line) or add rows below.</p>
              </div>
            </div>

            <div className="ingredient-paste-row">
              <textarea
                id="ingredientPaste"
                value={ingredientPaste}
                onChange={(e) => setIngredientPaste(e.target.value)}
                placeholder={'2 cups flour\n1 tbsp olive oil\n3 cloves garlic, minced'}
                rows={4}
                aria-invalid={Boolean(errors.ingredients && !showIngredientRows)}
              />
              <button
                className="primary-btn"
                type="button"
                onClick={handleParseIngredients}
                disabled={isParsingIngredients || !ingredientPaste.trim()}
              >
                {isParsingIngredients ? 'Parsing…' : 'Add list'}
              </button>
            </div>

            {errors.ingredients && <p className="form-error">{errors.ingredients}</p>}

            {showIngredientRows && (
              <div className="ingredient-list-editor">
                {ingredients.map((ingredient) => (
                  <div className="ingredient-row" key={ingredient.id}>
                    <input
                      type="text"
                      placeholder="Ingredient"
                      aria-label="Ingredient name"
                      value={ingredient.name}
                      onChange={(e) => updateIngredient(ingredient.id, 'name', e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Amt"
                      aria-label="Amount"
                      value={ingredient.amount}
                      onChange={(e) => updateIngredient(ingredient.id, 'amount', e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Unit"
                      aria-label="Unit"
                      value={ingredient.unit}
                      onChange={(e) => updateIngredient(ingredient.id, 'unit', e.target.value)}
                    />
                    <button
                      className="icon-remove-btn"
                      type="button"
                      onClick={() => removeIngredient(ingredient.id)}
                      aria-label="Remove ingredient"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button className="text-btn ingredient-add-one" type="button" onClick={addIngredient}>
              + Add one ingredient
            </button>
          </section>

          <section className="form-section">
            <div className="form-field">
              <label htmlFor="directions">Directions</label>
              <p className="form-hint">One step per line.</p>
              <textarea
                id="directions"
                value={directions}
                onChange={(e) => setDirections(e.target.value)}
                rows={6}
                placeholder={'Preheat oven to 350°F\nMix dry ingredients\nBake 25 minutes'}
                aria-invalid={Boolean(errors.directions)}
              />
              {errors.directions && <p className="form-error">{errors.directions}</p>}
            </div>
          </section>
        </>
      )}

      <details className="form-section optional-details" open={hasOptionalDetails}>
        <summary>Equipment &amp; extras</summary>
        <div className="optional-details-body">
          <div className="form-field">
            <label htmlFor="tools">Equipment</label>
            <input
              id="tools"
              type="text"
              placeholder="skillet, oven"
              value={tools}
              onChange={(e) => setTools(e.target.value)}
            />
          </div>
          <div className="form-field optional-details-source">
            <label htmlFor="sourceUrl">Source link</label>
            <input
              id="sourceUrl"
              type="text"
              inputMode="url"
              placeholder="https://…"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
            />
          </div>
        </div>
      </details>

      <div className="form-actions form-actions--sticky">
        <button className="primary-btn" type="submit">
          {saveLabel}
        </button>
        <button className="secondary-btn" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default RecipeForm;
