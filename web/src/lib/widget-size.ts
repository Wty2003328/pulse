/**
 * Widget size classification based on grid dimensions.
 * Uses the smaller dimension to avoid showing too little content
 * in tall-but-narrow or wide-but-short widgets.
 */

export type WidgetSize = 'compact' | 'small' | 'medium' | 'large';

export function getWidgetSize(w: number, h: number): WidgetSize {
  const minDim = Math.min(w, h);
  if (minDim <= 1) return 'compact';   // 1×anything
  if (minDim <= 2 && w * h <= 6) return 'small'; // 2×2, 2×3
  if (minDim <= 3) return 'medium';    // 3×3, 3×4, etc.
  return 'large';                      // 4×4+
}

/** Estimate how many list items fit in the widget based on height in grid cells.
 *  Assumes ~40px per compact row, ~60px per normal row, and rowHeight is roughly
 *  the pixel height of one grid cell (passed from Dashboard). */
export function itemsForHeight(h: number, rowHeightPx: number, perItemPx: number = 56): number {
  const headerPx = 32;  // widget header
  const paddingPx = 24; // top + bottom padding
  const available = h * rowHeightPx - headerPx - paddingPx;
  return Math.max(1, Math.floor(available / perItemPx));
}

export interface WidgetDimensions {
  w: number;
  h: number;
  size: WidgetSize;
  /** Approximate pixel height of one grid row */
  rowHeightPx: number;
}
