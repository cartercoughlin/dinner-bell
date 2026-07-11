import { useState } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { getFamilyInviteUrl, getUserToken, isSupabaseEnabled } from '../lib/supabase';
import { useRecipes } from '../contexts/RecipeContext';

interface Props {
  onClose: () => void;
}

export function FamilySharingSheet({ onClose }: Props) {
  const { connectEmail, userEmail } = useRecipes();
  const token = getUserToken();
  const joinUrl = getFamilyInviteUrl(token);
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [email, setEmail] = useState(userEmail);
  const [emailError, setEmailError] = useState('');
  const [isSavingEmail, setIsSavingEmail] = useState(false);

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

  const saveEmail = async () => {
    if (!email.trim() || email.trim() === userEmail) {
      setIsEditingEmail(false);
      setEmail(userEmail);
      setEmailError('');
      return;
    }

    setIsSavingEmail(true);
    setEmailError('');
    try {
      await connectEmail(email);
      setIsEditingEmail(false);
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Could not update email.');
    } finally {
      setIsSavingEmail(false);
    }
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
            <p className="sharing-description">
              Sharing is not turned on for this build yet. Your recipes are saved on this device.
            </p>
            <p className="sharing-note">
              Once sharing is enabled, this is where you will get a private invite link for your household.
            </p>
          </div>
        ) : (
          <div className="sharing-body">
            <section className="sharing-account">
              <div>
                <h3>Account</h3>
                {!isEditingEmail && <p>{userEmail}</p>}
              </div>
              {isEditingEmail ? (
                <div className="sharing-email-editor">
                  <input
                    type="email"
                    inputMode="email"
                    value={email}
                    onChange={event => {
                      setEmail(event.target.value);
                      setEmailError('');
                    }}
                    autoCapitalize="off"
                    aria-label="Email"
                  />
                  <div className="sharing-email-actions">
                    <button
                      className="secondary-btn"
                      type="button"
                      onClick={() => {
                        setEmail(userEmail);
                        setEmailError('');
                        setIsEditingEmail(false);
                      }}
                      disabled={isSavingEmail}
                    >
                      Cancel
                    </button>
                    <button
                      className="primary-btn"
                      type="button"
                      onClick={saveEmail}
                      disabled={!email.trim() || isSavingEmail}
                    >
                      {isSavingEmail ? 'Saving' : 'Save'}
                    </button>
                  </div>
                  {emailError && <p className="form-error">{emailError}</p>}
                </div>
              ) : (
                <button
                  className="sharing-edit-email-btn"
                  type="button"
                  onClick={() => setIsEditingEmail(true)}
                >
                  Edit
                </button>
              )}
            </section>

            <p className="sharing-description">
              Scan the QR code or share the app link below. Anyone who joins will see your recipes, calendar, and grocery list.
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
