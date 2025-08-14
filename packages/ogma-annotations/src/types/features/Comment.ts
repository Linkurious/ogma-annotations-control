import { Polygon } from "geojson";
import { AnnotationFeature, AnnotationProps } from "./Annotation";
import { BoxProperties } from "./Box";

export interface CommentProps extends Omit<BoxProperties, "type"> {
  type: "comment";
  text: string;
  author?: string;
  timestamp?: Date;
}

export type Comment = AnnotationFeature<Polygon, CommentProps>;

export const isComment = (
  a: AnnotationFeature<Polygon, AnnotationProps>
): a is Comment => a.properties.type === "comment";
