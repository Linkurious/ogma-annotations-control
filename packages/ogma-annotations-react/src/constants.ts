import { ArrowStyles, TextStyle } from "@linkurious/ogma-annotations";

export const fontSizes = [8, 10, 12, 14, 16, 24, 32, 48, 64, 72];
export const TRANSPARENT = "none";
export const BLACK = "#333333";

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
  "#cccccc",
];
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
  "monospace",
].sort((a, b) => a.toLocaleLowerCase().localeCompare(b.toLocaleLowerCase()));

export const defaultArrowStyle: ArrowStyles = {
  head: "arrow",
  strokeColor: BLACK,
  strokeWidth: 5,
};
export const RELATIVE_PADDING = 0.25;

export const defaultTextStyle: TextStyle = {
  font: "Roboto",
  fontSize: fontSizes[2],
  padding: fontSizes[2] * RELATIVE_PADDING,
  color: BLACK,
  strokeType: TRANSPARENT,
  background: TRANSPARENT,
};
