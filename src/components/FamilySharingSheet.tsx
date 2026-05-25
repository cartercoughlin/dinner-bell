import { useState } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { getFamilyInviteBaseUrl, getUserToken, isSupabaseEnabled } from '../lib/supabase';

interface Props {
  onClose: () => void;
}

export function FamilySharingSheet({ onClose }: Props) {
  const token = getUserToken();
  const inviteBaseUrl = getFamilyInviteBaseUrl();
  const joinUrl = inviteBaseUrl ? `${inviteBaseUrl}/join/${encodeURIComponent(token)}` : '';
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');

  const copy = async () => {
    if (!joinUrl) return;
    try {
      await navigator.clipboard.writeText(joinUrl);
    } catch {
      const el = document.createElement('textarea');
      el.value = joinUrl;
      el.style.position = 'fixed'; el.style.opacity = '0';
      document.body.appendChild(el); el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopyState('copied');
    setTimeout(() => setCopyState('idle'), 2000);
  };

  return createPortal(
    <div className="sharing-overlay" onClick={onClose} aria-modal="true" role="dialog">
      <div className="sharing-sheet" onClick={e => e.stopPropagation()}>
        <div className="sharing-handle" />

        <div className="sharing-header">
          <h2>Family Sharing</h2>
          <button className="make-close-btn" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="3" y1="3" x2="15" y2="15" />
              <line x1="15" y1="3" x2="3" y2="15" />
            </svg>
          </button>
        </div>

        {!isSupabaseEnabled ? (
          <div className="sharing-body">
            <p className="sharing-note">Cloud sync is not configured. Family sharing requires cloud sync to be enabled.</p>
          </div>
        ) : !joinUrl ? (
          <div className="sharing-body">
            <p className="sharing-note">Set VITE_PUBLIC_APP_URL to your deployed Dinner Bell URL before building the iOS app so invite links can open outside Capacitor.</p>
          </div>
        ) : (
          <div className="sharing-body">
            <p className="sharing-description">
              Scan the QR code or share the link below. Anyone who joins will see your recipes, calendar, and grocery list — and their unique recipes will be added to the shared collection.
            </p>

            <div className="sharing-qr">
              <QRCodeSVG
                value={joinUrl}
                size={200}
                level="M"
                style={{ display: 'block', borderRadius: 12 }}
              />
            </div>

            <div className="sharing-link-row">
              <span className="sharing-link-text" title={joinUrl}>{joinUrl}</span>
              <button
                className={`sharing-copy-btn ${copyState === 'copied' ? 'sharing-copy-btn--copied' : ''}`}
                onClick={copy}
                aria-label="Copy link"
              >
                {copyState === 'copied' ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
