import type {
  Feature,
  FeatureCollection,
  Geometry,
  GeometryObject,
  LineString,
  Polygon
} from "geojson";
import {
  EVT_ADD,
  EVT_CANCEL_DRAWING,
  EVT_DRAG,
  EVT_DRAG_END,
  EVT_DRAG_START,
  EVT_HOVER,
  EVT_REMOVE,
  EVT_SELECT,
  EVT_UNHOVER,
  EVT_UNSELECT,
  EVT_UPDATE,
  EVT_LINK
} from "./constants";

export const isArrow = (
  a: AnnotationFeature<Geometry, AnnotationProps>
): a is Arrow => a.properties.type === "arrow";

export const isText = (
  a: AnnotationFeature<Geometry, AnnotationProps>
): a is Text => a.properties.type === "text";

export const isAnnotationCollection = (
  a: AnnotationFeature<Geometry, AnnotationProps> | FeatureCollection
): a is AnnotationCollection => a.type === "FeatureCollection";

type AnnotationType = "arrow" | "text" | "box";

export interface AnnotationProps {
  type: AnnotationType;
  style?: unknown;
}

export type Id = string | number;

export interface AnnotationFeature<
  G extends GeometryObject = GeometryObject,
  P = AnnotationProps
> extends Feature<G, P> {
  id: string | number;
}

export interface ArrowStyles extends StrokeOptions {
  tail?: Extremity;
  head?: Extremity;
}

export type Point = {
  x: number;
  y: number;
};

type ExportedLink = {
  id: Id;
  side: "start" | "end";
  type: "node" | "text";
  magnet?: Point;
};

export interface ArrowProperties extends AnnotationProps {
  type: "arrow";
  style?: ArrowStyles;
  link?: Partial<Record<Side, ExportedLink>>;
}

export type Arrow = AnnotationFeature<LineString, ArrowProperties>;

export interface AnnotationCollection extends FeatureCollection {
  features: (Arrow | Text | Box)[];
}

export type StrokeOptions = {
  strokeType?: "plain" | "dashed" | "none";
  strokeColor?: string;
  strokeWidth?: number;
};

export type Box<T extends BoxProperties = BoxProperties> = AnnotationFeature<
  Polygon,
  T
>;

export interface BoxStyle extends StrokeOptions {
  /** background color: empty for transparent #f00, yellow...*/
  background?: string;
  /** padding around the box */
  padding?: number;
  /** border radius */
  borderRadius?: number;
}

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

export interface BoxProperties extends AnnotationProps {
  type: "box";
  style?: BoxStyle;
}

export interface TextProperties extends Omit<BoxProperties, "type"> {
  type: "text";

  /**text to display*/
  content: string;
  style?: TextStyle;
}

export type Text = AnnotationFeature<Polygon, TextProperties>;

export type Stroke = {
  type: "plain" | "dashed" | "none";
  color: string;
  width: number;
};

export type StrokeStyle = Stroke;

export type Extremity = "none" | "arrow" | "arrow-plain" | "dot" | "halo-dot";

export type AnnotationOptions = {
  handleSize: number;
  placeholder?: string;
};

export type Events<T> = {
  [EVT_HOVER]: (evt: T) => void;
  [EVT_UNHOVER]: (evt: T) => void;
  [EVT_SELECT]: (evt: T) => void;
  [EVT_UNSELECT]: (evt: T) => void;
  [EVT_DRAG_START]: (evt: T) => void;
  [EVT_DRAG]: (evt: T, key: "line" | "start" | "end" | "text") => void;
  [EVT_DRAG_END]: (evt: T) => void;
  [EVT_REMOVE]: (evt: T) => void;
  [EVT_ADD]: (evt: T) => void;
  [EVT_UPDATE]: (evt: T) => void;
};

export type FeatureEvents = {
  /**
   * Event trigerred when selecting an annotation
   * @param evt The annotation selected
   */
  [EVT_SELECT]: (evt: Annotation) => void;
  /**
   * Event trigerred when unselecting an annotation
   * @param evt The annotation unselected
   */
  [EVT_UNSELECT]: (evt: Annotation) => void;
  /**
   * Event trigerred when removing an annotation
   * @param evt The annotation removed
   */
  [EVT_REMOVE]: (evt: Annotation) => void;
  /**
   * Event trigerred when adding an annotation
   * @param evt The annotation added
   */
  [EVT_ADD]: (evt: Annotation) => void;
  [EVT_CANCEL_DRAWING]: () => void;
  /**
   * Event trigerred when updating an annotation
   * @returns The annotation updated
   */
  [EVT_UPDATE]: (evt: Annotation) => void;
  /**
   * Event trigerred when linking an arrow to a text or node
   */
  [EVT_LINK]: (evt: { arrow: Arrow; link: Link }) => void;
  /**
   * Event trigerred when starting to drag an arrow or a text
   */
  [EVT_DRAG_START]: (evt: Arrow | Text) => void;
  /**
   * Event trigerred when dragging an arrow or a text
   */
  [EVT_DRAG]: (
    evt: Arrow | Text,
    key: "line" | "start" | "end" | "text"
  ) => void;
  /**
   * Event trigerred when stopped dragging an arrow or a text
   */
  [EVT_DRAG_END]: (evt: Arrow | Text) => void;
};

export type TargetType = "text" | "node";

export type Side = "start" | "end";

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
   * node, it can be deduced from the arrow itself
   */
  connectionPoint: Point;
};

export type ControllerOptions = {
  /**
   * The color of the magnet points
   */
  magnetColor: string;
  /**
   * The radius in which arrows are attracted
   */
  magnetRadius: number;
  /**
   * The margin in which the Texts are detected when looking for magnet points
   */
  detectMargin: number;
  /**
   * Display size of the magnet point
   */
  magnetHandleRadius: number;

  /**
   * Placeholder for the text input
   */
  textPlaceholder: string;

  /**
   * Size of the text handle
   */
  textHandleSize: number;

  /**
   * Size of the arrow handle
   */
  arrowHandleSize: number;

  /**
   * Minimum height of the arrow in units
   */
  minArrowHeight: number;

  /**
   * Maximum height of the arrow in units
   */
  maxArrowHeight: number;
};

export type Annotation = Arrow | Text | Box;

export type Vector = Point;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
