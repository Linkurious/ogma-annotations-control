import { Point } from "@linkurious/ogma";
import { Geometry, LineString } from "geojson";
import { nanoid as getId } from "nanoid";
import { AnnotationFeature, AnnotationProps } from "./Annotation";
import { ExportedLink, Side } from "./Link";
import { StrokeOptions } from "./styles";
import { getArrowEndPoints } from "../../utils/utils";
import { cross, dot, length, normalize, subtract } from "../../utils/vec";
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

/**
 * Arrow annotation feature. Represents a directed line between two points,
 * can connect a textbox to a shape.
 */
export interface Arrow extends AnnotationFeature<LineString, ArrowProperties> {}

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

export const defaultArrowStyle: ArrowStyles = {
  strokeType: "plain",
  strokeColor: "#202020",
  strokeWidth: 1,
  head: "none",
  tail: "none"
};

// used when adding a new Arrow
export const defaultArrowOptions: Arrow = {
  id: undefined as unknown as string, // will be set by the editor
  type: "Feature",
  properties: {
    type: "arrow",
    style: {
      ...defaultArrowStyle
    }
  },
  geometry: {
    type: "LineString",
    coordinates: [
      [0, 0],
      [100, 100]
    ]
  }

  // type: 'arrow',
  // stroke: {
  //   type: 'plain',
  //   color: 'black',
  //   width: 1
  // },
  // head: 'none',
  // tail: 'arrow-plain',
  // start: { x: 0, y: 0 },
  // end: { x: 100, y: 100 }
};

export const createArrow = (
  x0 = 0,
  y0 = 0,
  x1 = 0,
  y1 = 0,
  styles = { ...defaultArrowStyle }
): Arrow => ({
  id: getId(),
  type: "Feature",
  properties: {
    type: "arrow",
    style: {
      ...defaultArrowStyle,
      ...styles
    }
  },
  geometry: {
    type: "LineString",
    coordinates: [
      [x0, y0],
      [x1, y1]
    ]
  }
});
