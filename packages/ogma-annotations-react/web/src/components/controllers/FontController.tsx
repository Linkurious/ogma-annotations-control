import { Comment, Text } from "@linkurious/ogma-annotations";
import React, { useState } from "react";
import { useAnnotationsContext } from "../../../../src";

const FONTS = [
  { value: "sans-serif", label: "Sans Serif", icon: "icon-type" },
  { value: "serif", label: "Serif", icon: "icon-italic" },
  { value: "monospace", label: "Monospace", icon: "icon-code" }
];

interface FontControllerProps {
  annotation: Comment | Text;
  currentFont: string;
}

export const FontController: React.FC<FontControllerProps> = ({
  annotation,
  currentFont
}) => {
  const { editor } = useAnnotationsContext();
  const [isOpen, setIsOpen] = useState(false);

  const handleFontSelect = (fontValue: string) => {
    if (annotation) {
      editor?.updateStyle(annotation.id, { font: fontValue });
    }
    setIsOpen(false);
  };

  const selected = FONTS.find((f) => f.value === currentFont) || FONTS[0];

  return (
    <>
      <div className="section-header">
        <h3>Font</h3>
      </div>
      <div className="custom-select-section">
        <div className={`custom-select ${isOpen ? "open" : ""}`}>
          <div
            className="custom-select-trigger"
            onClick={() => setIsOpen(!isOpen)}
          >
            <i className={selected.icon}></i>
            <span>{selected.label}</span>
            <i className="icon-chevron-down custom-select-arrow"></i>
          </div>
          <div className="custom-select-options">
            {FONTS.map((font) => (
              <div
                key={font.value}
                className={`custom-select-option ${font.value === currentFont ? "selected" : ""}`}
                title={font.label}
                onClick={() => handleFontSelect(font.value)}
              >
                <i className={font.icon}></i>
                <span>{font.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};
