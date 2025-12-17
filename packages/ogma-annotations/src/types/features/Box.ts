import { Geometry, Point as GeoJSONPoint } from "geojson";
import { nanoid as getId } from "nanoid";
import { AnnotationFeature, AnnotationProps } from "./Annotation";
import { StrokeOptions } from "./styles";
import { getBoxPosition, getBoxSize } from "../../utils/utils";
import { Color } from "../colors";
import { Point } from "../geometry";

export interface BoxStyle extends StrokeOptions {
  /** background color: empty for transparent #f00, yellow...*/
  background?: Color;
  /** padding around the box */
  padding?: number;
  /** border radius */
  borderRadius?: number;
  /** if true, the box scales with zoom. Default is true */
  scaled?: boolean;
}

export interface BoxProperties extends AnnotationProps {
  type: "box";
  /** Width of the box */
  width: number;
  /** Height of the box */
  height: number;
  /** Style options for the box */
  style?: BoxStyle;
}

/**
 * Box annotation feature
 */
export interface Box extends AnnotationFeature<GeoJSONPoint, BoxProperties> {}

export const isBox = (
  a: AnnotationFeature<Geometry, AnnotationProps>
): a is Box => a.properties.type === "box";

export function detectBox(
  a: Box,
  p: Point,
  sin: number = 0,
  cos: number = 1,
  threshold: number = 0
): boolean {
  // check if the pointer is within the bounding box of the text
  const origin = getBoxPosition(a);
  const { width, height } = getBoxSize(a);
  const tx = p.x - origin.x;
  const ty = p.y - origin.y;
  const dx = tx * cos - ty * sin;
  const dy = tx * sin + ty * cos;

  return (
    dx > -threshold &&
    dx < width + threshold &&
    dy > -threshold &&
    dy < height + threshold
  );
}

export const defaultBoxStyle: BoxStyle = {
  background: "#f5f5f5",
  strokeWidth: 0,
  borderRadius: 8,
  padding: 16,
  strokeType: "plain"
};

//used when adding a new Box
export const defaultBoxOptions: Box = {
  id: undefined as unknown as string, // will be set by the editor
  type: "Feature",
  properties: {
    type: "box",
    width: 100,
    height: 50,
    style: { ...defaultBoxStyle }
  },
  geometry: {
    type: "Point",
    coordinates: [50, 25], // center of 100x50 box
    bbox: [0, 0, 100, 50]
  }
};

export const createBox = (
  x = 0,
  y = 0,
  width = 100,
  height = 50,
  styles: Partial<BoxStyle> = { ...defaultBoxStyle }
): Box => ({
  id: getId(),
  type: "Feature",
  properties: {
    type: "box",
    width,
    height,
    style: { ...defaultBoxStyle, ...styles }
  },
  geometry: {
    type: "Point",
    coordinates: [x + width / 2, y + height / 2] // center
  }
});
