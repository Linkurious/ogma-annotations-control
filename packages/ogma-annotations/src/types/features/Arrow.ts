import { Geometry, LineString } from "geojson";
import { AnnotationFeature, AnnotationProps } from "./Annotation";
import { ExportedLink, Side } from "./Link";
import { StrokeOptions } from "./styles";

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

export type Arrow = AnnotationFeature<LineString, ArrowProperties>;

export const isArrow = (
  a: AnnotationFeature<Geometry, AnnotationProps>
): a is Arrow => a.properties.type === "arrow";
