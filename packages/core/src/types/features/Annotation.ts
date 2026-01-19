import { Feature, GeometryObject } from "geojson";

/** Types of annotations supported */
export type AnnotationType = "arrow" | "text" | "box" | "comment" | "polygon";

/**
 * Base properties for all annotations.
 */
export interface AnnotationProps {
  /** Type of annotation */
  type: AnnotationType;
  /** Optional style configuration */
  style?: unknown;
}

/** Unique identifier type for annotations */
export type Id = string | number;

/**
 * Base interface for all annotation features.
 * @template G - Geometry type
 * @template P - Properties type
 */
export interface AnnotationFeature<
  G extends GeometryObject = GeometryObject,
  P = AnnotationProps
> extends Feature<G, P> {
  /** Unique identifier for the annotation */
  id: Id;
}
