import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';
import { RecipeProvider } from './contexts/RecipeContext';
import RecipeListPage from './pages/RecipeListPage';
import RecipeDetailPage from './pages/RecipeDetailPage';
import RecipeFormPage from './pages/RecipeFormPage';

function App() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    StatusBar.setStyle({ style: Style.Dark });
    StatusBar.setBackgroundColor({ color: '#242424' });

    // Scroll the view up when keyboard hides so inputs are never obscured
    Keyboard.addListener('keyboardWillShow', () => {
      document.body.classList.add('keyboard-open');
    });
    Keyboard.addListener('keyboardWillHide', () => {
      document.body.classList.remove('keyboard-open');
    });

    return () => {
      Keyboard.removeAllListeners();
    };
  }, []);

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
