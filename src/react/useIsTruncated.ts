import { type RefObject, useEffect, useState } from 'react';

export function isElementTruncated(element: HTMLElement): boolean {
  return element.scrollWidth > element.clientWidth + 1;
}

export function useIsTruncated<T extends HTMLElement>(elementRef: RefObject<T | null>, value: string): boolean {
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !value) {
      setIsTruncated(false);
      return undefined;
    }

    const updateTruncation = () => {
      const nextIsTruncated = isElementTruncated(element);
      setIsTruncated((current) => (current === nextIsTruncated ? current : nextIsTruncated));
    };

    updateTruncation();

    if (typeof ResizeObserver === 'undefined') {
      if (typeof window === 'undefined') return undefined;
      window.addEventListener('resize', updateTruncation);
      return () => window.removeEventListener('resize', updateTruncation);
    }

    const observer = new ResizeObserver(updateTruncation);
    observer.observe(element);
    return () => observer.disconnect();
  }, [elementRef, value]);

  return isTruncated;
}
