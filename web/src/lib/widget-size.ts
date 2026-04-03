/**
 * Widget size classification for a 12-column square grid.
 * - small:  2×2 to 3×3 — icon/label or condensed list
 * - medium: 4×3 to 5×5 — standard detail
 * - large:  6×4+ — full detail with expandable items
 */

export type WidgetSize = 'small' | 'medium' | 'large';

export function getWidgetSize(w: number, h: number): WidgetSize {
  const minDim = Math.min(w, h);
  if (minDim <= 3) return 'small';
  if (minDim <= 5) return 'medium';
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
