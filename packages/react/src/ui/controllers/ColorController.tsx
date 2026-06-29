import { Annotation, parseColor } from "@linkurious/ogma-annotations";
import {
  rgbaToString,
  initialRecentColors,
  withColorFromAnnotation,
  type RecentColorsState
} from "@linkurious/ogma-annotations/ui";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { RgbaColorPicker } from "vanilla-colorful/rgba-color-picker.js";
import { useAnnotationsContext } from "../../types";

interface ColorControllerProps {
  annotation: Annotation;
  mode: "arrow" | "text" | "polygon";
  initialColor: string;
}

export const ColorController: React.FC<ColorControllerProps> = ({
  annotation,
  mode,
  initialColor
}) => {
  const { editor } = useAnnotationsContext();
  const [recent, setRecent] = useState<RecentColorsState>(initialRecentColors);
  const [currentColor, setCurrentColor] = useState(initialColor);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const colorPickerRef = useRef<HTMLDivElement>(null);
  const colorPickerInstance = useRef<RgbaColorPicker | null>(null);

  const updateAnnotationColor = useCallback(
    (color: string) => {
      if (!annotation) return;
      if (mode === "text") {
        editor?.updateStyle(annotation.id, { color });
      } else {
        editor?.updateStyle(annotation.id, { strokeColor: color });
      }
    },
    [annotation, editor, mode]
  );

  // Sync the recent-colors strip with the selected annotation's color.
  useEffect(() => {
    setRecent((prev) => withColorFromAnnotation(prev, initialColor));
    setCurrentColor(initialColor);
  }, [initialColor]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showColorPicker &&
        colorPickerRef.current &&
        !colorPickerRef.current.contains(event.target as Node)
      ) {
        const colorCircles = document.querySelectorAll(".color-circle");
        const isClickOnColorCircle = Array.from(colorCircles).some((circle) =>
          circle.contains(event.target as Node)
        );
        if (!isClickOnColorCircle) setShowColorPicker(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showColorPicker]);

  useEffect(() => {
    if (
      showColorPicker &&
      colorPickerRef.current &&
      !colorPickerInstance.current
    ) {
      colorPickerInstance.current = new RgbaColorPicker();
      colorPickerInstance.current.color = parseColor(currentColor);
      colorPickerRef.current.appendChild(colorPickerInstance.current);

      colorPickerInstance.current.addEventListener("color-changed", (event) => {
        const newColor = rgbaToString(event.detail.value);
        setCurrentColor(newColor);
        setRecent((prev) => {
          const colors = [...prev.colors];
          colors[prev.activeIndex] = newColor;
          return { ...prev, colors };
        });
        updateAnnotationColor(newColor);
      });
    }

    if (
      !showColorPicker &&
      colorPickerInstance.current &&
      colorPickerRef.current
    ) {
      colorPickerRef.current.innerHTML = "";
      colorPickerInstance.current = null;
    }
  }, [showColorPicker, currentColor, updateAnnotationColor]);

  const handleColorCircleClick = (index: number, event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    const wasActive = recent.activeIndex === index && showColorPicker;
    setRecent((prev) => ({ ...prev, activeIndex: index }));
    setCurrentColor(recent.colors[index]);

    if (wasActive) {
      setShowColorPicker(false);
    } else if (showColorPicker) {
      setShowColorPicker(false);
      setTimeout(() => setShowColorPicker(true), 50);
    } else {
      updateAnnotationColor(recent.colors[index]);
      setShowColorPicker(true);
    }
  };

  return (
    <>
      <div className="section-header">
        <h3>Color</h3>
      </div>
      <div className="color-selector">
        {recent.colors.map((color, index) => (
          <button
            key={index}
            className={`color-circle ${index === recent.activeIndex ? "color-circle-primary" : ""}`}
            style={
              { "--circle-color": color } as React.CSSProperties & {
                "--circle-color": string;
              }
            }
            onClick={(e) => handleColorCircleClick(index, e)}
          >
            <div className="color-inner"></div>
          </button>
        ))}
      </div>

      {showColorPicker && (
        <div
          className="color-picker-overlay"
          ref={colorPickerRef}
          style={{
            position: "fixed",
            right: "240px",
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 10000
          }}
        />
      )}
    </>
  );
};
