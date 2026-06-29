/**
 * Shared, framework-agnostic color helpers for the annotation style panel UI.
 */
import { DEFAULT_RECENT_COLORS } from "./config";

/** Channel-wise rgba, matching the shape emitted by `vanilla-colorful`. */
export interface RgbaChannels {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** Serializes an rgba object (as emitted by the color picker) to a CSS string. */
export function rgbaToString(color: RgbaChannels): string {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
}

export interface RecentColorsState {
  colors: string[];
  /** Index of the currently active swatch. */
  activeIndex: number;
}

export const MAX_RECENT_COLORS = 3;

export function initialRecentColors(): RecentColorsState {
  return { colors: [...DEFAULT_RECENT_COLORS], activeIndex: 0 };
}

/**
 * Given the current recent-colors state and a color coming from the selected
 * annotation, returns the next state: if the color is already known it becomes
 * active, otherwise it is unshifted to the front (capped at MAX_RECENT_COLORS).
 *
 * Pure — callers (React/vanilla) hold the state and apply the result.
 */
export function withColorFromAnnotation(
  state: RecentColorsState,
  color: string
): RecentColorsState {
  const existing = state.colors.indexOf(color);
  if (existing === -1) {
    const colors = [color, ...state.colors].slice(0, MAX_RECENT_COLORS);
    return { colors, activeIndex: 0 };
  }
  return { colors: state.colors, activeIndex: existing };
}
