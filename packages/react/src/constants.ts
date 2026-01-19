import { ArrowStyles, TextStyle } from "@linkurious/ogma-annotations";

/** @private */
export const fontSizes = [8, 10, 12, 14, 16, 24, 32, 48, 64, 72];
/** @private */
export const TRANSPARENT = "none";
/** @private */
export const BLACK = "#333333";

/**
 * List of default colors for annotations.
 * @type {string[]}
 */
export const defaultColors = [
  "#FFFFFF",
  "#F44E3B",
  "#FE9200",
  "#FCDC00",
  "#A4DD00",
  "#68CCCA",
  "#73D8FF",
  "#AEA1FF",
  "#1E88E5",
  "#333333",
  "#808080",
  "#cccccc"
];

/**
 * List of available fonts for annotations.
 * @private
 */
export const fonts = [
  "Roboto",
  "Helvetica Neue",
  "Helvetica",
  "Arial",
  "sans-serif",
  "Georgia, serif",
  "Menlo",
  "Monaco",
  "Consolas",
  "Courier New",
  "monospace"
].sort((a, b) => a.toLocaleLowerCase().localeCompare(b.toLocaleLowerCase()));

/**
 * Default arrow style for annotations.
 * @type {ArrowStyles}
 */
export const defaultArrowStyle: ArrowStyles = {
  head: "arrow",
  strokeColor: BLACK,
  strokeWidth: 5
};

/**
 * Default relative padding for text annotations.
 */
export const RELATIVE_PADDING = 0.25;

/**
 * Default text style for annotations.
 * @type {TextStyle}
 */
export const defaultTextStyle: TextStyle = {
  font: "Roboto",
  fontSize: fontSizes[2],
  padding: fontSizes[2] * RELATIVE_PADDING,
  color: BLACK,
  strokeType: TRANSPARENT,
  background: TRANSPARENT
};
