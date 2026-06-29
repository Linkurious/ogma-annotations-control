import { Extremity, Arrow } from "@linkurious/ogma-annotations";
import { EXTREMITY_OPTIONS, type IconName } from "@linkurious/ogma-annotations/ui";
import React, { useState } from "react";
import { useAnnotationsContext } from "../../types";
import { Icon } from "../Icon";

interface ExtremityControllerProps {
  annotation: Arrow;
}

export const ExtremityController: React.FC<ExtremityControllerProps> = ({
  annotation
}) => {
  const { editor } = useAnnotationsContext();
  const [openDropdowns, setOpenDropdowns] = useState<Set<string>>(new Set());

  const handleExtremitySelect = (end: "head" | "tail", value: string) => {
    if (annotation) {
      editor?.updateStyle(annotation.id, { [end]: value as Extremity });
    }
    setOpenDropdowns((prev) => {
      const next = new Set(prev);
      next.delete(end);
      return next;
    });
  };

  const toggleDropdown = (end: "head" | "tail") => {
    setOpenDropdowns((prev) => {
      const next = new Set(prev);
      if (next.has(end)) next.delete(end);
      else {
        next.clear();
        next.add(end);
      }
      return next;
    });
  };

  const renderExtremitySelector = (side: "head" | "tail") => {
    const ext = annotation.properties.style?.[side] || "none";
    const opts = EXTREMITY_OPTIONS.map((o) => ({
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
    const isOpen = openDropdowns.has(side);

    return (
      <div className="extremity-wrapper">
        <label>{side}</label>
        <div className={`custom-select ${isOpen ? "open" : ""}`}>
          <div
            className="custom-select-trigger"
            onClick={() => toggleDropdown(side)}
          >
            <Icon name={selected.icon as IconName} rotate={selected.rotate} />
            <span>{selected.label}</span>
            <Icon name="chevron-down" className="custom-select-arrow" />
          </div>
          <div className="custom-select-options">
            {opts.map((option) => (
              <div
                key={option.value}
                className={`custom-select-option ${option.selected ? "selected" : ""}`}
                title={option.label}
                onClick={() => handleExtremitySelect(side, option.value)}
              >
                <Icon name={option.icon as IconName} rotate={option.rotate} />
                <span>{option.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
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
