import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, isSupabaseEnabled, getUserToken, setUserToken } from '../lib/supabase';

type Phase = 'loading' | 'already-joined' | 'no-cloud' | 'confirm' | 'merging' | 'done' | 'error';

export default function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('loading');
  const [targetCount, setTargetCount] = useState(0);
  const [uniqueCount, setUniqueCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) { setPhase('error'); setErrorMsg('Invalid invite link.'); return; }
    if (!isSupabaseEnabled) { setPhase('no-cloud'); return; }
    if (token === getUserToken()) { setPhase('already-joined'); return; }

    (async () => {
      try {
        const [{ data: targetRows }, { data: myRows }] = await Promise.all([
          supabase!.from('recipes').select('title').eq('user_token', token),
          supabase!.from('recipes').select('title').eq('user_token', getUserToken()),
        ]);

        const targetTitles = new Set(
          (targetRows ?? []).map((r: { title: string }) => r.title.toLowerCase().trim())
        );
        const unique = (myRows ?? []).filter(
          (r: { title: string }) => !targetTitles.has(r.title.toLowerCase().trim())
        );

        setTargetCount(targetRows?.length ?? 0);
        setUniqueCount(unique.length);
        setPhase('confirm');
      } catch (e: unknown) {
        setPhase('error');
        setErrorMsg(e instanceof Error ? e.message : 'Failed to load household data.');
      }
    })();
  }, [token]);

  const join = async () => {
    if (!token || !isSupabaseEnabled) return;
    setPhase('merging');

    try {
      const myToken = getUserToken();
      const recipeIdMap = new Map<string, string>();

      const [{ data: targetRows }, { data: myRows }, { data: targetMealRows }, { data: myMealRows }, { data: targetGrocery }, { data: myGrocery }] = await Promise.all([
        supabase!.from('recipes').select('*').eq('user_token', token),
        supabase!.from('recipes').select('*').eq('user_token', myToken),
        supabase!.from('meal_plans').select('*').eq('user_token', token),
        supabase!.from('meal_plans').select('*').eq('user_token', myToken),
        supabase!.from('grocery_checks').select('keys, custom_items, deleted_keys, renamed_items').eq('user_token', token).maybeSingle(),
        supabase!.from('grocery_checks').select('keys, custom_items, deleted_keys, renamed_items').eq('user_token', myToken).maybeSingle(),
      ]);

      const targetTitles = new Set(
        (targetRows ?? []).map((r: { title: string }) => r.title.toLowerCase().trim())
      );
      (targetRows ?? []).forEach((r: { id: string; title: string }) => {
        recipeIdMap.set(r.id, r.id);
        recipeIdMap.set(r.title.toLowerCase().trim(), r.id);
      });

      const toMerge = (myRows ?? []).filter(
        (r: { title: string }) => !targetTitles.has(r.title.toLowerCase().trim())
      );

      if (toMerge.length > 0) {
        const newRows = toMerge.map((r: Record<string, unknown>) => {
          const id = crypto.randomUUID();
          recipeIdMap.set(String(r.id), id);
          recipeIdMap.set(String(r.title).toLowerCase().trim(), id);
          return {
            ...r,
            id,
            user_token: token,
            created_at: new Date().toISOString(),
          };
        });
        const { error } = await supabase!.from('recipes').insert(newRows);
        if (error) throw error;
      }

      const targetMealIds = new Set((targetMealRows ?? []).map((row: { id: string }) => row.id));
      const mealRowsToMerge = (myMealRows ?? [])
        .filter((row: { id: string }) => !targetMealIds.has(row.id))
        .map((row: Record<string, unknown>) => ({
          ...row,
          user_token: token,
          recipe_id: recipeIdMap.get(String(row.recipe_id)) ?? row.recipe_id,
        }));

      if (mealRowsToMerge.length > 0) {
        const { error } = await supabase!.from('meal_plans').insert(mealRowsToMerge);
        if (error) throw error;
      }

      const mergedGrocery = {
        user_token: token,
        keys: Array.from(new Set([...(targetGrocery?.keys ?? []), ...(myGrocery?.keys ?? [])])),
        custom_items: [
          ...(targetGrocery?.custom_items ?? []),
          ...(myGrocery?.custom_items ?? []).filter((item: { key: string }) =>
            !(targetGrocery?.custom_items ?? []).some((existing: { key: string }) => existing.key === item.key)
          ),
        ],
        deleted_keys: Array.from(new Set([...(targetGrocery?.deleted_keys ?? []), ...(myGrocery?.deleted_keys ?? [])])),
        renamed_items: {
          ...(targetGrocery?.renamed_items ?? {}),
          ...(myGrocery?.renamed_items ?? {}),
        },
      };
      const { error: groceryError } = await supabase!.from('grocery_checks').upsert(mergedGrocery);
      if (groceryError) throw groceryError;

      setUserToken(token);
      setPhase('done');
      setTimeout(() => {
        navigate('/', { replace: true });
        window.location.reload();
      }, 1500);
    } catch (e: unknown) {
      setPhase('error');
      setErrorMsg(e instanceof Error ? e.message : 'Something went wrong during merge.');
    }
  };

  return (
    <div className="join-page">
      <div className="join-card">
        <div className="join-icon" aria-hidden="true">🔔</div>

        {phase === 'loading' && (
          <>
            <h1>Joining household…</h1>
            <div className="loading-spinner" style={{ margin: '24px auto' }} />
          </>
        )}

        {phase === 'already-joined' && (
          <>
            <h1>Already synced</h1>
            <p>This device is already part of this household.</p>
            <button className="primary-btn" onClick={() => navigate('/')}>Go to recipes</button>
          </>
        )}

        {phase === 'no-cloud' && (
          <>
            <h1>Cloud sync required</h1>
            <p>Family sharing needs cloud sync to be enabled. Contact the app administrator.</p>
            <button className="primary-btn" onClick={() => navigate('/')}>Back</button>
          </>
        )}

        {phase === 'confirm' && (
          <>
            <h1>Join household</h1>
            <p className="join-summary">
              This household has <strong>{targetCount}</strong> {targetCount === 1 ? 'recipe' : 'recipes'}.
              {uniqueCount > 0 && (
                <> Your <strong>{uniqueCount}</strong> unique {uniqueCount === 1 ? 'recipe' : 'recipes'} will be added to the shared list.</>
              )}
              {uniqueCount === 0 && <> You have no unique recipes to add.</>}
            </p>
            <p className="join-note">Your meal plan and grocery checks will switch to this household.</p>
            <div className="join-actions">
              <button className="secondary-btn" onClick={() => navigate('/')}>Cancel</button>
              <button className="primary-btn" onClick={join}>Join</button>
            </div>
          </>
        )}

        {phase === 'merging' && (
          <>
            <h1>Joining…</h1>
            <div className="loading-spinner" style={{ margin: '24px auto' }} />
          </>
        )}

        {phase === 'done' && (
          <>
            <h1>You're in! ✓</h1>
            <p>Switching to shared household…</p>
          </>
        )}

        {phase === 'error' && (
          <>
            <h1>Something went wrong</h1>
            <p>{errorMsg}</p>
            <button className="primary-btn" onClick={() => navigate('/')}>Back</button>
          </>
        )}
      </div>
    </div>
  );
}
