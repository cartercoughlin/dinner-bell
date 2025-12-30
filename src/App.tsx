import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RecipeProvider } from './contexts/RecipeContext';
import RecipeListPage from './pages/RecipeListPage';
import RecipeDetailPage from './pages/RecipeDetailPage';
import RecipeFormPage from './pages/RecipeFormPage';

function App() {
  return (
    <BrowserRouter>
      <RecipeProvider>
        <div className="app">
          <header>
            <h1>Dinner Bell</h1>
            <p>🔔 Your Recipe Manager</p>
          </header>
          <main>
            <Routes>
              <Route path="/" element={<RecipeListPage />} />
              <Route path="/recipe/new" element={<RecipeFormPage />} />
              <Route path="/recipe/:id" element={<RecipeDetailPage />} />
              <Route path="/recipe/:id/edit" element={<RecipeFormPage />} />
            </Routes>
          </main>
        </div>
      </RecipeProvider>
    </BrowserRouter>
  );
}

export default App;
