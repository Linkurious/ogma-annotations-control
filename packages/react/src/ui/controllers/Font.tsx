import { Comment, Text } from "@linkurious/ogma-annotations";
import { FONTS, type IconName } from "@linkurious/ogma-annotations/ui";
import React, { useEffect, useRef, useState } from "react";
import { useAnnotationsContext } from "@linkurious/ogma-annotations-react";
import { Icon } from "../Icon";

interface FontControllerProps {
  annotation: Comment | Text;
  currentFont: string;
}

/**
 * ARIA "collapsible listbox" pattern (WAI-ARIA APG): the trigger opens a
 * `role="listbox"` popup and hands focus to it; inside, a roving `tabIndex`
 * (one option is `0`, the rest `-1`) plus Up/Down/Home/End moves a single
 * shared focus stop between options, matching what `role="listbox"`/
 * `role="option"` promise a screen reader. Mirrored in
 * `ExtremityController.tsx`.
 */
export const FontController: React.FC<FontControllerProps> = ({
  annotation,
  currentFont
}) => {
  const { editor } = useAnnotationsContext();
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const selected = FONTS.find((f) => f.value === currentFont) || FONTS[0];

  const close = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const open = () => {
    setActiveIndex(Math.max(FONTS.findIndex((f) => f.value === currentFont), 0));
    setIsOpen(true);
    // Actual focus move happens in the effect below, once the "open" class
    // (and so real visibility/focusability - the popup is `display: none`
    // until then) has actually committed to the DOM.
  };

  // Hands focus to the listbox right after it becomes visible - the button
  // for the option at `activeIndex` is unfocusable (display: none) until
  // this render commits the "open" class.
  useEffect(() => {
    if (isOpen) optionRefs.current[activeIndex]?.focus();
  }, [isOpen, activeIndex]);

  const moveActive = (index: number) => {
    const clamped = Math.max(0, Math.min(FONTS.length - 1, index));
    setActiveIndex(clamped);
    optionRefs.current[clamped]?.focus();
  };

  const handleFontSelect = (fontValue: string) => {
    if (annotation) editor?.updateStyle(annotation.id, { font: fontValue });
    close();
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      open();
    } else if (e.key === "Escape" && isOpen) {
      close();
    }
  };

  const handleOptionKeyDown = (e: React.KeyboardEvent, index: number) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        moveActive(index + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        moveActive(index - 1);
        break;
      case "Home":
        e.preventDefault();
        moveActive(0);
        break;
      case "End":
        e.preventDefault();
        moveActive(FONTS.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        handleFontSelect(FONTS[index].value);
        break;
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "Tab":
        // Let focus leave normally - just drop the visual open state.
        setIsOpen(false);
        break;
    }
  };

  return (
    <>
      <div className="section-header">
        <h3>Font</h3>
      </div>
      <div className="custom-select-section">
        <div className={`custom-select ${isOpen ? "open" : ""}`}>
          <button
            ref={triggerRef}
            type="button"
            className="custom-select-trigger"
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-label={`Font: ${selected.label}`}
            onClick={() => (isOpen ? close() : open())}
            onKeyDown={handleTriggerKeyDown}
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
            {FONTS.map((font, index) => (
              <button
                key={font.value}
                ref={(el) => {
                  optionRefs.current[index] = el;
                }}
                type="button"
                role="option"
                aria-selected={font.value === currentFont}
                tabIndex={index === activeIndex ? 0 : -1}
                className={`custom-select-option ${font.value === currentFont ? "selected" : ""}`}
                title={font.label}
                onClick={() => handleFontSelect(font.value)}
                onKeyDown={(e) => handleOptionKeyDown(e, index)}
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
