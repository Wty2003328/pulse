/**
 * Widget size classification for a 12-column square grid.
 * - small:  2×2 only — compact summary
 * - medium: anything from 2×3 up to 5×5 — standard detail
 * - large:  5+ in both dimensions — full detail with graphs
 */

export type WidgetSize = 'small' | 'medium' | 'large';

export function getWidgetSize(w: number, h: number): WidgetSize {
  const minDim = Math.min(w, h);
  const maxDim = Math.max(w, h);
  if (minDim <= 2 && maxDim <= 2) return 'small';
  if (minDim >= 5) return 'large';
  return 'medium';
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
