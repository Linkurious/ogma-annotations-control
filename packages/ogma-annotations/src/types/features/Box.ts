import { Geometry, Polygon } from "geojson";
import { AnnotationFeature, AnnotationProps } from "./Annotation";
import { StrokeOptions } from "./styles";
import { getBoxPosition, getBoxSize } from "../../utils";
import { rotateRadians, subtract } from "../../vec";
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
  angle: number,
  threshold: number
): boolean {
  // check if the pointer is within the bounding box of the text
  const { x: tx, y: ty } = getBoxPosition(a);
  const { width, height } = getBoxSize(a);
  const origin = { x: tx, y: ty };
  const { x: dx, y: dy } = rotateRadians(subtract(p, origin), -angle);

  return (
    dx > -threshold &&
    dx < width + threshold &&
    dy > -threshold &&
    dy < height + threshold
  );
}
