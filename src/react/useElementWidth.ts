import { type RefObject, useEffect, useState } from 'react';

export function useElementWidth<T extends HTMLElement>(elementRef: RefObject<T | null>): number {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return undefined;

    const updateWidth = () => {
      setWidth(element.clientWidth);
    };

    if (typeof ResizeObserver === 'undefined') {
      updateWidth();
      if (typeof window === 'undefined') return undefined;
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }

    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });
    observer.observe(element);
    updateWidth();

    return () => observer.disconnect();
  }, [elementRef]);

  return width;
}
