import { Geometry, Point as GeoJSONPoint } from "geojson";
import { nanoid as getId } from "nanoid";
import { AnnotationFeature, AnnotationProps } from "./Annotation";
import { BoxProperties, BoxStyle } from "./Box";
import { getBoxSize } from "../../utils/utils";
import { Point } from "../geometry";

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
  /** When true, text maintains constant size regardless of zoom level */
  fixedSize?: boolean;
}

export interface TextProperties extends Omit<BoxProperties, "type"> {
  type: "text";

  /**text to display*/
  content: string;
  /** Width of the text box */
  width: number;
  /** Height of the text box */
  height: number;
  style?: TextStyle;
}

export type Text = AnnotationFeature<GeoJSONPoint, TextProperties>;

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
  strokeType: "plain",
  fixedSize: false
};

//used when adding a new Text
export const defaultTextOptions: Text = {
  id: getId(),
  type: "Feature",
  properties: {
    type: "text",
    content: "",
    width: 100,
    height: 50,
    style: { ...defaultTextStyle }
  },
  geometry: {
    type: "Point",
    coordinates: [50, 25], // center of 100x50 box
    bbox: [0, 0, 100, 50]
  }
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
    width,
    height,
    style: { ...defaultTextStyle, ...styles }
  },
  geometry: {
    type: "Point",
    coordinates: [x + width / 2, y + height / 2], // center
    bbox: [x, y, x + width, y + height]
  }
});

export function detectText(
  a: Text,
  p: Point,
  threshold: number = 0,
  sin: number = 0,
  cos: number = 1,
  zoom: number = 1
): boolean {
  // Get center directly from Point geometry coordinates
  const [cx, cy] = a.geometry.coordinates as [number, number];
  let { width, height } = getBoxSize(a);

  // For fixed-size text, scale world-space dimensions by invZoom
  if (a.properties.style?.fixedSize) {
    width /= zoom;
    height /= zoom;
  }

  const hw = width / 2;
  const hh = height / 2;

  const tx = p.x - cx;
  const ty = p.y - cy;
  const dx = tx * cos - ty * sin;
  const dy = tx * sin + ty * cos;

  return (
    dx > -hw - threshold &&
    dx < hw + threshold &&
    dy > -hh - threshold &&
    dy < hh + threshold
  );
}
