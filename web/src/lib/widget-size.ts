/**
 * Widget size classification for a 12-column square grid.
 * - small:  1×1 — minimal icon/number
 * - medium: anything up to 2×2 — compact detail
 * - large:  anything bigger than 2×2 — full detail
 */

export type WidgetSize = 'small' | 'medium' | 'large';

export function getWidgetSize(w: number, h: number): WidgetSize {
  if (w <= 1 && h <= 1) return 'small';
  if (w <= 2 && h <= 2) return 'medium';
  return 'large';
}

/** Estimate how many list items fit based on pixel height. */
export function itemsForHeight(h: number, rowHeightPx: number, perItemPx: number = 48): number {
  const overhead = 24;
  const available = h * rowHeightPx - overhead;
  return Math.max(1, Math.floor(available / perItemPx));
}

export interface WidgetDimensions {
  w: number;
  h: number;
  size: WidgetSize;
  rowHeightPx: number;
}
