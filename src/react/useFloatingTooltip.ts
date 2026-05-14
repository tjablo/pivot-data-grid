import { useCallback, useState } from 'react';

const VIEWPORT_MARGIN = 12;
const TOOLTIP_OFFSET = 8;
const TOOLTIP_MAX_WIDTH = 420;

interface FloatingTooltipState {
  text: string;
  left: number;
  top: number;
  maxWidth: number;
  placement: 'top' | 'bottom';
  align: 'left' | 'right';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function resolveTooltipState(text: string, anchor: HTMLElement, layer: HTMLElement): FloatingTooltipState {
  const rect = anchor.getBoundingClientRect();
  const layerRect = layer.getBoundingClientRect();
  const layerWidth = layerRect.width || (typeof window === 'undefined' ? TOOLTIP_MAX_WIDTH + VIEWPORT_MARGIN * 2 : window.innerWidth);
  const baseMaxWidth = Math.max(120, Math.min(TOOLTIP_MAX_WIDTH, layerWidth - VIEWPORT_MARGIN * 2));
  const placement = rect.top > 72 ? 'top' : 'bottom';
  const relativeLeft = rect.left - layerRect.left;
  const relativeRight = rect.right - layerRect.left;
  const align = relativeLeft + baseMaxWidth > layerWidth - VIEWPORT_MARGIN && relativeRight > baseMaxWidth ? 'right' : 'left';
  const left =
    align === 'right'
      ? clamp(relativeRight, VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, layerWidth - VIEWPORT_MARGIN))
      : clamp(relativeLeft, VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, layerWidth - VIEWPORT_MARGIN));
  const availableWidth = align === 'right' ? left - VIEWPORT_MARGIN : layerWidth - left - VIEWPORT_MARGIN;
  const maxWidth = Math.max(120, Math.min(baseMaxWidth, availableWidth));
  const top = placement === 'top' ? rect.top - layerRect.top - TOOLTIP_OFFSET : rect.bottom - layerRect.top + TOOLTIP_OFFSET;

  return { text, left, top, maxWidth, placement, align };
}

export function useFloatingTooltip() {
  const [tooltip, setTooltip] = useState<FloatingTooltipState | null>(null);

  const showTooltip = useCallback((text: string, anchor: HTMLElement, layer: HTMLElement | null) => {
    if (!text) return;
    if (!layer) return;
    setTooltip(resolveTooltipState(text, anchor, layer));
  }, []);

  const hideTooltip = useCallback(() => {
    setTooltip(null);
  }, []);

  return { tooltip, showTooltip, hideTooltip };
}
