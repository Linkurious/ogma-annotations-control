import { Annotation } from "@linkurious/ogma-annotations";
import {
  attachPanelVisibility,
  type PanelPlacement,
  type PanelOrientation
} from "@linkurious/ogma-annotations/ui";
import React, { useState, useEffect } from "react";
import { useAnnotationsContext } from "@linkurious/ogma-annotations-react";
import { AnnotationPanel } from "./AnnotationPanel";

/**
 * Drives the {@link AnnotationPanel}'s visibility from editor events using the
 * shared `attachPanelVisibility` state machine. Returns the current annotation
 * and visibility so you can render the panel yourself, or use the
 * {@link AnnotationPanelController} component which wires it up for you.
 */
export function useAnnotationPanel() {
  const { editor } = useAnnotationsContext();
  const [annotation, setAnnotation] = useState<Annotation | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!editor) return;
    return attachPanelVisibility(editor, {
      onShow: (ann) => {
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
}

/**
 * Turnkey style panel: renders {@link AnnotationPanel} and keeps it in sync with
 * the current selection. Drop it inside an `AnnotationsContextProvider`.
 */
export const AnnotationPanelController: React.FC<
  AnnotationPanelControllerProps
> = ({ placement, orientation }) => {
  const { annotation, visible } = useAnnotationPanel();
  return (
    <AnnotationPanel
      visible={visible}
      annotation={annotation}
      placement={placement}
      orientation={orientation}
    />
  );
};
