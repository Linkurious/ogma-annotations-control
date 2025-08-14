export type StrokeOptions = {
  strokeType?: "plain" | "dashed" | "none";
  strokeColor?: string;
  strokeWidth?: number;
};

export type Stroke = {
  type: "plain" | "dashed" | "none";
  color: string;
  width: number;
};

export type StrokeStyle = Stroke;
