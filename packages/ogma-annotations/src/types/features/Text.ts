import { Geometry, Polygon } from "geojson";
import { nanoid as getId } from "nanoid";
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

export const defaultTextStyle: TextStyle = {
  font: "sans-serif",
  fontSize: 18,
  color: "#505050",
  background: "#f5f5f5",
  strokeWidth: 0,
  borderRadius: 8,
  padding: 16,
  strokeType: "plain"
};

//used when adding a new Text
export const defaultTextOptions: Text = {
  id: getId(),
  type: "Feature",
  properties: {
    type: "text",
    content: "",
    style: { ...defaultTextStyle }
  },
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [0, 0],
        [100, 0],
        [100, 50],
        [0, 50],
        [0, 0]
      ]
    ]
  }
  // position: { x: 0, y: 0 },
  // size: { width: 100, height: 50 }
};

export const createText = (
  x = 0,
  y = 0,
  width = 100,
  height = 50,
  content = "",
  styles: Partial<TextStyle> = { ...defaultTextStyle }
): Text => ({
  id: getId(),
  type: "Feature",
  properties: {
    type: "text",
    content,
    style: { ...defaultTextStyle, ...styles }
  },
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [x, y],
        [x + width, y],
        [x + width, y + height],
        [x, y + height],
        [x, y]
      ]
    ]
  }
});
