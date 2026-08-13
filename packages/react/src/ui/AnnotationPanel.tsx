import {
  Annotation,
  Arrow,
  Text,
  Polygon,
  isArrow,
  isText,
  isPolygon,
  isBox,
  isComment,
  defaultArrowStyle,
  defaultTextStyle
} from "@linkurious/ogma-annotations";
import {
  DEFAULT_PANEL_PLACEMENT,
  DEFAULT_PANEL_ORIENTATION,
  type PanelPlacement,
  type PanelOrientation
} from "@linkurious/ogma-annotations/ui";
import React from "react";
import {
  ColorController,
  BackgroundController,
  FontController,
  ExtremityController,
  SliderController,
  LineTypeController
} from "./controllers";

export interface AnnotationPanelProps {
  visible: boolean;
  annotation: Annotation | null;
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

export const AnnotationPanel: React.FC<AnnotationPanelProps> = ({
  visible,
  annotation,
  placement = DEFAULT_PANEL_PLACEMENT,
  orientation = DEFAULT_PANEL_ORIENTATION
}) => {

  const renderArrow = (arrow: Arrow) => {
    const s = arrow.properties.style || {};
    const currentColor = s.strokeColor || defaultArrowStyle.strokeColor!;
    return (
      <>
        <ColorController
          annotation={arrow}
          mode="arrow"
          initialColor={currentColor}
        />
        <ExtremityController annotation={arrow} />
        <SliderController
          annotation={arrow}
          title="Stroke width"
          property="strokeWidth"
          value={s.strokeWidth || defaultArrowStyle.strokeWidth!}
          min={1}
          max={20}
        />
        <LineTypeController
          annotation={arrow}
          currentLineType={s.strokeType || "plain"}
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
    const currentColor = s.color || defaultTextStyle.color!;
    return (
      <>
        <ColorController
          annotation={text}
          mode="text"
          initialColor={currentColor}
        />
        <BackgroundController
          annotation={text}
          currentBackground={s.background || defaultTextStyle.background!}
        />
        <FontController
          annotation={text}
          currentFont={s.font || defaultTextStyle.font!}
        />
        <SliderController
          annotation={text}
          title="Font size"
          property="fontSize"
          value={fontSize}
          min={8}
          max={72}
        />
        <SliderController
          annotation={text}
          title="Stroke width"
          property="strokeWidth"
          value={s.strokeWidth || defaultTextStyle.strokeWidth!}
          min={1}
          max={20}
          mode="text"
          currentColor={currentColor}
        />
        <LineTypeController
          annotation={text}
          currentLineType={s.strokeType || "plain"}
        />
      </>
    );
  };

  const renderPolygon = (polygon: Polygon) => {
    const s = polygon.properties.style || {};
    const currentColor = s.strokeColor || "#000000";
    return (
      <>
        <ColorController
          annotation={polygon}
          mode="polygon"
          initialColor={currentColor}
        />
        <BackgroundController
          annotation={polygon}
          currentBackground={s.background || "transparent"}
          title="Fill"
        />
        <SliderController
          annotation={polygon}
          title="Stroke width"
          property="strokeWidth"
          value={s.strokeWidth || 2}
          min={1}
          max={20}
        />
        <LineTypeController
          annotation={polygon}
          currentLineType={s.strokeType || "plain"}
        />
      </>
    );
  };

  const stopEvent = React.useCallback((evt: React.SyntheticEvent) => {
    evt.stopPropagation();
  }, []);

  if (!visible || !annotation) return null;

  return (
    <div
      className="annotation-panel"
      data-placement={placement}
      data-orientation={orientation}
      onClick={stopEvent}
      onMouseDown={stopEvent}
      onMouseMove={stopEvent}
    >
      <div className="panel-body">
        {isArrow(annotation) && renderArrow(annotation)}
        {(isText(annotation) || isBox(annotation) || isComment(annotation)) &&
          renderText(annotation as Text)}
        {isPolygon(annotation) && renderPolygon(annotation)}
      </div>
    </div>
  );
};
