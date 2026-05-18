import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecipes } from '../contexts/RecipeContext';
import { MakeModeModal } from './MakeModeModal';
import { Recipe } from '../types/recipe';

function normalize(s: string) {
  return s.toLowerCase().trim();
}

function recipeMatchesSearch(recipe: Recipe, query: string): boolean {
  const q = normalize(query);
  if (!q) return true;
  if (normalize(recipe.title).includes(q)) return true;
  if (recipe.sourceUrl && normalize(recipe.sourceUrl).includes(q)) return true;
  return recipe.ingredients.some(ing => normalize(ing.name).includes(q));
}

export function RecipeList() {
  const { recipes, loading } = useRecipes();
  const navigate = useNavigate();
  const [makingRecipe, setMakingRecipe] = useState<Recipe | null>(null);

  const [query, setQuery]       = useState('');
  const [tagFilter, setTag]     = useState('');
  const [toolFilter, setTool]   = useState('');

  // Derive available tags and tools from the loaded recipes
  const allTags  = useMemo(() => {
    const s = new Set<string>();
    recipes.forEach(r => r.tags?.forEach(t => s.add(t)));
    return [...s].sort();
  }, [recipes]);

  const allTools = useMemo(() => {
    const s = new Set<string>();
    recipes.forEach(r => r.tools?.forEach(t => s.add(t)));
    return [...s].sort();
  }, [recipes]);

  const filtered = useMemo(() => {
    return recipes.filter(r => {
      if (!recipeMatchesSearch(r, query)) return false;
      if (tagFilter  && !r.tags?.some(t  => normalize(t) === normalize(tagFilter)))  return false;
      if (toolFilter && !r.tools?.some(t => normalize(t) === normalize(toolFilter))) return false;
      return true;
    });
  }, [recipes, query, tagFilter, toolFilter]);

  const isFiltered = query !== '' || tagFilter !== '' || toolFilter !== '';

  const clearFilters = () => {
    setQuery('');
    setTag('');
    setTool('');
  };

  if (loading && recipes.length === 0) {
    return (
      <div className="empty-state">
        <div className="loading-spinner" aria-label="Loading recipes" />
      </div>
    );
  }

  if (!loading && recipes.length === 0) {
    return (
      <div className="empty-state">
        <h2>No recipes yet</h2>
        <p>Add your first recipe to get started!</p>
      </div>
    );
  }

  return (
    <>
      {/* Search & filter bar */}
      <div className="recipe-search">
        <div className="recipe-search-bar">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="6.5" cy="6.5" r="4.5" />
            <line x1="10.5" y1="10.5" x2="14" y2="14" />
          </svg>
          <input
            type="search"
            className="recipe-search-input"
            placeholder="Search by title, ingredient, or website…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            aria-label="Search recipes"
          />
        </div>

        <div className="recipe-filter-row">
          {allTags.length > 0 && (
            <select
              className="filter-select"
              value={tagFilter}
              onChange={e => setTag(e.target.value)}
              aria-label="Filter by category"
            >
              <option value="">All categories</option>
              {allTags.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}

          {allTools.length > 0 && (
            <select
              className="filter-select"
              value={toolFilter}
              onChange={e => setTool(e.target.value)}
              aria-label="Filter by equipment"
            >
              <option value="">All equipment</option>
              {allTools.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}

          {isFiltered && (
            <button className="filter-clear-btn" onClick={clearFilters}>
              Clear
            </button>
          )}

          {isFiltered && (
            <span className="filter-count">
              {filtered.length} of {recipes.length}
            </span>
          )}
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <h2>No matching recipes</h2>
          <p>Try a different search or clear the filters.</p>
        </div>
      ) : (
        <div className="recipe-grid">
          {filtered.map((recipe) => (
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
                    <span
                      key={tag}
                      className={`tag ${normalize(tag) === normalize(tagFilter) ? 'tag--active' : ''}`}
                      onClick={e => { e.stopPropagation(); setTag(tagFilter === tag ? '' : tag); }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="recipe-card-footer">
                <button
                  className="make-btn"
                  onClick={e => { e.stopPropagation(); setMakingRecipe(recipe); }}
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
      )}

      {makingRecipe && (
        <MakeModeModal
          recipe={makingRecipe}
          onClose={() => setMakingRecipe(null)}
        />
      )}
    </>
  );
}
