export * from "./AnnotationsContext";
export * from "./constants";
export * from "./utils";

// Re-export additional types and helpers from core package
export {
  isBox,
  isPolygon,
  isComment,
  createBox,
  createPolygon,
  createComment,
  type Box,
  type Polygon,
  type Comment,
  type ArrowProperties,
  type BoxProperties,
  type PolygonProperties,
  type CommentProps,
  getAnnotationsBounds
} from "@linkurious/ogma-annotations";
