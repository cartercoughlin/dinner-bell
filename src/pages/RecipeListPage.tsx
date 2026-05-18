import { useNavigate } from 'react-router-dom';
import { RecipeList } from '../components/RecipeList';

function RecipeListPage() {
  const navigate = useNavigate();

  return (
    <div className="stack">
      <div className="page-toolbar">
        <h1>My Recipes</h1>
        <div className="toolbar-actions">
          <button type="button" onClick={() => navigate('/recipe/new')}>
            + Add Recipe
          </button>
        </div>
      </div>
      <RecipeList />
    </div>
  );
}

export default RecipeListPage;
