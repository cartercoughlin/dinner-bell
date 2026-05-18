import { useTimer } from '../contexts/TimerContext';
import { formatTime } from '../utils/extractTime';

export function FloatingTimer() {
  const { status, remaining, pause, resume, reset } = useTimer();

  if (status === 'idle' || status === 'done') return null;

  return (
    <div className={`floating-timer ${status === 'paused' ? 'floating-timer--paused' : ''}`} role="status" aria-live="polite">
      <span className="floating-timer-display">
        <span aria-hidden="true">⏱️</span> {formatTime(remaining)}
      </span>
      {status === 'running' ? (
        <button className="floating-timer-btn" onClick={pause} aria-label="Pause timer">Pause</button>
      ) : (
        <button className="floating-timer-btn" onClick={resume} aria-label="Resume timer">Resume</button>
      )}
      <button className="floating-timer-btn floating-timer-btn--cancel" onClick={reset} aria-label="Cancel timer">✕</button>
    </div>
  );
}
