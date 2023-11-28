import { MenuProps } from "antd";
import { RgbaColor } from "@uiw/color-convert";
import { ArrowStyles, TextStyle } from "@linkurious/annotations-control";

export const iconSize = 16;
export const arrowIconSize = 12;

export type fontFamilyTypes =
  | 'Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif'
  | "Georgia, serif"
  | 'Menlo, Monaco, Consolas, "Courier New", monospace';

export type fontNameAliases = "Serif" | "Sans-serif" | "Serif" | "Monospace";

export const fontFamilies: Record<fontNameAliases, fontFamilyTypes> = {
  "Sans-serif": 'Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif',
  Serif: "Georgia, serif",
  Monospace: 'Menlo, Monaco, Consolas, "Courier New", monospace',
};

export const fontItems: NonNullable<MenuProps["items"]> = [
  { key: "Sans-serif", label: "Normal" },
  { key: "Serif", label: "Serif" },
  { key: "Monospace", label: "Monospace" },
];

export const fontSizes = [8, 10, 12, 14, 16, 24, 32, 48, 64, 72];

export const fontSizeItems: NonNullable<MenuProps["items"]> = fontSizes.map(
  (fs) => ({
    key: fs.toString(),
    label: fs.toString(),
  })
);

export const lineWidthItems = [
  { value: 1, title: "thin" },
  { value: 3, title: "medium" },
  { value: 8, title: "thick" },
  { value: 20, title: "xl" },
];


export const TRANSPARENT = "none";
export const BLACK = "#333333";

export const rgbaToString = ({ r, g, b, a }: RgbaColor) =>
  `rgba(${r},${g},${b},${a})`;

// export const backgroundColors = [TRANSPARENT, ...colors];

export enum ArrowDirection {
  BOTH = "both",
  NONE = "none",
  HEAD = "head",
}

export const defaultArrowStyle: ArrowStyles = {
  head: "arrow",
  strokeColor: 'black',
  strokeWidth: lineWidthItems[1].value,
};

export const RELATIVE_PADDING = 0.25;

export const defaultTextStyle: TextStyle = {
  font: fontFamilies["Sans-serif"],
  fontSize: fontSizes[2].toString(),
  padding: fontSizes[2] * RELATIVE_PADDING,
  color: BLACK,
  strokeType: TRANSPARENT,
  background: TRANSPARENT,
};