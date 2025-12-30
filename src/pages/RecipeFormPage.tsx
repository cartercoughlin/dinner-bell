import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useRecipes } from '../contexts/RecipeContext';
import { RecipeFormData } from '../types/recipe';
import RecipeForm from '../components/RecipeForm';

function RecipeFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getRecipe, addRecipe, updateRecipe } = useRecipes();
  const [initialData, setInitialData] = useState<RecipeFormData | undefined>();
  const isEditMode = Boolean(id);

  useEffect(() => {
    if (id) {
      const recipe = getRecipe(id);
      if (recipe) {
        setInitialData(recipe);
      } else {
        navigate('/');
      }
    }
  }, [id, getRecipe, navigate]);

  const handleSubmit = (data: RecipeFormData) => {
    if (isEditMode && id) {
      const existingRecipe = getRecipe(id);
      if (existingRecipe) {
        updateRecipe({
          ...data,
          id: existingRecipe.id,
          dateAdded: existingRecipe.dateAdded,
          lastMade: existingRecipe.lastMade,
        });
      }
      navigate(`/recipe/${id}`);
    } else {
      const newRecipe = addRecipe(data);
      navigate(`/recipe/${newRecipe.id}`);
    }
  };

  const handleCancel = () => {
    if (id) {
      navigate(`/recipe/${id}`);
    } else {
      navigate('/');
    }
  };

  return (
    <div>
      <h1>{isEditMode ? 'Edit Recipe' : 'Add New Recipe'}</h1>
      <RecipeForm
        initialData={initialData}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  );
}

export default RecipeFormPage;
