import { useCallback, useEffect, useRef, useState } from 'react';

export function useTimedCellFeedback(durationMs: number): {
  activeKey: string | null;
  showFeedback: (key: string) => void;
} {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const clearFeedbackTimeout = useCallback(() => {
    if (timeoutRef.current == null || typeof window === 'undefined') return;
    window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }, []);

  useEffect(() => clearFeedbackTimeout, [clearFeedbackTimeout]);

  const showFeedback = useCallback(
    (key: string) => {
      setActiveKey(key);
      clearFeedbackTimeout();
      if (typeof window === 'undefined') return;

      timeoutRef.current = window.setTimeout(() => {
        setActiveKey((current) => (current === key ? null : current));
        timeoutRef.current = null;
      }, durationMs);
    },
    [clearFeedbackTimeout, durationMs],
  );

  return { activeKey, showFeedback };
}
