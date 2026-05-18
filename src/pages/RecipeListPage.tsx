import { useNavigate } from 'react-router-dom';
import { RecipeList } from '../components/RecipeList';

function RecipeListPage() {
  const navigate = useNavigate();

  return (
    <div className="stack">
      <div className="page-toolbar">
        <h1>My Recipes</h1>
        <div className="toolbar-actions recipe-list-actions">
          <button type="button" className="add-recipe-btn" onClick={() => navigate('/recipe/new')}>
            <span aria-hidden="true">+</span>
            <span>Add Recipe</span>
          </button>
        </div>
      </div>
      <RecipeList />
    </div>
  );
}

export default RecipeListPage;
