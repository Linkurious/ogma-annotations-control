import { Feature, GeometryObject } from "geojson";

type AnnotationType = "arrow" | "text" | "box" | "comment";

export interface AnnotationProps {
  type: AnnotationType;
  style?: unknown;
}

export type Id = string | number;

export interface AnnotationFeature<
  G extends GeometryObject = GeometryObject,
  P = AnnotationProps
> extends Feature<G, P> {
  id: Id;
}
