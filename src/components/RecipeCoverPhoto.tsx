import { useEffect, useRef, useState, ChangeEvent } from 'react';
import { fileToCoverImageDataUrl } from '../lib/imageUtils';

interface RecipeCoverPhotoProps {
  imageUrl: string;
  onImageChange: (url: string) => void;
  imageAlt?: string;
  disabled?: boolean;
  compact?: boolean;
  onImageOpen?: () => void;
  emptyLabel?: string;
  emptyHint?: string;
}

function RecipeCoverPhoto({
  imageUrl,
  onImageChange,
  imageAlt = '',
  disabled = false,
  compact = false,
  onImageOpen,
  emptyLabel = 'Add recipe photo',
  emptyHint = 'Use a screenshot or finished dish photo',
}: RecipeCoverPhotoProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const busy = disabled;

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const dataUrl = await fileToCoverImageDataUrl(file);
      onImageChange(dataUrl);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not update photo');
    }
  };

  return (
    <div className={`recipe-cover-section ${compact ? 'recipe-cover-section--compact' : ''}`}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="visually-hidden"
        onChange={handleFile}
        disabled={busy}
        aria-label={emptyLabel}
      />

      {imageUrl ? (
        <div className="recipe-cover-preview">
          {onImageOpen ? (
            <button
              type="button"
              className="recipe-cover-preview-image"
              onClick={onImageOpen}
              aria-label="Open cover photo full screen"
            >
              <img src={imageUrl} alt={imageAlt} />
            </button>
          ) : (
            <img src={imageUrl} alt={imageAlt} />
          )}
          <div className="recipe-cover-menu" ref={menuRef}>
            <button
              type="button"
              className="recipe-cover-menu-trigger"
              onClick={() => setMenuOpen((open) => !open)}
              disabled={busy}
              aria-label="Photo options"
              aria-expanded={menuOpen}
            >
              <span aria-hidden="true">•••</span>
            </button>
            {menuOpen && (
              <div className="recipe-cover-menu-popover" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    inputRef.current?.click();
                  }}
                  disabled={busy}
                >
                  Change photo
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="recipe-cover-menu-danger"
                  onClick={() => {
                    setMenuOpen(false);
                    onImageChange('');
                  }}
                  disabled={busy}
                >
                  Remove photo
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="recipe-cover-empty"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          <span className="recipe-cover-empty-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <circle cx="8.5" cy="10" r="1.5" />
              <path d="M21 16l-5.5-5.5a1.5 1.5 0 0 0-2.12 0L3 18" />
            </svg>
          </span>
          <span className="recipe-cover-empty-label">{emptyLabel}</span>
          <span className="form-hint">{emptyHint}</span>
        </button>
      )}
    </div>
  );
}

export default RecipeCoverPhoto;
