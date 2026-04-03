/**
 * Widget size classification based on grid dimensions.
 * Determines how much content a widget should display,
 * similar to iOS/Android home screen widget sizes.
 */

export type WidgetSize = 'compact' | 'small' | 'medium' | 'large';

export function getWidgetSize(w: number, h: number): WidgetSize {
  const area = w * h;
  if (area <= 2) return 'compact';   // 1×1, 1×2, 2×1
  if (area <= 4) return 'small';     // 2×2, 1×3, 3×1, 1×4
  if (area <= 9) return 'medium';    // 2×3, 3×2, 3×3
  return 'large';                    // 4×3, 3×4, 4×4+
}

export interface WidgetDimensions {
  w: number;
  h: number;
  size: WidgetSize;
}
