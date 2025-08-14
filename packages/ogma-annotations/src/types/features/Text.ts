import { Geometry, Polygon } from "geojson";
import { AnnotationFeature, AnnotationProps } from "./Annotation";
import { BoxProperties, BoxStyle } from "./Box";

export interface TextStyle extends BoxStyle {
  /** Helvetica, sans-serif...  */
  font?: string;
  /** Font size, in pixels */
  fontSize?: number | string;
  /** text color: #f00, yellow...*/
  color?: string;
  /** background color: empty for transparent #f00, yellow...*/
  background?: string;
  /** padding around the text */
  padding?: number;
  /** Text box border radius */
  borderRadius?: number;
}

export interface TextProperties extends Omit<BoxProperties, "type"> {
  type: "text";

  /**text to display*/
  content: string;
  style?: TextStyle;
}

export type Text = AnnotationFeature<Polygon, TextProperties>;

export const isText = (
  a: AnnotationFeature<Geometry, AnnotationProps>
): a is Text => a.properties.type === "text";
