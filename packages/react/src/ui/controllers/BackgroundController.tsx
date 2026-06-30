import { Annotation } from "@linkurious/ogma-annotations";
import { BACKGROUNDS } from "@linkurious/ogma-annotations/ui";
import React from "react";
import { useAnnotationsContext } from "@linkurious/ogma-annotations-react";

interface BackgroundControllerProps {
  annotation: Annotation;
  currentBackground: string;
  /** Heading for the section ("Background" for text, "Fill" for polygons). */
  title?: string;
}

export const BackgroundController: React.FC<BackgroundControllerProps> = ({
  annotation,
  currentBackground,
  title = "Background"
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
        <h3>{title}</h3>
      </div>
      <div className="color-selector">
        {BACKGROUNDS.map(({ value, style }) => {
          const customStyle: React.CSSProperties & { [key: string]: string } =
            {};
          if (style.includes("--circle-color:")) {
            customStyle["--circle-color"] = style
              .split("--circle-color:")[1]
              .split(";")[0]
              .trim();
          }
          if (style.includes("border:")) {
            customStyle.border = style
              .split("border:")[1]
              .replace(";", "")
              .trim();
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
