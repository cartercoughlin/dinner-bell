import { useNavigate } from 'react-router-dom';
import { RecipeList } from '../components/RecipeList';

function RecipeListPage() {
  const navigate = useNavigate();

  return (
    <div className="stack">
      <div className="page-toolbar">
        <h1>My Recipes</h1>
        <div className="toolbar-actions">
          <button type="button" className="icon-add-btn" onClick={() => navigate('/recipe/new')} aria-label="Add recipe">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="11" y1="4" x2="11" y2="18" />
              <line x1="4" y1="11" x2="18" y2="11" />
            </svg>
          </button>
        </div>
      </div>
      <RecipeList />
    </div>
  );
}

export default RecipeListPage;
