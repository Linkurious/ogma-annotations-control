/**
 * Which selected-annotation *kind* a panel/toolbar responds to - shared
 * between the vanilla `AnnotationPanel` and the React
 * `AnnotationPanelController`/`useAnnotationPanel` so both filter selection
 * the same way (one classification function, not two copies).
 *
 * Distinct from `AnnotationToolbar`'s `ToolbarDrawingType`: that one is
 * about which *drawing tool* to offer (and splits `"sticky-note"` out from
 * `"text"` since they're different buttons to create), this one is about
 * which *already-selected annotation's data type* to react to - a sticky
 * note is still just `"text"` here, same as any other Text annotation,
 * since the docked panel (and, for Text specifically, the floating
 * `TextAnnotationToolbar`) don't have a separate UI for it.
 */
import {
  isArrow,
  isBox,
  isComment,
  isPolygon,
  isText,
  type Annotation
} from "../types";

export type PanelAnnotationType = "arrow" | "text" | "box" | "comment" | "polygon";

export const ALL_PANEL_ANNOTATION_TYPES: PanelAnnotationType[] = [
  "arrow",
  "text",
  "box",
  "comment",
  "polygon"
];

/** `null` for an annotation kind the panel has no UI for at all (none
 * today, but new annotation types may be added before their panel support
 * is). Callers should treat `null` the same as "not enabled". */
export function classifyPanelAnnotationType(
  a: Annotation
): PanelAnnotationType | null {
  if (isArrow(a)) return "arrow";
  if (isText(a)) return "text";
  if (isBox(a)) return "box";
  if (isComment(a)) return "comment";
  if (isPolygon(a)) return "polygon";
  return null;
}
