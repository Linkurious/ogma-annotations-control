import { Ogma, OgmaParameters } from "@linkurious/ogma";
import {
  Control,
  createArrow,
  createBox,
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
  createBox: typeof createBox;
  createPolygon: typeof createPolygon;
  createText: typeof createText;
  demoStyles: DemoStyles;
  /**
   * Graph point -> viewport-relative page point Playwright's page.mouse can
   * be driven with directly. ogma.view.graphToScreenCoordinates alone
   * returns a *container*-relative point, which only lines up with
   * page.mouse when #graph-container sits flush at the viewport's (0,0) -
   * it doesn't by default (see index.html's #graph-container margin). Would
   * behave exactly like graphToScreenCoordinates if the container ever sat
   * at (0,0), so it's safe to use unconditionally either way.
   */
  screenToPage: (p: { x: number; y: number }) => { x: number; y: number };
  /**
   * Same viewport-offset step as screenToPage, for a point already
   * expressed relative to #graph-container's own top-left corner (e.g. an
   * arbitrary click spot that doesn't need graph-coordinate precision).
   */
  containerToPage: (p: { x: number; y: number }) => { x: number; y: number };
}
