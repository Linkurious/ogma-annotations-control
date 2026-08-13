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

/**
 * Delay before revealing the panel on selection. Long enough for a
 * drag-to-move interaction to emit `dragstart` (which cancels it), short
 * enough to feel immediate on a plain click.
 */
const SHOW_DELAY_MS = 150;

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
  // The annotation selected but not yet shown, and a timer that reveals it.
  let pending: Annotation | null = null;
  let showTimer: ReturnType<typeof setTimeout> | null = null;

  const clearTimer = () => {
    if (showTimer !== null) {
      clearTimeout(showTimer);
      showTimer = null;
    }
  };

  const showPending = () => {
    clearTimer();
    if (pending) {
      onShow(pending);
      pending = null;
    }
  };

  const handleSelect = (sel: { ids: (string | number)[] }) => {
    clearTimer();
    if (sel.ids.length === 1) {
      const ann = control.getAnnotation(sel.ids[0]);
      if (!ann) return;

      pending = ann as Annotation;

      if (control.isDrawing()) {
        // Mid-drawing: reveal once the draw resolves, not before.
        control.once("cancelDrawing", showPending);
        control.once("completeDrawing", showPending);
        return;
      }

      // Reveal after a short delay rather than waiting for a follow-up click or
      // dragend event — those don't always fire (e.g. programmatic selection,
      // or a text annotation whose DOM overlay swallows the click). The delay
      // gives a drag-to-move interaction time to emit `dragstart`, which
      // cancels the timer first and avoids a show/hide flicker.
      showTimer = setTimeout(showPending, SHOW_DELAY_MS);
    } else {
      pending = null;
      onHide();
    }
  };

  const handleDragStart = () => {
    clearTimer();
    pending = null;
    onHide();
  };

  const handleUnselect = () => {
    clearTimer();
    pending = null;
    onHide();
  };

  control.on("select", handleSelect);
  // `click`/`dragend` still reveal immediately when they do fire, pre-empting
  // the timer for snappier feedback.
  control.on("click", showPending);
  control.on("dragend", showPending);
  control.on("dragstart", handleDragStart);
  control.on("unselect", handleUnselect);

  return () => {
    clearTimer();
    control.off("select", handleSelect);
    control.off("click", showPending);
    control.off("dragend", showPending);
    control.off("dragstart", handleDragStart);
    control.off("unselect", handleUnselect);
    control.off("cancelDrawing", showPending);
    control.off("completeDrawing", showPending);
  };
}
