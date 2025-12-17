import { Color } from "../colors";

/** Stroke style options for annotations */
export type StrokeOptions = {
  /** Type of stroke: plain, dashed, or none */
  strokeType?: "plain" | "dashed" | "none";
  /** Stroke color: #f00, yellow... */
  strokeColor?: Color;
  /** Stroke width */
  strokeWidth?: number;
};

export type Stroke = {
  /** Stroke type */
  type: "plain" | "dashed" | "none";
  /** Stroke color */
  color: Color;
  /** Stroke width */
  width: number;
};

export type StrokeStyle = Stroke;
