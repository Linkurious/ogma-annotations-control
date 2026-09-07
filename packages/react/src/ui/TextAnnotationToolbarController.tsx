import {
  TextAnnotationToolbar,
  type TextAnnotationToolbarOptions
} from "@linkurious/ogma-annotations/ui";
import React, { useEffect, useRef } from "react";
import { useAnnotationsContext } from "@linkurious/ogma-annotations-react";

export type TextAnnotationToolbarControllerProps = Omit<
  TextAnnotationToolbarOptions,
  "control"
>;

/**
 * Turnkey floating style toolbar for Text annotations and sticky notes.
 * Drop it inside an `AnnotationsContextProvider`, same as
 * {@link AnnotationPanelController}.
 *
 * Unlike `AnnotationPanel` (a plain HTML template `AnnotationPanelController`
 * re-renders as JSX), `TextAnnotationToolbar` fully owns its own DOM and
 * anchor-position tracking via an Ogma overlay layer - there's no
 * render-friendly internals to port. So this wrapper does the same thing
 * `AnnotationsContextProvider` itself already does for the `Control`
 * instance: construct the vanilla class imperatively once editor is ready,
 * and `destroy()` it on cleanup.
 */
export const TextAnnotationToolbarController: React.FC<
  TextAnnotationToolbarControllerProps
> = (props) => {
  const { editor } = useAnnotationsContext();
  // Read fresh fonts/fontSizes/swatches at construction time without
  // making the toolbar re-mount (losing its anchor state) whenever the
  // caller re-renders with a new-identity options object/array.
  const optionsRef = useRef(props);
  optionsRef.current = props;

  useEffect(() => {
    if (!editor) return;
    const toolbar = new TextAnnotationToolbar({
      // `editor`'s type resolves through the *built* package's `dist/types`
      // (the main entry isn't source-aliased in this package's tsconfig,
      // unlike the `/ui` subpath), while `TextAnnotationToolbarOptions.control`
      // resolves through core's *source* `Control` - same class, two
      // separate declarations with private members, which TS treats as
      // incompatible. `panelVisibility.ts`'s `PanelVisibilityControl`
      // sidesteps this the structural-type way for its own narrow needs;
      // `AnnotationStyleToolbar`'s options need the real `Control` (it
      // calls far more than 4 methods on it), so this is the one place
      // that just casts across the boundary instead.
      control: editor as unknown as TextAnnotationToolbarOptions["control"],
      ...optionsRef.current
    });
    return () => toolbar.destroy();
  }, [editor]);

  return null;
};
