import { Ogma, OgmaParameters } from "@linkurious/ogma";
import {
  Control,
  createArrow,
  createPolygon,
  createText,
  type Arrow,
  type Text,
  type Box,
  type Polygon,
  type Comment
} from "../../../src";

// Same defaults `AnnotationToolbar` bakes in - see
// pages/index.ts:demoStyles for where these actually live.
export interface DemoStyles {
  arrow: Partial<Arrow["properties"]["style"]>;
  text: Partial<Text["properties"]["style"]>;
  box: Partial<Box["properties"]["style"]>;
  polygon: Partial<Polygon["properties"]["style"]>;
  comment: {
    commentStyle: Partial<Comment["properties"]>;
    arrowStyle: { style: Partial<Arrow["properties"]["style"]> };
  };
}

export interface AugmentedWindow {
  Ogma: typeof Ogma;
  ogma: Ogma;
  editor: Control;
  Control: typeof Control;
  createOgma: <T extends OgmaParameters>(options: T) => Ogma;
  createEditor: () => Control;
  createArrow: typeof createArrow;
  createPolygon: typeof createPolygon;
  createText: typeof createText;
  demoStyles: DemoStyles;
}
