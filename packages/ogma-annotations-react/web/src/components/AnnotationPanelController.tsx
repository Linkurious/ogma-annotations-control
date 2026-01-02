import React, { useState, useEffect } from "react";
import { Annotation, FeaturesEvent } from "@linkurious/ogma-annotations";
import { useAnnotationsContext } from "../../../src";
import { AnnotationPanel } from "./AnnotationPanel";

export const AnnotationPanelController: React.FC = () => {
  const { editor } = useAnnotationsContext();
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(
    null
  );
  const [pendingAnnotation, setPendingAnnotation] = useState<Annotation | null>(
    null
  );
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!editor) return;

    const handleSelect = (sel: FeaturesEvent) => {
      if (sel.ids.length === 1) {
        const annotation = editor.getAnnotation(sel.ids[0]);
        if (!annotation) return;

        // Store as pending - don't show immediately in case of drag
        setPendingAnnotation(annotation);

        const showPanel = () => {
          if (pendingAnnotation) {
            setCurrentAnnotation(pendingAnnotation);
            setVisible(true);
            setPendingAnnotation(null);
          }
        };

        if (editor.isDrawing()) {
          editor
            .once("cancelDrawing", showPanel)
            .once("completeDrawing", showPanel);
        }
        // Don't show immediately - wait for potential drag or mouseup
      } else {
        setPendingAnnotation(null);
        setVisible(false);
      }
    };

    const handleClick = () => {
      if (pendingAnnotation) {
        setCurrentAnnotation(pendingAnnotation);
        setVisible(true);
        setPendingAnnotation(null);
      }
    };

    const handleDragEnd = () => {
      if (pendingAnnotation) {
        setCurrentAnnotation(pendingAnnotation);
        setVisible(true);
        setPendingAnnotation(null);
      }
    };

    const handleDragStart = () => {
      setPendingAnnotation(null);
      setVisible(false);
    };

    const handleUnselect = () => {
      console.log("unselect");
      setVisible(false);
      setCurrentAnnotation(null);
    };

    // Add event listeners
    editor
      .on("select", handleSelect)
      .on("click", handleClick)
      .on("dragend", handleDragEnd)
      .on("dragstart", handleDragStart)
      .on("unselect", handleUnselect);

    // Cleanup
    return () => {
      editor
        .off("select", handleSelect)
        .off("click", handleClick)
        .off("dragend", handleDragEnd)
        .off("dragstart", handleDragStart)
        .off("unselect", handleUnselect);
    };
  }, [editor, pendingAnnotation]);

  return <AnnotationPanel visible={visible} annotation={currentAnnotation} />;
};
