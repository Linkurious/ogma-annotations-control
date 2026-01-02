import React, { useState, useEffect } from "react";
import {
  Annotation,
  Arrow,
  Text,
  Polygon,
  isArrow,
  isText,
  isPolygon,
  defaultArrowStyle,
  defaultTextStyle,
  isBox,
  isComment
} from "@linkurious/ogma-annotations";
import { useAnnotationsContext } from "../../../src";
import {
  ColorController,
  BackgroundController,
  FontController,
  ExtremityController,
  SliderController,
  LineTypeController
} from "./controllers";
import "./AnnotationPanel.css";

type AnnotationMode = "arrow" | "text" | "polygon" | null;

interface AnnotationPanelProps {
  visible: boolean;
  annotation: Annotation | null;
}

export const AnnotationPanel: React.FC<AnnotationPanelProps> = ({
  visible,
  annotation
}) => {
  const { editor } = useAnnotationsContext();
  const [mode, setMode] = useState<AnnotationMode>(null);

  useEffect(() => {
    if (annotation) {
      if (isArrow(annotation)) {
        setMode("arrow");
      } else if (isText(annotation) || isBox(annotation)) {
        setMode("text");
      } else if (isPolygon(annotation)) {
        setMode("polygon");
      }
    } else {
      setMode(null);
    }
  }, [annotation]);

  const getColorForMode = () => {
    if (!annotation) return "#0099FF";

    if (mode === "arrow") {
      return (
        annotation.properties.style?.strokeColor ||
        defaultArrowStyle.strokeColor!
      );
    } else if (mode === "text") {
      return annotation.properties.style?.color || defaultTextStyle.color!;
    } else if (mode === "polygon") {
      return annotation.properties.style?.strokeColor || "#000000";
    }

    return "#0099FF";
  };

  const renderArrow = (arrow: Arrow) => {
    const s = arrow.properties.style || {};
    const strokeWidth = s.strokeWidth || defaultArrowStyle.strokeWidth!;
    const strokeType = s.strokeType || "plain";
    const currentColor = getColorForMode();

    return (
      <>
        <ColorController
          annotation={annotation}
          mode="arrow"
          initialColor={currentColor}
        />
        <ExtremityController annotation={arrow} />
        <SliderController
          annotation={annotation}
          title="Stroke width"
          property="strokeWidth"
          value={strokeWidth}
          min={1}
          max={20}
        />
        <LineTypeController
          annotation={annotation}
          currentLineType={strokeType}
        />
      </>
    );
  };

  const renderText = (text: Text) => {
    const s = text.properties.style || {};
    const fontSize =
      typeof s.fontSize === "number"
        ? s.fontSize
        : typeof defaultTextStyle.fontSize === "number"
          ? defaultTextStyle.fontSize
          : 18;
    const strokeWidth = s.strokeWidth || defaultTextStyle.strokeWidth!;
    const strokeType = s.strokeType || "plain";
    const background = s.background || defaultTextStyle.background!;
    const font = s.font || defaultTextStyle.font!;
    const currentColor = getColorForMode();

    return (
      <>
        <ColorController
          annotation={annotation}
          mode="text"
          initialColor={currentColor}
        />
        <BackgroundController
          annotation={annotation}
          currentBackground={background}
        />
        <FontController annotation={annotation} currentFont={font} />
        <SliderController
          annotation={annotation}
          title="Font size"
          property="fontSize"
          value={fontSize}
          min={8}
          max={72}
        />
        <SliderController
          annotation={annotation}
          title="Stroke width"
          property="strokeWidth"
          value={strokeWidth}
          min={1}
          max={20}
          mode="text"
          currentColor={currentColor}
        />
        <LineTypeController
          annotation={annotation}
          currentLineType={strokeType}
        />
      </>
    );
  };

  const renderPolygon = (polygon: Polygon) => {
    const s = polygon.properties.style || {};
    const strokeWidth = s.strokeWidth || 2;
    const strokeType = s.strokeType || "plain";
    const background = s.background || "transparent";
    const currentColor = getColorForMode();

    return (
      <>
        <ColorController
          annotation={annotation}
          mode="polygon"
          initialColor={currentColor}
        />
        <BackgroundController
          annotation={annotation}
          currentBackground={background}
        />
        <SliderController
          annotation={annotation}
          title="Stroke width"
          property="strokeWidth"
          value={strokeWidth}
          min={1}
          max={20}
        />
        <LineTypeController
          annotation={annotation}
          currentLineType={strokeType}
        />
      </>
    );
  };

  const stopEvent = React.useCallback((evt: React.SyntheticEvent) => {
    evt.stopPropagation();
  }, []);

  if (!visible || !annotation) {
    return null;
  }

  console.log("Rendering AnnotationPanel for mode:", mode, annotation);

  return (
    <div
      className="annotation-panel"
      onClick={stopEvent}
      onMouseDown={stopEvent}
      onMouseMove={stopEvent}
    >
      <div className="panel-body">
        {mode === "arrow" && isArrow(annotation) && renderArrow(annotation)}
        {mode === "text" &&
          (isText(annotation) || isBox(annotation) || isComment(annotation)) &&
          renderText(annotation as Text)}
        {mode === "polygon" &&
          isPolygon(annotation) &&
          renderPolygon(annotation)}
      </div>
    </div>
  );
};
