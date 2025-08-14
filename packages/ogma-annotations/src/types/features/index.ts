import { FeatureCollection, Geometry } from "geojson";
import { AnnotationFeature, AnnotationProps, Id } from "./Annotation";
import { Arrow } from "./Arrow";
import { Box } from "./Box";
import { Comment } from "./Comment";
import { Text } from "./Text";

export * from "./Annotation";
export * from "./Arrow";
export * from "./Box";
export * from "./Link";
export * from "./Text";
export * from "./styles";

export type Annotation = Arrow | Box | Text | Comment;

export interface AnnotationCollection extends FeatureCollection {
  features: Annotation[];
}

export const isAnnotationCollection = (
  a: AnnotationFeature<Geometry, AnnotationProps> | FeatureCollection
): a is AnnotationCollection => a.type === "FeatureCollection";

export type AnnotationGetter = (id: Id) => Annotation | undefined;
