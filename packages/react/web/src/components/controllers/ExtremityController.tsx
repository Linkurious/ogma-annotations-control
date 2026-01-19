import { Extremity, Arrow } from "@linkurious/ogma-annotations";
import React, { useState } from "react";
import { useAnnotationsContext } from "../../../../src";

const EXTREMITY_OPTIONS = [
  { value: "none", label: "None", icon: "icon-x" },
  { value: "arrow", label: "Open Arrow", icon: "icon-arrow-left" },
  { value: "arrow-plain", label: "Filled Arrow", icon: "icon-play" },
  { value: "halo-dot", label: "Halo Dot", icon: "icon-circle-dot" },
  { value: "dot", label: "Dot", icon: "icon-dot" }
];

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
      const newSet = new Set(prev);
      newSet.delete(end);
      return newSet;
    });
  };

  const toggleDropdown = (end: "head" | "tail") => {
    setOpenDropdowns((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(end)) {
        newSet.delete(end);
      } else {
        newSet.clear();
        newSet.add(end);
      }
      return newSet;
    });
  };

  const renderExtremitySelector = (side: "head" | "tail") => {
    const ext = annotation.properties.style?.[side] || "none";
    const opts = EXTREMITY_OPTIONS.map((o) => ({
      ...o,
      icon:
        o.value === "arrow" && side === "tail"
          ? "icon-arrow-left"
          : o.value === "arrow"
            ? "icon-arrow-right"
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
            <i
              className={selected.icon}
              style={selected.rotate ? { transform: "rotate(180deg)" } : {}}
            ></i>
            <span>{selected.label}</span>
            <i className="icon-chevron-down custom-select-arrow"></i>
          </div>
          <div className="custom-select-options">
            {opts.map((option) => (
              <div
                key={option.value}
                className={`custom-select-option ${option.selected ? "selected" : ""}`}
                title={option.label}
                onClick={() => handleExtremitySelect(side, option.value)}
              >
                <i
                  className={option.icon}
                  style={option.rotate ? { transform: "rotate(180deg)" } : {}}
                ></i>
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
