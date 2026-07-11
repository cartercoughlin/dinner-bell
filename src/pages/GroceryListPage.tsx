import { useMemo, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useRecipes } from '../contexts/RecipeContext';
import { buildGroceryCategories } from '../utils/grocery';
import { startOfWeek, toDateKey, addDays } from '../utils/dates';
import { supabase, isSupabaseEnabled, getUserToken } from '../lib/supabase';

const CHECKED_KEY = 'dinner-bell-grocery-checked';
const CUSTOM_ITEMS_KEY = 'dinner-bell-grocery-custom';
const DELETED_ITEMS_KEY = 'dinner-bell-grocery-deleted';
const RENAMED_ITEMS_KEY = 'dinner-bell-grocery-renamed';

type CustomItem = { name: string; key: string };

type GroceryItemView = {
  key: string;
  name: string;
  amounts: string[];
  recipes: string[];
};

type GroceryCategoryView = {
  name: string;
  items: GroceryItemView[];
};

const FRACTION_VALUES: Record<string, number> = {
  '1/8': 0.125,
  '1/4': 0.25,
  '1/3': 1 / 3,
  '1/2': 0.5,
  '2/3': 2 / 3,
  '3/4': 0.75,
};

const UNIT_ALIASES: Record<string, string> = {
  cups: 'cup',
  tablespoons: 'tbsp',
  tablespoon: 'tbsp',
  tbsp: 'tbsp',
  teaspoons: 'tsp',
  teaspoon: 'tsp',
  tsp: 'tsp',
  pounds: 'lb',
  pound: 'lb',
  lbs: 'lb',
  ounces: 'oz',
  ounce: 'oz',
  oz: 'oz',
  cloves: 'clove',
  cans: 'can',
};

function normalizeGroceryName(name: string) {
  return name.toLowerCase().replace(/\s+/g, ' ').trim();
}

function parseAmountLabel(label: string) {
  const parts = label.trim().split(/\s+/);
  if (parts.length === 0) return null;

  let value = 0;
  let index = 0;
  while (index < parts.length) {
    const part = parts[index];
    if (FRACTION_VALUES[part]) {
      value += FRACTION_VALUES[part];
      index += 1;
      continue;
    }

    const fraction = part.match(/^(\d+)\/(\d+)$/);
    if (fraction) {
      value += Number(fraction[1]) / Number(fraction[2]);
      index += 1;
      continue;
    }

    const number = Number(part);
    if (!Number.isNaN(number)) {
      value += number;
      index += 1;
      continue;
    }

    break;
  }

  if (index === 0 || value <= 0) return null;
  const unit = parts.slice(index).join(' ').trim().toLowerCase();
  return { value, unit: UNIT_ALIASES[unit] ?? unit };
}

function formatAmount(value: number) {
  const whole = Math.floor(value);
  const remainder = value - whole;
  const fraction = Object.entries(FRACTION_VALUES).find(([, amount]) => Math.abs(amount - remainder) < 0.01)?.[0];

  if (fraction && whole > 0) return `${whole} ${fraction}`;
  if (fraction) return fraction;
  if (Math.abs(value - Math.round(value)) < 0.01) return String(Math.round(value));
  return String(Number(value.toFixed(2)));
}

function combineAmounts(amounts: string[]) {
  const totals = new Map<string, number>();
  const passthrough: string[] = [];

  amounts.forEach((amount) => {
    const parsed = parseAmountLabel(amount);
    if (!parsed) {
      passthrough.push(amount);
      return;
    }
    totals.set(parsed.unit, (totals.get(parsed.unit) ?? 0) + parsed.value);
  });

  return [
    ...Array.from(totals.entries()).map(([unit, value]) =>
      [formatAmount(value), unit].filter(Boolean).join(' ')
    ),
    ...passthrough,
  ];
}

function GroceryListPage() {
  const { recipes, mealPlans } = useRecipes();
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [resetState, setResetState] = useState<'idle' | 'confirm' | 'reset'>('idle');
  const [newItem, setNewItem] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [sourceOpenKey, setSourceOpenKey] = useState<string | null>(null);
  const [confirmingDeleteKey, setConfirmingDeleteKey] = useState<string | null>(null);
  const confirmDeleteTimer = useRef<number | null>(null);
  const editRef = useRef<HTMLInputElement>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    if (isSupabaseEnabled) return {};
    try {
      const s = localStorage.getItem(CHECKED_KEY);
      return s ? JSON.parse(s) : {};
    } catch {
      return {};
    }
  });
  const [customItems, setCustomItems] = useState<CustomItem[]>(() => {
    if (isSupabaseEnabled) return [];
    try {
      const s = localStorage.getItem(CUSTOM_ITEMS_KEY);
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });
  const [deletedKeys, setDeletedKeys] = useState<Set<string>>(() => {
    if (isSupabaseEnabled) return new Set();
    try {
      const s = localStorage.getItem(DELETED_ITEMS_KEY);
      return s ? new Set(JSON.parse(s)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [renamedItems, setRenamedItems] = useState<Record<string, string>>(() => {
    if (isSupabaseEnabled) return {};
    try {
      const s = localStorage.getItem(RENAMED_ITEMS_KEY);
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
      if (confirmDeleteTimer.current) window.clearTimeout(confirmDeleteTimer.current);
    };
  }, []);

  // Load all grocery state from Supabase on mount
  useEffect(() => {
    if (!isSupabaseEnabled) return;
    const token = getUserToken();
    supabase!
      .from('grocery_checks')
        .select('keys, custom_items, deleted_keys, renamed_items')
      .eq('user_token', token)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.keys) {
          const obj: Record<string, boolean> = {};
          (data.keys as string[]).forEach(k => { obj[k] = true; });
          setChecked(obj);
        }
        if (data?.custom_items) {
          setCustomItems(data.custom_items as CustomItem[]);
        }
        if (data?.deleted_keys) {
          setDeletedKeys(new Set(data.deleted_keys as string[]));
        }
        if (data?.renamed_items) {
          setRenamedItems(data.renamed_items as Record<string, string>);
        }
        isMounted.current = true;
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync checked state
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

  // Sync custom items
  useEffect(() => {
    if (!isMounted.current && isSupabaseEnabled) return;
    if (isSupabaseEnabled) {
      const token = getUserToken();
      supabase!
        .from('grocery_checks')
        .upsert({ user_token: token, custom_items: customItems })
        .then(({ error }) => {
          if (error) console.error('Supabase upsert (custom_items) failed:', error);
        });
    } else {
      localStorage.setItem(CUSTOM_ITEMS_KEY, JSON.stringify(customItems));
    }
  }, [customItems]);

  // Sync deleted keys
  useEffect(() => {
    if (!isMounted.current && isSupabaseEnabled) return;
    if (isSupabaseEnabled) {
      const token = getUserToken();
      supabase!
        .from('grocery_checks')
        .upsert({ user_token: token, deleted_keys: [...deletedKeys] })
        .then(({ error }) => {
          if (error) console.error('Supabase upsert (deleted_keys) failed:', error);
        });
    } else {
      localStorage.setItem(DELETED_ITEMS_KEY, JSON.stringify([...deletedKeys]));
    }
  }, [deletedKeys]);

  // Sync renamed items
  useEffect(() => {
    if (!isMounted.current && isSupabaseEnabled) return;
    if (isSupabaseEnabled) {
      const token = getUserToken();
      supabase!
        .from('grocery_checks')
        .upsert({ user_token: token, renamed_items: renamedItems })
        .then(({ error }) => {
          if (error) console.error('Supabase upsert (renamed_items) failed:', error);
        });
    } else {
      localStorage.setItem(RENAMED_ITEMS_KEY, JSON.stringify(renamedItems));
    }
  }, [renamedItems]);

  useEffect(() => {
    if (editingKey && editRef.current) {
      editRef.current.focus();
      editRef.current.select();
    }
  }, [editingKey]);

  const selectedRecipes = useMemo(() => {
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
  }, [mealPlans, recipes]);

  const categories = useMemo<GroceryCategoryView[]>(() => {
    const base = buildGroceryCategories(selectedRecipes);
    const grouped = new Map<string, GroceryItemView & { category: string }>();

    base.forEach((category) => {
      category.items
        .filter(item => !deletedKeys.has(item.key))
        .forEach((item) => {
          const name = renamedItems[item.key] ?? item.name;
          const groupKey = normalizeGroceryName(name);
          const existing = grouped.get(groupKey);
          if (existing) {
            existing.key = `${existing.key}|${item.key}`;
            existing.amounts.push(...item.amounts);
            existing.recipes.push(...item.recipes);
          } else {
            grouped.set(groupKey, {
              key: item.key,
              name,
              amounts: [...item.amounts],
              recipes: [...item.recipes],
              category: category.name,
            });
          }
        });
    });

    if (customItems.length > 0) {
      customItems.forEach((customItem) => {
        const groupKey = normalizeGroceryName(customItem.name);
        const existing = grouped.get(groupKey);
        if (existing) {
          existing.key = `${existing.key}|${customItem.key}`;
        } else {
          grouped.set(groupKey, {
            key: customItem.key,
            name: customItem.name,
            amounts: [],
            recipes: [],
            category: 'Added Items',
          });
        }
      });
    }

    const byCategory = new Map<string, GroceryItemView[]>();
    grouped.forEach(({ category, ...item }) => {
      const categoryItems = byCategory.get(category) ?? [];
      categoryItems.push({
        ...item,
        amounts: combineAmounts(item.amounts),
        recipes: Array.from(new Set(item.recipes)).sort(),
      });
      byCategory.set(category, categoryItems);
    });

    return Array.from(byCategory.entries()).map(([name, items]) => ({
      name,
      items: items.sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }, [selectedRecipes, customItems, deletedKeys, renamedItems]);

  const toggleItem = (key: string) => {
    setChecked(prev => {
      const next = { ...prev, [key]: !prev[key] };
      if (!next[key]) delete next[key];
      return next;
    });
  };

  const deleteItem = (key: string) => {
    const keys = key.split('|');
    setCustomItems(prev => prev.filter(ci => !keys.includes(ci.key)));
    setDeletedKeys(prev => {
      const next = new Set(prev);
      keys
        .filter(itemKey => !customItems.some(ci => ci.key === itemKey))
        .forEach(itemKey => next.add(itemKey));
      return next;
    });
    setRenamedItems(prev => {
      const next = { ...prev };
      keys.forEach(itemKey => delete next[itemKey]);
      return next;
    });
    setChecked(prev => {
      const next = { ...prev };
      keys.forEach(itemKey => delete next[itemKey]);
      return next;
    });
  };

  const startEditing = (key: string, name: string) => {
    setEditingKey(key);
    setEditingValue(name);
  };

  const commitEdit = () => {
    if (!editingKey) return;
    const trimmed = editingValue.trim();
    if (!trimmed) {
      deleteItem(editingKey);
    } else {
      const keys = editingKey.split('|');
      setCustomItems(prev => prev.map(ci =>
        keys.includes(ci.key) ? { ...ci, name: trimmed, key: `custom:${normalizeGroceryName(trimmed)}` } : ci
      ));
      setRenamedItems(prev => {
        const next = { ...prev };
        keys
          .filter(itemKey => !itemKey.startsWith('custom:'))
          .forEach(itemKey => { next[itemKey] = trimmed; });
        return next;
      });
    }
    setEditingKey(null);
    setEditingValue('');
  };

  const addItem = () => {
    const name = newItem.trim();
    if (!name) return;
    const key = `custom:${name.toLowerCase()}`;
    if (customItems.some(ci => ci.key === key)) return;
    setCustomItems(prev => [...prev, { name, key }]);
    setNewItem('');
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
    setCustomItems([]);
    setDeletedKeys(new Set());
    setRenamedItems({});
    if (isSupabaseEnabled) {
      const token = getUserToken();
      supabase!
        .from('grocery_checks')
        .upsert({ user_token: token, keys: [], custom_items: [], deleted_keys: [], renamed_items: {} })
        .then(({ error }) => {
          if (error) console.error('Supabase reset (grocery_checks) failed:', error);
        });
    } else {
      localStorage.removeItem(CHECKED_KEY);
      localStorage.removeItem(CUSTOM_ITEMS_KEY);
      localStorage.removeItem(DELETED_ITEMS_KEY);
      localStorage.removeItem(RENAMED_ITEMS_KEY);
    }
    showResetState('reset');
  };

  const allItems = useMemo(() =>
    categories.flatMap(cat => cat.items.map(item => ({ ...item, category: cat.name }))),
    [categories]
  );

  const recipeLinkByTitle = useMemo(() => {
    return new Map(recipes.map(recipe => [recipe.title, recipe.id]));
  }, [recipes]);

  const groceryText = useMemo(() => {
    return categories
      .flatMap(cat => [
        cat.name,
        ...cat.items.map(item => {
          const amount = item.amounts.length ? ` - ${item.amounts.join(', ')}` : '';
          return `  ${item.name}${amount}`;
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
        await navigator.clipboard.write([new ClipboardItem({ 'text/plain': plainText })]);
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
        <div className="toolbar-actions">
          <button
            type="button"
            className={`secondary-btn grocery-toolbar-btn ${copyState === 'copied' ? 'copy-list-btn--copied' : ''}`}
            onClick={copy}
            disabled={!groceryText}
            aria-live="polite"
          >
            {copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Failed' : 'Copy'}
          </button>
          <button
            type="button"
            className={`secondary-btn grocery-toolbar-btn ${resetState === 'confirm' ? 'reset-list-btn--confirm' : ''} ${resetState === 'reset' ? 'reset-list-btn--reset' : ''}`}
            onClick={reset}
            aria-live="polite"
          >
            {resetState === 'confirm' ? 'Tap again' : resetState === 'reset' ? 'Done' : 'Reset'}
          </button>
        </div>
      </div>

      <form
        className="grocery-add-row"
        onSubmit={(e) => { e.preventDefault(); addItem(); }}
      >
        <span className="grocery-add-icon">+</span>
        <input
          type="text"
          className="grocery-add-input"
          placeholder="Add item..."
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
        />
        <button type="submit" className="grocery-add-btn" disabled={!newItem.trim()}>
          Add
        </button>
      </form>

      {allItems.length === 0 ? (
        <div className="empty-state">
          <h2>No grocery items</h2>
          <p>Add meals to the calendar or add items above.</p>
        </div>
      ) : (
        <div className="grocery-list">
          {categories.map(category => (
            <div key={category.name}>
              <div className="grocery-section-label">{category.name}</div>
              {category.items.map(item => (
                <div className={`grocery-row ${checked[item.key] ? 'is-checked' : ''}`} key={item.key}>
                  <input
                    type="checkbox"
                    className="grocery-check"
                    checked={Boolean(checked[item.key])}
                    onChange={() => toggleItem(item.key)}
                  />
                  {editingKey === item.key ? (
                    <input
                      ref={editRef}
                      type="text"
                      className="grocery-edit-input"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitEdit();
                        if (e.key === 'Escape') { setEditingKey(null); setEditingValue(''); }
                      }}
                    />
                  ) : (
                    <div
                      className="grocery-row-content"
                      onClick={() => startEditing(item.key, item.name)}
                    >
                      <span className="grocery-row-name">{item.name}</span>
                      {item.amounts.length > 0 && (
                        <span className="grocery-row-detail">{item.amounts.join(', ')}</span>
                      )}
                    </div>
                  )}
                  <button
                    type="button"
                    className="grocery-source-btn"
                    aria-label={`Show recipes for ${item.name}`}
                    aria-expanded={sourceOpenKey === item.key}
                    disabled={item.recipes.length === 0}
                    onClick={() => setSourceOpenKey(sourceOpenKey === item.key ? null : item.key)}
                  >
                    i
                  </button>
                  <button
                    type="button"
                    className={`grocery-remove-btn ${confirmingDeleteKey === item.key ? 'grocery-remove-btn--confirm' : ''}`}
                    aria-label={`Remove ${item.name}`}
                    onClick={() => {
                      if (confirmingDeleteKey === item.key) {
                        deleteItem(item.key);
                        setConfirmingDeleteKey(null);
                        if (confirmDeleteTimer.current) window.clearTimeout(confirmDeleteTimer.current);
                      } else {
                        setConfirmingDeleteKey(item.key);
                        if (confirmDeleteTimer.current) window.clearTimeout(confirmDeleteTimer.current);
                        confirmDeleteTimer.current = window.setTimeout(() => setConfirmingDeleteKey(null), 3000);
                      }
                    }}
                  >
                    {confirmingDeleteKey === item.key ? '✓' : '×'}
                  </button>
                  {sourceOpenKey === item.key && item.recipes.length > 0 && (
                    <div className="grocery-source-panel">
                      <span>For</span>
                      <div className="grocery-source-links">
                        {item.recipes.map((recipeTitle) => {
                          const recipeId = recipeLinkByTitle.get(recipeTitle);
                          return recipeId ? (
                            <Link key={recipeTitle} to={`/recipe/${recipeId}`}>
                              {recipeTitle}
                            </Link>
                          ) : (
                            <span key={recipeTitle}>{recipeTitle}</span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default GroceryListPage;
