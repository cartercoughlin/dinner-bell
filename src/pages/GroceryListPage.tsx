import { useMemo, useState, useEffect, useRef } from 'react';
import { useRecipes } from '../contexts/RecipeContext';
import { buildGroceryCategories } from '../utils/grocery';
import { startOfWeek, toDateKey, addDays } from '../utils/dates';
import { supabase, isSupabaseEnabled, getUserToken } from '../lib/supabase';

const CHECKED_KEY = 'dinner-bell-grocery-checked';

function GroceryListPage() {
  const { recipes, mealPlans } = useRecipes();
  const [source, setSource] = useState<'week' | 'all'>('week');
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [resetState, setResetState] = useState<'idle' | 'confirm' | 'reset'>('idle');
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    if (isSupabaseEnabled) return {}; // will be loaded from Supabase
    try {
      const s = localStorage.getItem(CHECKED_KEY);
      return s ? JSON.parse(s) : {};
    } catch {
      return {};
    }
  });

  const isMounted = useRef(false);
  const copyTimer = useRef<number | null>(null);
  const resetTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
    };
  }, []);

  // Load checked state from Supabase on mount
  useEffect(() => {
    if (!isSupabaseEnabled) return;
    const token = getUserToken();
    supabase!
      .from('grocery_checks')
      .select('keys')
      .eq('user_token', token)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.keys) {
          const obj: Record<string, boolean> = {};
          (data.keys as string[]).forEach(k => { obj[k] = true; });
          setChecked(obj);
        }
        isMounted.current = true;
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync checked state whenever it changes (skip the initial population)
  useEffect(() => {
    if (!isMounted.current) return;

    if (isSupabaseEnabled) {
      const token = getUserToken();
      supabase!
        .from('grocery_checks')
        .upsert({ user_token: token, keys: Object.keys(checked) })
        .then(({ error }) => {
          if (error) console.error('Supabase upsert (grocery_checks) failed:', error);
        });
    } else {
      localStorage.setItem(CHECKED_KEY, JSON.stringify(checked));
    }
  }, [checked]);

  const selectedRecipes = useMemo(() => {
    if (source === 'all') return recipes;

    const weekStart = startOfWeek();
    const weekDates = new Set(
      Array.from({ length: 7 }, (_, i) => toDateKey(addDays(weekStart, i)))
    );
    const recipeIds = new Set(
      mealPlans
        .filter(mp => weekDates.has(mp.date))
        .map(mp => mp.recipeId)
    );
    return recipes.filter(r => recipeIds.has(r.id));
  }, [mealPlans, recipes, source]);

  const categories = useMemo(() => buildGroceryCategories(selectedRecipes), [selectedRecipes]);

  const toggleItem = (key: string) => {
    setChecked(prev => {
      const next = { ...prev, [key]: !prev[key] };
      if (!next[key]) delete next[key];
      return next;
    });
  };

  const showResetState = (state: 'confirm' | 'reset') => {
    setResetState(state);
    if (resetTimer.current) window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setResetState('idle'), state === 'confirm' ? 3200 : 1800);
  };

  const reset = () => {
    if (resetState !== 'confirm') {
      showResetState('confirm');
      return;
    }

    setChecked({});
    if (!isSupabaseEnabled) localStorage.removeItem(CHECKED_KEY);
    showResetState('reset');
  };

  const groceryText = useMemo(() => {
    return categories
      .flatMap(cat => [
        cat.name,
        ...cat.items.map(item => {
          const amount = item.amounts.length ? ` - ${item.amounts.join(', ')}` : '';
          return `• ${item.name}${amount}`;
        }),
        '',
      ])
      .join('\n')
      .trim();
  }, [categories]);

  const showCopyState = (state: 'copied' | 'failed') => {
    setCopyState(state);
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopyState('idle'), 1800);
  };

  const copy = async () => {
    if (!groceryText) return;

    try {
      if (navigator.clipboard?.write && window.ClipboardItem) {
        const plainText = new Blob([groceryText], { type: 'text/plain' });
        await navigator.clipboard.write([
          new ClipboardItem({ 'text/plain': plainText }),
        ]);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(groceryText);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = groceryText;
        textArea.setAttribute('readonly', '');
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      showCopyState('copied');
    } catch (error) {
      console.error('Copy failed:', error);
      showCopyState('failed');
    }
  };

  return (
    <div className="stack">
      <div className="page-toolbar">
        <h1>Grocery List</h1>
        <div className="toolbar-actions">
          <button
            type="button"
            className={`copy-list-btn ${copyState === 'copied' ? 'copy-list-btn--copied' : ''}`}
            onClick={copy}
            disabled={!groceryText}
            aria-live="polite"
          >
            {copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Copy failed' : 'Copy'}
          </button>
          <button
            type="button"
            className={`reset-list-btn ${resetState === 'confirm' ? 'reset-list-btn--confirm' : ''} ${resetState === 'reset' ? 'reset-list-btn--reset' : ''}`}
            onClick={reset}
            aria-live="polite"
          >
            {resetState === 'confirm' ? 'Tap again' : resetState === 'reset' ? 'Reset done' : 'Reset'}
          </button>
        </div>
      </div>

      <div className="segmented-control">
        <button type="button" className={source === 'week' ? 'active' : ''} onClick={() => setSource('week')}>
          This week
        </button>
        <button type="button" className={source === 'all' ? 'active' : ''} onClick={() => setSource('all')}>
          All recipes
        </button>
      </div>

      {categories.length === 0 ? (
        <div className="empty-state">
          <h2>No grocery items</h2>
          <p>Add meals to the calendar or switch to all recipes.</p>
        </div>
      ) : (
        <div className="grocery-categories">
          {categories.map(category => (
            <section className="grocery-category" key={category.name}>
              <h2>{category.name}</h2>
              {category.items.map(item => (
                <label className={`grocery-item ${checked[item.key] ? 'checked' : ''}`} key={item.key}>
                  <input
                    type="checkbox"
                    checked={Boolean(checked[item.key])}
                    onChange={() => toggleItem(item.key)}
                  />
                  <span>
                    <strong>{item.name}</strong>
                    {item.amounts.length > 0 && <em>{item.amounts.join(', ')}</em>}
                    <small>{item.recipes.join(', ')}</small>
                  </span>
                </label>
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export default GroceryListPage;
