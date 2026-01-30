import { Color } from "../colors";

/** Stroke style options for annotations */
export type StrokeOptions = {
  /** Type of stroke: plain, dashed, or none */
  strokeType?: StrokeType;
  /** Stroke color: #f00, yellow... */
  strokeColor?: Color;
  /** Stroke width */
  strokeWidth?: number;
};

/** Stroke types available for annotations */
export type StrokeType = "plain" | "dashed" | "none";

/** Stroke style for arrow annotations */
export type Stroke = {
  /** Stroke type */
  type: StrokeType;
  /** Stroke color */
  color: Color;
  /** Stroke width */
  width: number;
};

export type StrokeStyle = Stroke;
