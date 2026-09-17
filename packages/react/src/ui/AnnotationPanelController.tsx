import { Annotation } from "@linkurious/ogma-annotations";
import {
  attachPanelVisibility,
  classifyPanelAnnotationType,
  ALL_PANEL_ANNOTATION_TYPES,
  type PanelPlacement,
  type PanelOrientation,
  type PanelAnnotationType
} from "@linkurious/ogma-annotations/ui";
import React, { useState, useEffect, useRef } from "react";
import { useAnnotationsContext } from "@linkurious/ogma-annotations-react";
import { AnnotationPanel } from "./AnnotationPanel";

/**
 * Drives the {@link AnnotationPanel}'s visibility from editor events using the
 * shared `attachPanelVisibility` state machine. Returns the current annotation
 * and visibility so you can render the panel yourself, or use the
 * {@link AnnotationPanelController} component which wires it up for you.
 *
 * `enabledTypes` mirrors the vanilla `AnnotationPanel`'s option of the same
 * name (defaults to all five kinds) - exclude `"text"` once you've adopted
 * `TextAnnotationToolbarController` for Text annotations and sticky notes,
 * so the two don't show at once for the same selection.
 */
export function useAnnotationPanel(
  enabledTypes: PanelAnnotationType[] = ALL_PANEL_ANNOTATION_TYPES
) {
  const { editor } = useAnnotationsContext();
  const [annotation, setAnnotation] = useState<Annotation | null>(null);
  const [visible, setVisible] = useState(false);
  // Read fresh in the effect below without making `enabledTypes` (a new
  // array identity on every render, if the caller inlines the prop) part
  // of the dependency array - that would re-subscribe attachPanelVisibility
  // (and drop any pending show timer) on every render.
  const enabledTypesRef = useRef(enabledTypes);
  enabledTypesRef.current = enabledTypes;

  useEffect(() => {
    if (!editor) return;
    return attachPanelVisibility(editor, {
      onShow: (ann) => {
        const type = classifyPanelAnnotationType(ann);
        if (!type || !enabledTypesRef.current.includes(type)) {
          setVisible(false);
          setAnnotation(null);
          return;
        }
        setAnnotation(ann);
        setVisible(true);
      },
      onHide: () => {
        setVisible(false);
        setAnnotation(null);
      }
    });
  }, [editor]);

  return { annotation, visible };
}

export interface AnnotationPanelControllerProps {
  /**
   * Which screen edge/corner the panel docks to. Defaults to `"right"`
   * (vertically centered on the right edge — the original look).
   */
  placement?: PanelPlacement;
  /**
   * Whether panel sections stack vertically or run horizontally as a
   * toolbar. Defaults to `"vertical"`.
   */
  orientation?: PanelOrientation;
  /**
   * Which selected-annotation types the panel responds to. Defaults to all
   * five. Exclude `"text"` once you've adopted
   * `TextAnnotationToolbarController` for Text annotations and sticky
   * notes.
   */
  enabledTypes?: PanelAnnotationType[];
}

/**
 * Turnkey style panel: renders {@link AnnotationPanel} and keeps it in sync with
 * the current selection. Drop it inside an `AnnotationsContextProvider`.
 */
export const AnnotationPanelController: React.FC<
  AnnotationPanelControllerProps
> = ({ placement, orientation, enabledTypes }) => {
  const { annotation, visible } = useAnnotationPanel(enabledTypes);
  return (
    <AnnotationPanel
      visible={visible}
      annotation={annotation}
      placement={placement}
      orientation={orientation}
    />
  );
};
