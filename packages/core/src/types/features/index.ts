import { FeatureCollection, Geometry } from "geojson";
import { AnnotationFeature, AnnotationProps, Id } from "./Annotation";
import { Arrow } from "./Arrow";
import { Box } from "./Box";
import { Comment } from "./Comment";
import { Polygon } from "./Polygon";
import { Text } from "./Text";

export * from "./Annotation";
export * from "./Arrow";
export * from "./Box";
export * from "./Comment";
export * from "./Link";
export * from "./Polygon";
export * from "./Text";
export * from "./styles";

/** Union type of all Annotation features */
export type Annotation = Arrow | Box | Text | Comment | Polygon;

/** Collection of Annotations, GeoJSON FeatureCollection */
export interface AnnotationCollection extends FeatureCollection {
  features: Annotation[];
}

/** Helper to check if a feature collection is an annotation collection */
export const isAnnotationCollection = (
  a: AnnotationFeature<Geometry, AnnotationProps> | FeatureCollection
): a is AnnotationCollection => a.type === "FeatureCollection";

/** Function type to get an Annotation by its id */
export type AnnotationGetter = (id: Id) => Annotation | undefined;
