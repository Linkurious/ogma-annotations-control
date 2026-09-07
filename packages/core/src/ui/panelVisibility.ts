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
  // The annotation `onShow` was last called with (cleared on hide) - lets
  // `handleUnselect` tell a real deselect apart from the stale `unselect`
  // that clicking straight from one annotation to another also fires (see
  // its own comment below).
  let shown: Annotation | null = null;
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
      shown = pending;
      onShow(pending);
      pending = null;
    }
  };

  const hide = () => {
    clearTimer();
    pending = null;
    shown = null;
    onHide();
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
      hide();
    }
  };

  const handleDragStart = () => hide();

  const handleUnselect = (evt: { ids: (string | number)[] }) => {
    // Clicking straight from one selected annotation to another fires
    // `select` for the *new* one first, then `unselect` for the old one
    // (not the more intuitive other way around) - so by the time this
    // runs, `pending`/`shown` may already be the new annotation, and this
    // `unselect` is stale: it's not "nothing is selected anymore", it's
    // fallout from the old selection losing out to the new one. Only treat
    // it as a real deselect when it actually names our own pending/shown
    // annotation - otherwise ignore it and leave the newer selection's
    // pending timer / already-shown panel alone.
    const current = pending ?? shown;
    if (current && !evt.ids.includes(current.id)) return;
    hide();
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
