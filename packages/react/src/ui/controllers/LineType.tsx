import { Annotation } from "@linkurious/ogma-annotations";
import { LINE_TYPES, type IconName } from "@linkurious/ogma-annotations/ui";
import React from "react";
import { useAnnotationsContext } from "@linkurious/ogma-annotations-react";
import { Icon } from "../Icon";

interface LineTypeControllerProps {
  annotation: Annotation;
  currentLineType: string;
}

export const LineTypeController: React.FC<LineTypeControllerProps> = ({
  annotation,
  currentLineType
}) => {
  const { editor } = useAnnotationsContext();

  const handleLineTypeClick = (lineType: "plain" | "dashed") => {
    if (annotation) editor?.updateStyle(annotation.id, { strokeType: lineType });
  };

  return (
    <>
      <div className="section-header">
        <h3>Line type</h3>
      </div>
      <div className="linetype-section" role="group" aria-label="Line type">
        {LINE_TYPES.map(({ value, icon }) => (
          <button
            key={value}
            type="button"
            className={`linetype-button ${currentLineType === value ? "active" : ""}`}
            title={value}
            aria-label={`${value} line`}
            aria-pressed={currentLineType === value}
            onClick={() => handleLineTypeClick(value as "plain" | "dashed")}
          >
            <Icon name={icon as IconName} />
          </button>
        ))}
      </div>
    </>
  );
};
