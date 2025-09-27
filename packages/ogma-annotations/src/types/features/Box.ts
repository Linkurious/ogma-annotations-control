import { Geometry, Polygon } from "geojson";
import { AnnotationFeature, AnnotationProps } from "./Annotation";
import { StrokeOptions } from "./styles";
import { getBoxPosition, getBoxSize } from "../../utils";
import { Point } from "../geometry";

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

export function detectBox(
  a: Box,
  p: Point,
  revSin: number = 0,
  revCos: number = 1,
  threshold: number = 0
): boolean {
  // check if the pointer is within the bounding box of the text
  const origin = getBoxPosition(a);
  const { width, height } = getBoxSize(a);
  const tx = p.x - origin.x;
  const ty = p.y - origin.y;
  const sin = revSin;
  const cos = revCos;
  const dx = tx * cos - ty * sin;
  const dy = tx * sin + ty * cos;

  return (
    dx > -threshold &&
    dx < width + threshold &&
    dy > -threshold &&
    dy < height + threshold
  );
}
