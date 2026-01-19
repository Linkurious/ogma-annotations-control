import { Annotation } from "@linkurious/ogma-annotations";
import React from "react";
import { useAnnotationsContext } from "../../../../src";

const BACKGROUNDS = [
  { value: "#f5f5f5", style: "--circle-color: #f5f5f5;" },
  { value: "#EDE6FF", style: "--circle-color: #EDE6FF;" },
  {
    value: "transparent",
    style: "--circle-color: white; border: 2px dashed #ccc;"
  }
];

interface BackgroundControllerProps {
  annotation: Annotation;
  currentBackground: string;
}

export const BackgroundController: React.FC<BackgroundControllerProps> = ({
  annotation,
  currentBackground
}) => {
  const { editor } = useAnnotationsContext();

  const handleBackgroundClick = (backgroundColor: string) => {
    if (annotation) {
      editor?.updateStyle(annotation.id, { background: backgroundColor });
    }
  };

  return (
    <>
      <div className="section-header">
        <h3>Background</h3>
      </div>
      <div className="color-selector">
        {BACKGROUNDS.map(({ value, style }) => {
          const customStyle: React.CSSProperties & { [key: string]: string } =
            {};

          // Parse the style string to extract CSS custom properties
          if (style.includes("--circle-color:")) {
            const colorValue = style.split(":")[1].replace(";", "").trim();
            customStyle["--circle-color"] = colorValue;
          }
          if (style.includes("border:")) {
            const borderValue = style
              .split("border:")[1]
              .replace(";", "")
              .trim();
            customStyle.border = borderValue;
          }

          return (
            <button
              key={value}
              className={`color-circle ${value === currentBackground ? "color-circle-primary" : ""}`}
              onClick={() => handleBackgroundClick(value)}
            >
              <div className="color-inner" style={customStyle}></div>
            </button>
          );
        })}
      </div>
    </>
  );
};
