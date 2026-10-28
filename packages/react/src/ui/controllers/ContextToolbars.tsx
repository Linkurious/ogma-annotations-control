import {
  ContextToolbars,
  TextAnnotationToolbar,
  type ContextToolbarsOptions,
  type TextAnnotationToolbarOptions
} from "@linkurious/ogma-annotations/ui";
import React, { useEffect, useRef } from "react";
import { useAnnotationsContext } from "@linkurious/ogma-annotations-react";
import type { Control } from "@linkurious/ogma-annotations";

/**
 * Hosts a vanilla toolbar class that fully owns its own DOM and
 * anchor-position tracking via an Ogma overlay layer - there's no
 * render-friendly internals to port. So this constructs it imperatively
 * once the editor is ready, and `destroy()`s it on cleanup.
 */
function useVanillaToolbar<P>(
  Toolbar: new (options: P & { control: Control }) => { destroy(): void },
  props: P
) {
  const { editor } = useAnnotationsContext();
  // Read fresh options at construction time without making the toolbars
  // re-mount (losing their anchor state) whenever the caller re-renders
  // with a new-identity options object/array.
  const optionsRef = useRef(props);
  optionsRef.current = props;

  useEffect(() => {
    if (!editor) return;
    const toolbar = new Toolbar({ ...optionsRef.current, control: editor });
    return () => toolbar.destroy();
  }, [editor]);
}

export type ContextToolbarsControllerProps = Omit<
  ContextToolbarsOptions,
  "control"
>;

/**
 * Turnkey floating context (style) toolbars for Text, sticky notes, boxes
 * and arrows - same per-type options as the vanilla `ContextToolbars`
 * (`box={false}` turns one off). Drop it inside an
 * `AnnotationsContextProvider`, same as {@link AnnotationPanelController}.
 */
export const ContextToolbarsController: React.FC<
  ContextToolbarsControllerProps
> = (props) => {
  useVanillaToolbar(ContextToolbars, props);
  return null;
};

/** @deprecated Use `ContextToolbarsControllerProps`. */
export type TextAnnotationToolbarControllerProps = Omit<
  TextAnnotationToolbarOptions,
  "control"
>;

/** @deprecated Use `ContextToolbarsController`. */
export const TextAnnotationToolbarController: React.FC<
  TextAnnotationToolbarControllerProps
> = (props) => {
  useVanillaToolbar(TextAnnotationToolbar, props);
  return null;
};
