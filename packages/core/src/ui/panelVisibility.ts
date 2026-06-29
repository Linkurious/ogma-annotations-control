/**
 * Framework-agnostic visibility state machine for the annotation style panel.
 *
 * The panel should appear when a single annotation is selected — but only once
 * we're sure the interaction is a click/selection and not the start of a drag
 * or an in-progress drawing. This logic was previously duplicated verbatim in
 * the vanilla `AnnotationPanel` constructor and the React
 * `AnnotationPanelController`; it now lives here and is consumed by both.
 */
import type { Annotation } from "../types";

export interface PanelVisibilityHandlers {
  /** Called when the panel should be shown for `annotation`. */
  onShow: (annotation: Annotation) => void;
  /** Called when the panel should be hidden. */
  onHide: () => void;
}

/**
 * The slice of `Control` this state machine relies on. Declared structurally so
 * the function does not pull the full `Control` type into the `/ui` entry's
 * rolled declarations (which would otherwise create a duplicate, incompatible
 * `Control` identity for consumers).
 */
export interface PanelVisibilityControl {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event: string, handler: (...args: any[]) => void): unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  off(event: string, handler: (...args: any[]) => void): unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  once(event: string, handler: (...args: any[]) => void): unknown;
  getAnnotation(id: string | number): Annotation | undefined;
  isDrawing(): boolean;
}

/**
 * Wires `control` events to show/hide callbacks. Returns a `detach` function
 * that removes every listener it registered.
 */
export function attachPanelVisibility(
  control: PanelVisibilityControl,
  { onShow, onHide }: PanelVisibilityHandlers
): () => void {
  // The annotation selected but not yet shown (awaiting click/dragend).
  let pending: Annotation | null = null;

  const showPending = () => {
    if (pending) {
      onShow(pending);
      pending = null;
    }
  };

  const handleSelect = (sel: { ids: (string | number)[] }) => {
    if (sel.ids.length === 1) {
      const ann = control.getAnnotation(sel.ids[0]);
      if (!ann) return;

      // Stash as pending — don't show immediately in case this turns into a
      // drag. If we're mid-drawing, defer until the draw resolves.
      pending = ann as Annotation;
      if (control.isDrawing()) {
        control.once("cancelDrawing", showPending);
        control.once("completeDrawing", showPending);
      }
    } else {
      pending = null;
      onHide();
    }
  };

  const handleDragStart = () => {
    pending = null;
    onHide();
  };

  const handleUnselect = () => {
    pending = null;
    onHide();
  };

  control.on("select", handleSelect);
  control.on("click", showPending);
  control.on("dragend", showPending);
  control.on("dragstart", handleDragStart);
  control.on("unselect", handleUnselect);

  return () => {
    control.off("select", handleSelect);
    control.off("click", showPending);
    control.off("dragend", showPending);
    control.off("dragstart", handleDragStart);
    control.off("unselect", handleUnselect);
    control.off("cancelDrawing", showPending);
    control.off("completeDrawing", showPending);
  };
}
