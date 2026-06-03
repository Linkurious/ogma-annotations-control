import { Id } from "./Annotation";
import { SIDE_START, SIDE_END, TARGET_TYPES } from "../../constants";
import { Point } from "../geometry";

export type TargetType = (typeof TARGET_TYPES)[keyof typeof TARGET_TYPES];

export type Side = typeof SIDE_START | typeof SIDE_END;

/** Arrow snapped to the center or perimeter of a node. */
export type NodeMagnet = { type: "node"; center: boolean };

/** Arrow snapped at parametric position t (0–1) along an edge path. */
export type EdgeMagnet = { type: "edge"; t: number };

/**
 * Arrow snapped to a rectangular annotation (text, box, comment).
 * nx/ny are center-relative fractions multiplied by width/height:
 *   left-center  = { nx: -0.5, ny: 0 }
 *   right-center = { nx:  0.5, ny: 0 }
 *   center       = { nx:  0,   ny: 0 }
 */
export type BoxMagnet = { type: "box"; nx: number; ny: number };

/**
 * Arrow snapped to a polygon annotation.
 * rx/ry are 0–1 fractions of the polygon's bounding box from its top-left corner.
 */
export type PolygonMagnet = { type: "polygon"; rx: number; ry: number };

export type Magnet = NodeMagnet | EdgeMagnet | BoxMagnet | PolygonMagnet;

/** Link between an arrow and a text or node */
export interface Link {
  /** arrow attached to the text or node */
  arrow: Id;

  /** id of the text the arrow is attached to */
  id: Id;

  /**  On which end the arrow is tighten to the text */
  side: Side;

  /** id of the text or node  the arrow is attached to */
  target: Id;

  /** Text or node */
  targetType: TargetType;

  /** Typed snap point — semantics depend on targetType, see Magnet union. */
  magnet: Magnet;
}

/**
 * Serialized link stored inside arrow.properties.link.
 * Uses plain { x, y } for backward compatibility with saved annotations.
 * Converted to the internal Magnet type by Links.add().
 */
export type ExportedLink = {
  id: Id;
  side: Side;
  type: TargetType;
  magnet?: Point;
};
