import { EVT_UPDATE } from "../../constants";
import type { Control } from "../../Control";
import type { Annotation } from "../../types";
import { attachPanelVisibility } from "../panelVisibility";

export interface SelectionListener {
  /** The single selected annotation, on reveal and on every later change
   * to it (update, click). Called repeatedly for the same annotation. */
  show(annotation: Annotation): void;
  hide(): void;
}

interface SelectionHub {
  listeners: Set<SelectionListener>;
  current: Annotation | null;
  detach(): void;
}

/** One hub per `Control`, shared by every context toolbar on it, so the
 * debounced selection state machine (`attachPanelVisibility`) runs once
 * however many toolbars are mounted. */
const hubs = new WeakMap<Control, SelectionHub>();

function createHub(control: Control): SelectionHub {
  const hub: SelectionHub = {
    listeners: new Set(),
    current: null,
    detach: () => {}
  };
  const notify = () =>
    hub.listeners.forEach((l) =>
      hub.current ? l.show(hub.current) : l.hide()
    );

  // Editability is checked per toolbar (each has its own
  // `hideWhenNotEditable`), so the shared machine reveals everything.
  const detachVisibility = attachPanelVisibility(control, {
    onShow: (annotation) => {
      hub.current = annotation;
      notify();
    },
    onHide: () => {
      hub.current = null;
      notify();
    },
    hideWhenNotEditable: false
  });
  const onUpdate = (annotation: Annotation) => {
    if (hub.current?.id !== annotation.id) return;
    hub.current = annotation;
    notify();
  };
  // Re-notify on click so a toolbar re-checks editability after the
  // selected annotation was locked/unlocked in place.
  const onClick = () => {
    if (hub.current) notify();
  };
  control.on(EVT_UPDATE, onUpdate);
  control.on("click", onClick);

  hub.detach = () => {
    detachVisibility();
    control.off(EVT_UPDATE, onUpdate);
    control.off("click", onClick);
  };
  return hub;
}

/** Subscribes `listener` to `control`'s single-selection; returns the
 * unsubscribe function. The shared hub is torn down with its last
 * listener. */
export function watchSelection(
  control: Control,
  listener: SelectionListener
): () => void {
  let hub = hubs.get(control);
  if (!hub) {
    hub = createHub(control);
    hubs.set(control, hub);
  }
  hub.listeners.add(listener);
  if (hub.current) listener.show(hub.current);

  const owner = hub;
  return () => {
    owner.listeners.delete(listener);
    if (owner.listeners.size === 0) {
      owner.detach();
      if (hubs.get(control) === owner) hubs.delete(control);
    }
  };
}
