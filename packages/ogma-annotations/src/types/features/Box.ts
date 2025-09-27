import { Geometry, Polygon } from "geojson";
import { AnnotationFeature, AnnotationProps } from "./Annotation";
import { StrokeOptions } from "./styles";
import { getBbox, getBoxPosition, getBoxSize } from "../../utils";
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
  //const [x0, y0, x1, y1] = getBbox(a);
  //return isPointInRotatedRectangle(p.x, p.y, x0, y0, x1, y1, angle, threshold);
  // check if the pointer is within the bounding box of the text
  const origin = getBoxPosition(a);
  const { width, height } = getBoxSize(a);
  const { x: dx, y: dy } = rotateRadians(subtract(p, origin), -angle);

  return (
    dx > -threshold &&
    dx < width + threshold &&
    dy > -threshold &&
    dy < height + threshold
  );
}

function isPointInRotatedRectangle(
  x: number,
  y: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  angle: number,
  threshold: number = 0
): boolean {
  // Calculate rectangle center
  const centerX = x0;
  (x0 + x1) / 2;
  const centerY = y0;
  (y0 + y1) / 2;

  // Calculate rectangle dimensions
  const width = Math.abs(x1 - x0);
  const height = Math.abs(y1 - y0);

  // Translate point to rectangle's local coordinate system (center at origin)
  const translatedX = x - centerX;
  const translatedY = y - centerY;

  // Rotate point by negative angle to align with axis-aligned rectangle
  const cosAngle = Math.cos(-angle);
  const sinAngle = Math.sin(-angle);

  const rotatedX = translatedX * cosAngle - translatedY * sinAngle;
  const rotatedY = translatedX * sinAngle + translatedY * cosAngle;

  // Check if rotated point is within the axis-aligned rectangle bounds (with threshold)
  const halfWidth = width / 2 + threshold;
  const halfHeight = height / 2 + threshold;

  return Math.abs(rotatedX) <= halfWidth && Math.abs(rotatedY) <= halfHeight;
}
