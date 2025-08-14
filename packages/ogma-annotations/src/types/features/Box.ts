import { Geometry, Polygon } from "geojson";
import { AnnotationFeature, AnnotationProps } from "./Annotation";
import { StrokeOptions } from "./styles";

export interface BoxStyle extends StrokeOptions {
  /** background color: empty for transparent #f00, yellow...*/
  background?: string;
  /** padding around the box */
  padding?: number;
  /** border radius */
  borderRadius?: number;
}

export interface BoxProperties extends AnnotationProps {
  type: "box";
  style?: BoxStyle;
}

export type Box = AnnotationFeature<Polygon, BoxProperties>;

export const isBox = (
  a: AnnotationFeature<Geometry, AnnotationProps>
): a is Box => a.properties.type === "box";
