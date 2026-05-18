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
    // If it was running when persisted, check if it already finished
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

function beep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1.0);
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
  const beepTimeoutRef = useRef<number | null>(null);

  const remaining = calcRemaining(data);

  const clearAll = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (beepTimeoutRef.current) { clearTimeout(beepTimeoutRef.current); beepTimeoutRef.current = null; }
  };

  // Tick interval forces re-renders while running
  useEffect(() => {
    if (data.status === 'running') {
      intervalRef.current = window.setInterval(() => setTick(t => t + 1), 500);
    } else {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [data.status, data.startedAt]);

  // Watch for natural completion during running ticks
  useEffect(() => {
    if (data.status !== 'running') return;
    const rem = calcRemaining(data);
    if (rem === 0) {
      clearAll();
      const next: TimerData = { ...data, accumulatedSeconds: data.totalSeconds, startedAt: null, status: 'done' };
      setData(next);
      save(next);
      beep();
    }
  }, [tick, data]);

  // Schedule a one-shot timeout to trigger beep at the exact finish time
  const scheduleBeep = useCallback((remainingMs: number) => {
    if (beepTimeoutRef.current) clearTimeout(beepTimeoutRef.current);
    beepTimeoutRef.current = window.setTimeout(() => {
      setData(prev => {
        if (prev.status !== 'running') return prev;
        const next: TimerData = { ...prev, accumulatedSeconds: prev.totalSeconds, startedAt: null, status: 'done' };
        save(next);
        beep();
        return next;
      });
    }, remainingMs);
  }, []);

  const start = useCallback((seconds: number) => {
    clearAll();
    const next: TimerData = { totalSeconds: seconds, startedAt: Date.now(), accumulatedSeconds: 0, status: 'running' };
    setData(next);
    save(next);
    scheduleBeep(seconds * 1000);
  }, [scheduleBeep]);

  const pause = useCallback(() => {
    setData(prev => {
      if (prev.status !== 'running') return prev;
      clearAll();
      const elapsed = prev.startedAt ? Math.floor((Date.now() - prev.startedAt) / 1000) : 0;
      const next: TimerData = { ...prev, accumulatedSeconds: prev.accumulatedSeconds + elapsed, startedAt: null, status: 'paused' };
      save(next);
      return next;
    });
  }, []);

  const resume = useCallback(() => {
    setData(prev => {
      if (prev.status !== 'paused') return prev;
      const next: TimerData = { ...prev, startedAt: Date.now(), status: 'running' };
      save(next);
      const rem = calcRemaining(next);
      scheduleBeep(rem * 1000);
      return next;
    });
  }, [scheduleBeep]);

  const reset = useCallback(() => {
    clearAll();
    const next = DEFAULT;
    setData(next);
    save(next);
  }, []);

  // Re-schedule beep on mount if timer was running when page loaded
  useEffect(() => {
    if (data.status === 'running' && data.startedAt) {
      const rem = calcRemaining(data);
      if (rem > 0) scheduleBeep(rem * 1000);
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
