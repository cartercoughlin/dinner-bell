import { useNavigate } from 'react-router-dom';
import { RecipeList } from '../components/RecipeList';

function RecipeListPage() {
  const navigate = useNavigate();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>My Recipes</h1>
        <button
          onClick={() => navigate('/recipe/new')}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            backgroundColor: '#646cff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          + Add Recipe
        </button>
      </div>
      <RecipeList />
    </div>
  );
}

export default RecipeListPage;
