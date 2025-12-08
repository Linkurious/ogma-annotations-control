import { Color } from "../colors";

export type StrokeOptions = {
  strokeType?: "plain" | "dashed" | "none";
  strokeColor?: Color;
  strokeWidth?: number;
};

export type Stroke = {
  type: "plain" | "dashed" | "none";
  color: Color;
  width: number;
};

export type StrokeStyle = Stroke;
