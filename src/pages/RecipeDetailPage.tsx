import { useParams, useNavigate } from 'react-router-dom';
import { useRecipes } from '../contexts/RecipeContext';
import { useState } from 'react';
import RecipeDetail from '../components/RecipeDetail';
import ConfirmDialog from '../components/common/ConfirmDialog';

function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getRecipe, deleteRecipe } = useRecipes();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!id) {
    navigate('/');
    return null;
  }

  const recipe = getRecipe(id);

  if (!recipe) {
    return (
      <div>
        <h2>Recipe not found</h2>
        <button onClick={() => navigate('/')}>Back to Recipes</button>
      </div>
    );
  }

  const handleEdit = () => {
    navigate(`/recipe/${id}/edit`);
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    deleteRecipe(id);
    navigate('/');
  };

  return (
    <div>
      <RecipeDetail
        recipe={recipe}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onBack={() => navigate('/')}
      />
      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete Recipe"
        message={`Are you sure you want to delete "${recipe.title}"? This action cannot be undone.`}
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}

export default RecipeDetailPage;
