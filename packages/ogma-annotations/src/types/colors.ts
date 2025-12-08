/**
 * Hex color string in format #RGB or #RRGGBB
 * @example "#fff" | "#ffffff" | "#F0A" | "#FF00AA"
 */
export type HexColor = `#${string}`;

/**
 * RGB color string in format rgb(r, g, b)
 * @example "rgb(255, 0, 0)" | "rgb(128, 128, 128)"
 */
export type RgbColor =
  | `rgb(${number}, ${number}, ${number})`
  | `rgb(${number},${number},${number})`;

/**
 * RGBA color string in format rgba(r, g, b, a)
 * @example "rgba(255, 0, 0, 1)" | "rgba(128, 128, 128, 0.5)"
 */
export type RgbaColor =
  | `rgba(${number}, ${number}, ${number}, ${number})`
  | `rgba(${number},${number},${number},${number})`;

/**
 * Any valid color format
 */
export type Color = HexColor | RgbColor | RgbaColor | "transparent" | "none";

/**
 * Type guard to check if a string is a valid hex color
 */
export function isHexColor(color: string): color is HexColor {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color.trim());
}

/**
 * Type guard to check if a string is a valid RGB color
 */
export function isRgbColor(color: string): color is RgbColor {
  return /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/.test(color.trim());
}

/**
 * Type guard to check if a string is a valid RGBA color
 */
export function isRgbaColor(color: string): color is RgbaColor {
  return /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[0-9.]+\s*\)$/.test(
    color.trim()
  );
}

/**
 * Type guard to check if a string is a valid color
 */
export function isColor(color: string): color is Color {
  return isHexColor(color) || isRgbColor(color) || isRgbaColor(color);
}

/**
 * Safely cast a string to a Color type with runtime validation
 * @throws {Error} if the color format is invalid
 */
export function asColor(color: string): Color {
  if (isColor(color)) return color;
  throw new Error(`Invalid color format: ${color}`);
}

/**
 * Safely cast a string to a HexColor type with runtime validation
 * @throws {Error} if the color format is invalid
 */
export function asHexColor(color: string): HexColor {
  if (isHexColor(color)) return color;
  throw new Error(`Invalid hex color format: ${color}`);
}

/**
 * Safely cast a string to an RgbColor type with runtime validation
 * @throws {Error} if the color format is invalid
 */
export function asRgbColor(color: string): RgbColor {
  if (isRgbColor(color)) return color;
  throw new Error(`Invalid RGB color format: ${color}`);
}

/**
 * Safely cast a string to an RgbaColor type with runtime validation
 * @throws {Error} if the color format is invalid
 */
export function asRgbaColor(color: string): RgbaColor {
  if (isRgbaColor(color)) return color;
  throw new Error(`Invalid RGBA color format: ${color}`);
}
