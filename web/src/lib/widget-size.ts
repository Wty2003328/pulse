/**
 * Widget size classification. Minimum widget is 2×2.
 * - small:  2×2, 2×3 — condensed layout, titles only
 * - medium: 3×2, 3×3, 2×4 — standard layout with some detail
 * - large:  3×4+, 4×3+ — full detail with summaries, expandable items
 */

export type WidgetSize = 'small' | 'medium' | 'large';

export function getWidgetSize(w: number, h: number): WidgetSize {
  const minDim = Math.min(w, h);
  const area = w * h;
  if (minDim <= 2 && area <= 6) return 'small';
  if (area <= 12) return 'medium';
  return 'large';
}

/** Estimate how many list items fit based on pixel height.
 *  Subtracts header space (~28px drag handle) and padding. */
export function itemsForHeight(h: number, rowHeightPx: number, perItemPx: number = 52): number {
  const overhead = 28; // drag handle + padding
  const available = h * rowHeightPx - overhead;
  return Math.max(1, Math.floor(available / perItemPx));
}

export interface WidgetDimensions {
  w: number;
  h: number;
  size: WidgetSize;
  rowHeightPx: number;
}
