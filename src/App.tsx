import { useEffect, useState } from 'react';
import { BrowserRouter, NavLink, Routes, Route } from 'react-router-dom';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';
import { RecipeProvider } from './contexts/RecipeContext';
import { TimerProvider } from './contexts/TimerContext';
import { FloatingTimer } from './components/FloatingTimer';
import { FamilySharingSheet } from './components/FamilySharingSheet';
import RecipeListPage from './pages/RecipeListPage';
import RecipeDetailPage from './pages/RecipeDetailPage';
import RecipeFormPage from './pages/RecipeFormPage';
import CalendarPage from './pages/CalendarPage';
import GroceryListPage from './pages/GroceryListPage';
import SurpriseMePage from './pages/SurpriseMePage';
import JoinPage from './pages/JoinPage';

function App() {
  const [sharingOpen, setSharingOpen] = useState(false);

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
      <TimerProvider>
      <RecipeProvider>
        <div className="app">
          <header className="app-header">
            <div className="app-header-title-row">
              <h1>
                Dinner Bell <span aria-hidden="true">🔔</span>
              </h1>
              <button
                className="share-household-btn"
                onClick={() => setSharingOpen(true)}
                aria-label="Family sharing"
                title="Family sharing"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <line x1="19" y1="8" x2="19" y2="14"/>
                  <line x1="22" y1="11" x2="16" y2="11"/>
                </svg>
              </button>
            </div>
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
              <Route path="/join/:token" element={<JoinPage />} />
            </Routes>
          </main>
        </div>
        <FloatingTimer />
        {sharingOpen && <FamilySharingSheet onClose={() => setSharingOpen(false)} />}
      </RecipeProvider>
      </TimerProvider>
    </BrowserRouter>
  );
}

export default App;
