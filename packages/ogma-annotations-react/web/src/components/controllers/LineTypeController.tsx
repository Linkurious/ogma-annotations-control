import { Arrow } from "@linkurious/ogma-annotations";
import React from "react";
import { useAnnotationsContext } from "../../../../src";

const LINE_TYPES = [
  { value: "plain", icon: "icon-circle" },
  { value: "dashed", icon: "icon-circle-dashed" }
];

interface LineTypeControllerProps {
  annotation: Arrow;
  currentLineType: string;
}

export const LineTypeController: React.FC<LineTypeControllerProps> = ({
  annotation,
  currentLineType
}) => {
  const { editor } = useAnnotationsContext();

  const handleLineTypeClick = (lineType: "plain" | "dashed") => {
    if (annotation) {
      editor?.updateStyle(annotation.id, { strokeType: lineType });
    }
  };

  return (
    <>
      <div className="section-header">
        <h3>Line type</h3>
      </div>
      <div className="linetype-section">
        {LINE_TYPES.map(({ value, icon }) => (
          <button
            key={value}
            className={`linetype-button ${currentLineType === value ? "active" : ""}`}
            title={value}
            onClick={() => handleLineTypeClick(value as "plain" | "dashed")}
          >
            <i className={icon}></i>
          </button>
        ))}
      </div>
    </>
  );
};
