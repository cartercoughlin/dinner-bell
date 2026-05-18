import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';

const STORAGE_KEY = 'dinner-bell-timer';

type TimerStatus = 'idle' | 'running' | 'paused' | 'done';

interface TimerData {
  totalSeconds: number;
  startedAt: number | null;       // Date.now() epoch ms
  accumulatedSeconds: number;     // seconds elapsed before current run segment
  status: TimerStatus;
}

const DEFAULT: TimerData = { totalSeconds: 0, startedAt: null, accumulatedSeconds: 0, status: 'idle' };

function load(): TimerData {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (!s) return DEFAULT;
    const d: TimerData = JSON.parse(s);
    if (d.status === 'running' && d.startedAt) {
      const elapsed = d.accumulatedSeconds + Math.floor((Date.now() - d.startedAt) / 1000);
      if (elapsed >= d.totalSeconds) return { ...d, accumulatedSeconds: d.totalSeconds, startedAt: null, status: 'done' };
    }
    return d;
  } catch {
    return DEFAULT;
  }
}

function save(d: TimerData) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch {}
}

function calcRemaining(d: TimerData): number {
  if (d.status === 'idle') return d.totalSeconds;
  if (d.status === 'done') return 0;
  const runningExtra = d.status === 'running' && d.startedAt
    ? Math.floor((Date.now() - d.startedAt) / 1000)
    : 0;
  return Math.max(0, d.totalSeconds - d.accumulatedSeconds - runningExtra);
}

// Plays three short ascending beeps — one "ring" of the alarm
function playAlarmRing() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const freqs = [880, 1046, 1318]; // A5 → C6 → E6 (major chord)
    freqs.forEach((freq, i) => {
      const t = ctx.currentTime + i * 0.18;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.55, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  } catch {}
}

interface TimerContextValue {
  status: TimerStatus;
  totalSeconds: number;
  remaining: number;
  start: (seconds: number) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
}

const TimerContext = createContext<TimerContextValue | null>(null);

export function TimerProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<TimerData>(load);
  const [tick, setTick] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const finishTimeoutRef = useRef<number | null>(null);
  const alarmIntervalRef = useRef<number | null>(null);

  const remaining = calcRemaining(data);

  const stopAlarm = () => {
    if (alarmIntervalRef.current) { clearInterval(alarmIntervalRef.current); alarmIntervalRef.current = null; }
  };

  const startAlarm = () => {
    stopAlarm();
    playAlarmRing();
    alarmIntervalRef.current = window.setInterval(playAlarmRing, 2200);
  };

  const clearCountdown = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (finishTimeoutRef.current) { clearTimeout(finishTimeoutRef.current); finishTimeoutRef.current = null; }
  };

  const clearAll = () => { clearCountdown(); stopAlarm(); };

  // Tick interval forces re-renders while running
  useEffect(() => {
    if (data.status === 'running') {
      intervalRef.current = window.setInterval(() => setTick(t => t + 1), 500);
    } else {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [data.status, data.startedAt]);

  // Watch for natural completion on each tick
  useEffect(() => {
    if (data.status !== 'running') return;
    if (calcRemaining(data) === 0) {
      clearCountdown();
      const next: TimerData = { ...data, accumulatedSeconds: data.totalSeconds, startedAt: null, status: 'done' };
      setData(next);
      save(next);
      startAlarm();
    }
  }, [tick, data]); // eslint-disable-line react-hooks/exhaustive-deps

  // Schedule a precise timeout to fire alarm at finish time
  const scheduleFinish = useCallback((remainingMs: number) => {
    if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current);
    finishTimeoutRef.current = window.setTimeout(() => {
      setData(prev => {
        if (prev.status !== 'running') return prev;
        const next: TimerData = { ...prev, accumulatedSeconds: prev.totalSeconds, startedAt: null, status: 'done' };
        save(next);
        return next;
      });
      startAlarm();
    }, remainingMs);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const start = useCallback((seconds: number) => {
    clearAll();
    const next: TimerData = { totalSeconds: seconds, startedAt: Date.now(), accumulatedSeconds: 0, status: 'running' };
    setData(next);
    save(next);
    scheduleFinish(seconds * 1000);
  }, [scheduleFinish]); // eslint-disable-line react-hooks/exhaustive-deps

  const pause = useCallback(() => {
    setData(prev => {
      if (prev.status !== 'running') return prev;
      clearCountdown();
      const elapsed = prev.startedAt ? Math.floor((Date.now() - prev.startedAt) / 1000) : 0;
      const next: TimerData = { ...prev, accumulatedSeconds: prev.accumulatedSeconds + elapsed, startedAt: null, status: 'paused' };
      save(next);
      return next;
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const resume = useCallback(() => {
    setData(prev => {
      if (prev.status !== 'paused') return prev;
      const next: TimerData = { ...prev, startedAt: Date.now(), status: 'running' };
      save(next);
      scheduleFinish(calcRemaining(next) * 1000);
      return next;
    });
  }, [scheduleFinish]);

  const reset = useCallback(() => {
    clearAll();
    setData(DEFAULT);
    save(DEFAULT);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // On mount: if already done (expired while away), start alarm; if running, reschedule finish
  useEffect(() => {
    if (data.status === 'done') {
      startAlarm();
    } else if (data.status === 'running' && data.startedAt) {
      const rem = calcRemaining(data);
      if (rem > 0) scheduleFinish(rem * 1000);
      else {
        const next: TimerData = { ...data, accumulatedSeconds: data.totalSeconds, startedAt: null, status: 'done' };
        setData(next);
        save(next);
        startAlarm();
      }
    }
    return clearAll;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <TimerContext.Provider value={{ status: data.status, totalSeconds: data.totalSeconds, remaining, start, pause, resume, reset }}>
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer(): TimerContextValue {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimer must be used inside TimerProvider');
  return ctx;
}
