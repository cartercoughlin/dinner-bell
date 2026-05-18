import { useEffect } from 'react';
import { BrowserRouter, NavLink, Routes, Route } from 'react-router-dom';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';
import { RecipeProvider } from './contexts/RecipeContext';
import RecipeListPage from './pages/RecipeListPage';
import RecipeDetailPage from './pages/RecipeDetailPage';
import RecipeFormPage from './pages/RecipeFormPage';
import CalendarPage from './pages/CalendarPage';
import GroceryListPage from './pages/GroceryListPage';
import SurpriseMePage from './pages/SurpriseMePage';

function App() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    StatusBar.setStyle({ style: Style.Dark });
    StatusBar.setBackgroundColor({ color: '#ffffff' });

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
          <header className="app-header">
            <h1>
              Dinner Bell <span aria-hidden="true">🔔</span>
            </h1>
            <nav className="app-nav" aria-label="Primary">
              <NavLink to="/" end>Recipes</NavLink>
              <NavLink to="/calendar">Calendar</NavLink>
              <NavLink to="/grocery-list">Grocery List</NavLink>
              <NavLink to="/surprise">Surprise Me</NavLink>
            </nav>
          </header>
          <main>
            <Routes>
              <Route path="/" element={<RecipeListPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/grocery-list" element={<GroceryListPage />} />
              <Route path="/surprise" element={<SurpriseMePage />} />
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
