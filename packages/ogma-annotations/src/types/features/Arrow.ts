import { Point } from "@linkurious/ogma";
import { Geometry, LineString } from "geojson";
import { AnnotationFeature, AnnotationProps } from "./Annotation";
import { ExportedLink, Side } from "./Link";
import { StrokeOptions } from "./styles";
import { getArrowEndPoints } from "../../utils";
import { cross, dot, length, normalize, subtract } from "../../vec";
import { Vector } from "../geometry";

export type Extremity = "none" | "arrow" | "arrow-plain" | "dot" | "halo-dot";

export interface ArrowStyles extends StrokeOptions {
  tail?: Extremity;
  head?: Extremity;
}

export interface ArrowProperties extends AnnotationProps {
  type: "arrow";
  style?: ArrowStyles;
  link?: Partial<Record<Side, ExportedLink>>;
}

export type Arrow = AnnotationFeature<LineString, ArrowProperties>;

export const isArrow = (
  a: AnnotationFeature<Geometry, AnnotationProps>
): a is Arrow => a.properties.type === "arrow";

export function detectArrow(
  a: Arrow,
  point: Point,
  threshold: number
): boolean {
  const { start, end } = getArrowEndPoints(a);
  // p is the vector from mouse pointer to the center of the arrow
  const p: Vector = subtract(point, start);
  // detect if point is ON the line between start and end.
  // line width is the arrow width
  const width = a.properties.style!.strokeWidth!;
  const vec = subtract(end, start);

  const lineLen = length(vec);
  const proj = dot(p, normalize(vec));
  return (
    proj > 0 &&
    proj < lineLen &&
    Math.abs(cross(p, normalize(vec))) < width / 2 + threshold
  );
}
