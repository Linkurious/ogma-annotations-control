import { Comment, Text } from "@linkurious/ogma-annotations";
import { FONTS, type IconName } from "@linkurious/ogma-annotations/ui";
import React, { useState } from "react";
import { useAnnotationsContext } from "@linkurious/ogma-annotations-react";
import { Icon } from "../Icon";

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
    if (annotation) editor?.updateStyle(annotation.id, { font: fontValue });
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
          <button
            type="button"
            className="custom-select-trigger"
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-label={`Font: ${selected.label}`}
            onClick={() => setIsOpen(!isOpen)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setIsOpen(false);
            }}
          >
            <Icon name={selected.icon as IconName} />
            <span>{selected.label}</span>
            <Icon name="chevron-down" className="custom-select-arrow" />
          </button>
          <div
            className="custom-select-options"
            role="listbox"
            aria-label="Font options"
          >
            {FONTS.map((font) => (
              <button
                key={font.value}
                type="button"
                role="option"
                aria-selected={font.value === currentFont}
                className={`custom-select-option ${font.value === currentFont ? "selected" : ""}`}
                title={font.label}
                onClick={() => handleFontSelect(font.value)}
              >
                <Icon name={font.icon as IconName} />
                <span>{font.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};
