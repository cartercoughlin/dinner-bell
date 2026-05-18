import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Recipe } from '../types/recipe';
import { matchIngredientsToSteps } from '../utils/matchIngredients';
import { extractMinutes, formatTime } from '../utils/extractTime';
import { useTimer } from '../contexts/TimerContext';

interface Props {
  recipe: Recipe;
  onClose: () => void;
}

function StepTimer({ suggestedMinutes }: { suggestedMinutes: number | null }) {
  const { status, remaining, start, pause, resume, reset } = useTimer();
  // String state so the field can be temporarily empty while the user types
  const [editValue, setEditValue] = useState<string>(String(suggestedMinutes ?? 1));

  // Sync edit field when step changes (only while idle)
  useEffect(() => {
    if (status === 'idle' && suggestedMinutes !== null) setEditValue(String(suggestedMinutes));
  }, [suggestedMinutes, status]);

  const hasActiveTimer = status !== 'idle';

  const parsedMinutes = parseFloat(editValue);
  const canStart = !isNaN(parsedMinutes) && parsedMinutes > 0;

  // Idle: editable suggestion + Start (only when step has a suggestion)
  if (!hasActiveTimer) {
    if (suggestedMinutes === null) return null;
    return (
      <div className="step-timer-idle">
        <span aria-hidden="true">⏱️</span>
        <input
          type="number"
          className="step-timer-input"
          min={0.1}
          max={999}
          step="any"
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          aria-label="Timer minutes"
        />
        <span className="step-timer-unit">min</span>
        <button
          className="step-timer-start-btn"
          onClick={() => canStart && start(parsedMinutes * 60)}
          disabled={!canStart}
          aria-label={canStart ? `Start ${parsedMinutes}-minute timer` : 'Enter a time'}
        >
          Start
        </button>
      </div>
    );
  }

  // Done
  if (status === 'done') {
    return (
      <div className="step-timer step-timer--done">
        <span className="step-timer-display" aria-live="assertive">⏱️ Time&rsquo;s up!</span>
        <button className="step-timer-action step-timer-action--cancel" onClick={reset}>Dismiss</button>
        {suggestedMinutes !== null && canStart && (
          <button className="step-timer-action" onClick={() => start(parsedMinutes * 60)}>
            Restart {parsedMinutes}m
          </button>
        )}
      </div>
    );
  }

  // Running or paused
  return (
    <div className={`step-timer ${status === 'paused' ? 'step-timer--paused' : ''}`}>
      <span className="step-timer-display" aria-live="polite" aria-atomic="true">
        <span aria-hidden="true">⏱️</span> {formatTime(remaining)}
      </span>
      {status === 'running' ? (
        <button className="step-timer-action" onClick={pause} aria-label="Pause timer">Pause</button>
      ) : (
        <button className="step-timer-action" onClick={resume} aria-label="Resume timer">Resume</button>
      )}
      <button className="step-timer-action step-timer-action--cancel" onClick={reset} aria-label="Cancel timer">Cancel</button>
      {suggestedMinutes !== null && canStart && (
        <button
          className="step-timer-action step-timer-action--replace"
          onClick={() => start(parsedMinutes * 60)}
          aria-label={`Start new ${parsedMinutes}-minute timer`}
        >
          ↺ {parsedMinutes}m
        </button>
      )}
    </div>
  );
}

export function MakeModeModal({ recipe, onClose }: Props) {
  const [step, setStep] = useState(0);
  const total = recipe.directions.length;
  const stepIngredients = matchIngredientsToSteps(recipe.ingredients, recipe.directions);
  const currentIngredients = stepIngredients[step] ?? [];
  const suggestedMinutes = extractMinutes(recipe.directions[step] ?? '');

  const touchStartX = useRef<number | null>(null);

  const prev = () => setStep(s => Math.max(0, s - 1));
  const next = () => setStep(s => Math.min(total - 1, s + 1));

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next();
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prev();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 50) delta < 0 ? next() : prev();
    touchStartX.current = null;
  };

  const isFirst = step === 0;
  const isLast = step === total - 1;

  const ingredientLabel = (amount: string, unit: string) =>
    [amount, unit].filter(Boolean).join(' ');

  return createPortal(
    <div className="make-overlay" onClick={onClose} aria-modal="true" role="dialog">
      <div
        className="make-modal"
        onClick={e => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Header */}
        <div className="make-header">
          <div className="make-title-row">
            <h2 className="make-title">{recipe.title}</h2>
            <button className="make-close-btn" onClick={onClose} aria-label="Close">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <line x1="3" y1="3" x2="15" y2="15" />
                <line x1="15" y1="3" x2="3" y2="15" />
              </svg>
            </button>
          </div>
          <div className="make-progress-track">
            <div
              className="make-progress-fill"
              style={{ width: `${((step + 1) / total) * 100}%` }}
            />
          </div>
          <p className="make-step-counter">Step {step + 1} of {total}</p>
        </div>

        {/* Body */}
        <div className="make-body">
          <p className="make-step-text">{recipe.directions[step]}</p>

          <StepTimer suggestedMinutes={suggestedMinutes} />

          {currentIngredients.length > 0 && (
            <div className="make-ingredients-section">
              <p className="make-ingredients-heading">
                {currentIngredients.length === 1 ? 'Ingredient' : 'Ingredients'} for this step
              </p>
              <ul className="make-ingredient-list">
                {currentIngredients.map(ing => (
                  <li key={ing.id} className="make-ingredient-item">
                    <span className={`make-ingredient-qty ${!(ing.amount || ing.unit) ? 'make-ingredient-qty--empty' : ''}`}>
                      {ingredientLabel(ing.amount, ing.unit)}
                    </span>
                    <span className="make-ingredient-name">{ing.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div className="make-footer">
          <button
            className="make-nav-btn make-prev-btn"
            onClick={prev}
            disabled={isFirst}
            aria-label="Previous step"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="13 4 7 10 13 16" />
            </svg>
            Prev
          </button>

          <button
            className="make-nav-btn make-next-btn"
            onClick={isLast ? onClose : next}
            aria-label={isLast ? 'Finish' : 'Next step'}
          >
            {isLast ? (
              <>Done</>
            ) : (
              <>
                Next
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="7 4 13 10 7 16" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
