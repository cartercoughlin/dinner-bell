import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { BrowserRouter, NavLink, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';
import { RecipeProvider } from './contexts/RecipeContext';
import { useRecipes } from './contexts/RecipeContext';
import { TimerProvider } from './contexts/TimerContext';
import { FloatingTimer } from './components/FloatingTimer';
import { FamilySharingSheet } from './components/FamilySharingSheet';
import { isSupabaseEnabled } from './lib/supabase';
import RecipeListPage from './pages/RecipeListPage';
import RecipeDetailPage from './pages/RecipeDetailPage';
import RecipeFormPage from './pages/RecipeFormPage';
import CalendarPage from './pages/CalendarPage';
import GroceryListPage from './pages/GroceryListPage';
import SurpriseMePage from './pages/SurpriseMePage';
import JoinPage from './pages/JoinPage';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    const activeElement = document.activeElement;
    const isEditing =
      activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLTextAreaElement ||
      activeElement instanceof HTMLSelectElement;

    if (isEditing) return;

    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function getJoinPathFromUrl(urlString: string): string | null {
  try {
    const url = new URL(urlString);
    const parts = url.pathname.split('/').filter(Boolean);
    let token: string | undefined;

    if (url.protocol === 'dinnerbell:') {
      token = url.hostname === 'join' ? parts[0] : parts[0] === 'join' ? parts[1] : undefined;
    } else if (url.pathname.startsWith('/join/')) {
      token = parts[1];
    }

    return token ? `/join/${encodeURIComponent(decodeURIComponent(token))}` : null;
  } catch {
    return null;
  }
}

function DeepLinkHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const openUrl = (url: string | undefined) => {
      if (!url) return;
      const joinPath = getJoinPathFromUrl(url);
      if (joinPath) navigate(joinPath);
    };

    void CapacitorApp.getLaunchUrl().then(result => openUrl(result?.url));

    let removeListener: (() => void) | undefined;
    void CapacitorApp.addListener('appUrlOpen', event => openUrl(event.url)).then(handle => {
      removeListener = () => handle.remove();
    });

    return () => removeListener?.();
  }, [navigate]);

  return null;
}

function EdgeSwipeBackHandler() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let tracking = false;

    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      return Boolean(
        target.closest('input, textarea, select, [contenteditable="true"], button, a')
      );
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1 || location.pathname === '/') {
        tracking = false;
        return;
      }

      const touch = event.touches[0];
      const startsAtLeftEdge = touch.clientX <= 28;

      tracking = startsAtLeftEdge && !isEditableTarget(event.target);
      startX = touch.clientX;
      startY = touch.clientY;
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (!tracking) return;
      tracking = false;

      const touch = event.changedTouches[0];
      if (!touch) return;

      const deltaX = touch.clientX - startX;
      const deltaY = Math.abs(touch.clientY - startY);
      const mostlyHorizontal = deltaX > 72 && deltaX > deltaY * 1.5;

      if (mostlyHorizontal) {
        navigate(-1);
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [location.pathname, navigate]);

  return null;
}

function EmailLoginGate({ children }: { children: ReactNode }) {
  const { connectEmail, userEmail } = useRecipes();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isSupabaseEnabled || userEmail) return <>{children}</>;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;

    setIsSaving(true);
    setError('');
    try {
      await connectEmail(email);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save email.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="email-login-screen">
      <form className="email-login-card" onSubmit={submit}>
        <h1>Dinner Bell <span aria-hidden="true">🔔</span></h1>
        <p>Enter an email to keep your recipes available across devices and reinstalls.</p>
        <label htmlFor="firstRunEmail">Email</label>
        <div className="email-login-row">
          <input
            id="firstRunEmail"
            type="email"
            inputMode="email"
            value={email}
            onChange={event => {
              setEmail(event.target.value);
              setError('');
            }}
            placeholder="you@example.com"
            autoCapitalize="off"
            autoFocus
          />
          <button className="primary-btn" type="submit" disabled={!email.trim() || isSaving}>
            {isSaving ? 'Saving' : 'Continue'}
          </button>
        </div>
        {error && <p className="form-error">{error}</p>}
      </form>
    </main>
  );
}

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
      <ScrollToTop />
      <DeepLinkHandler />
      <EdgeSwipeBackHandler />
      <TimerProvider>
      <RecipeProvider>
        <EmailLoginGate>
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
        </EmailLoginGate>
      </RecipeProvider>
      </TimerProvider>
    </BrowserRouter>
  );
}

export default App;
