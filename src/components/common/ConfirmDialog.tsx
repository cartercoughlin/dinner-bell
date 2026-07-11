import { useEffect } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({ open, title, message, onConfirm, onCancel }: ConfirmDialogProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onCancel();
      }
    };

    const handleEnter = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && open) {
        onConfirm();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('keydown', handleEnter);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleEnter);
    };
  }, [open, onCancel, onConfirm]);

  if (!open) return null;

  return (
    <>
      <div
        className="confirm-dialog-overlay"
        onClick={onCancel}
      >
        <div
          className="confirm-dialog"
          onClick={(e) => e.stopPropagation()}
        >
          <h2>{title}</h2>
          <p>{message}</p>
          <div className="confirm-dialog-actions">
            <button className="secondary-btn" onClick={onCancel}>
              Cancel
            </button>
            <button className="danger-btn" onClick={onConfirm}>
              Delete
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default ConfirmDialog;
