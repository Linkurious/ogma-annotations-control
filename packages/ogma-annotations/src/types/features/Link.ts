import { Id } from "./Annotation";
import { SIDE_START, SIDE_END, TARGET_TYPES } from "../../constants";
import { Point } from "../geometry";

export type TargetType = (typeof TARGET_TYPES)[keyof typeof TARGET_TYPES];

export type Side = typeof SIDE_START | typeof SIDE_END;

export type Link = {
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

  /**
   * On which point relative to topleft corner the arrow is tighten, in case of
   * node, a 0 vector represents the center, otherwise it can be deduced from the arrow itself
   */
  magnet: Point;
};

export type ExportedLink = {
  id: Id;
  side: Side;
  type: TargetType;
  magnet?: Point;
};
