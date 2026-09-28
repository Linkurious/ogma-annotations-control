import { Extremity, Arrow } from "@linkurious/ogma-annotations";
import { EXTREMITY_OPTIONS, type IconName } from "@linkurious/ogma-annotations/ui";
import React, { useEffect, useRef, useState } from "react";
import { useAnnotationsContext } from "@linkurious/ogma-annotations-react";
import { Icon } from "../Icon";

interface ExtremityControllerProps {
  annotation: Arrow;
}

interface ExtremityOption {
  value: string;
  label: string;
  icon: string;
  selected: boolean;
  rotate: boolean;
}

interface ExtremityDropdownProps {
  side: "head" | "tail";
  options: ExtremityOption[];
  selected: ExtremityOption;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onSelect: (value: string) => void;
}

/**
 * ARIA "collapsible listbox" pattern (WAI-ARIA APG): the trigger opens a
 * `role="listbox"` popup and hands focus to it; inside, a roving `tabIndex`
 * (one option is `0`, the rest `-1`) plus Up/Down/Home/End moves a single
 * shared focus stop between options, matching what `role="listbox"`/
 * `role="option"` promise a screen reader. Mirrored in `FontController.tsx`;
 * factored out here (rather than inlined per-side) since a component needs
 * its own hook state per instance, and this renders twice (head/tail).
 */
const ExtremityDropdown: React.FC<ExtremityDropdownProps> = ({
  side,
  options,
  selected,
  isOpen,
  onOpen,
  onClose,
  onSelect
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const open = () => {
    setActiveIndex(Math.max(options.findIndex((o) => o.selected), 0));
    onOpen();
  };

  const close = () => {
    onClose();
    triggerRef.current?.focus();
  };

  // Hands focus to the listbox right after it becomes visible - the option
  // buttons are unfocusable (display: none) until this render commits the
  // "open" class.
  useEffect(() => {
    if (isOpen) optionRefs.current[activeIndex]?.focus();
  }, [isOpen, activeIndex]);

  const moveActive = (index: number) => {
    const clamped = Math.max(0, Math.min(options.length - 1, index));
    setActiveIndex(clamped);
    optionRefs.current[clamped]?.focus();
  };

  const handleSelect = (value: string) => {
    onSelect(value);
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
        moveActive(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        handleSelect(options[index].value);
        break;
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "Tab":
        // Let focus leave normally - just drop the visual open state.
        onClose();
        break;
    }
  };

  return (
    <div className="extremity-wrapper">
      <label>{side}</label>
      <div className={`custom-select ${isOpen ? "open" : ""}`}>
        <button
          ref={triggerRef}
          type="button"
          className="custom-select-trigger"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label={`${side}: ${selected.label}`}
          onClick={() => (isOpen ? close() : open())}
          onKeyDown={handleTriggerKeyDown}
        >
          <Icon name={selected.icon as IconName} rotate={selected.rotate} />
          <span>{selected.label}</span>
          <Icon name="chevron-down" className="custom-select-arrow" />
        </button>
        <div
          className="custom-select-options"
          role="listbox"
          aria-label={`${side} options`}
        >
          {options.map((option, index) => (
            <button
              key={option.value}
              ref={(el) => {
                optionRefs.current[index] = el;
              }}
              type="button"
              role="option"
              aria-selected={option.selected}
              tabIndex={index === activeIndex ? 0 : -1}
              className={`custom-select-option ${option.selected ? "selected" : ""}`}
              title={option.label}
              onClick={() => handleSelect(option.value)}
              onKeyDown={(e) => handleOptionKeyDown(e, index)}
            >
              <Icon name={option.icon as IconName} rotate={option.rotate} />
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export const ExtremityController: React.FC<ExtremityControllerProps> = ({
  annotation
}) => {
  const { editor } = useAnnotationsContext();
  const [openSide, setOpenSide] = useState<"head" | "tail" | null>(null);

  const handleExtremitySelect = (end: "head" | "tail", value: string) => {
    if (annotation) {
      editor?.updateStyle(annotation.id, { [end]: value as Extremity });
    }
  };

  const renderExtremitySelector = (side: "head" | "tail") => {
    const ext = annotation.properties.style?.[side] || "none";
    const opts: ExtremityOption[] = EXTREMITY_OPTIONS.map((o) => ({
      ...o,
      icon:
        o.value === "arrow" && side === "tail"
          ? "arrow-left"
          : o.value === "arrow"
            ? "arrow-right"
            : o.icon,
      selected: o.value === ext,
      rotate: o.value === "arrow-plain" && side === "tail"
    }));
    const selected = opts.find((o) => o.selected) || opts[0];

    return (
      <ExtremityDropdown
        side={side}
        options={opts}
        selected={selected}
        isOpen={openSide === side}
        onOpen={() => setOpenSide(side)}
        onClose={() => setOpenSide(null)}
        onSelect={(value) => handleExtremitySelect(side, value)}
      />
    );
  };

  return (
    <>
      <div className="section-header">
        <h3>Extremities</h3>
      </div>
      <div className="custom-select-section">
        {renderExtremitySelector("head")}
        {renderExtremitySelector("tail")}
      </div>
    </>
  );
};
