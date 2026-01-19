import { Annotation, parseColor } from "@linkurious/ogma-annotations";
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  RgbaColor,
  RgbaColorPicker
} from "vanilla-colorful/rgba-color-picker.js";
import { useAnnotationsContext } from "../../../../src";

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
  const [currentColor, setCurrentColor] = useState(initialColor);
  const [recentColors, setRecentColors] = useState([
    "#0099FF",
    "#FF7523",
    "#44AA99"
  ]);
  const [activeColorIndex, setActiveColorIndex] = useState(0);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const colorPickerRef = useRef<HTMLDivElement>(null);
  const colorPickerInstance = useRef<RgbaColorPicker | null>(null);

  const updateAnnotationColor = useCallback(
    (color: string) => {
      if (!annotation) return;

      if (mode === "arrow") {
        editor?.updateStyle(annotation.id, { strokeColor: color });
      } else if (mode === "text") {
        editor?.updateStyle(annotation.id, { color: color });
      } else if (mode === "polygon") {
        editor?.updateStyle(annotation.id, { strokeColor: color });
      }
    },
    [annotation, editor, mode]
  );

  const updateColorFromAnnotation = useCallback(
    (color: string) => {
      if (!recentColors.includes(color)) {
        const newColors = [color, ...recentColors.slice(0, 2)];
        setRecentColors(newColors);
        setActiveColorIndex(0);
      } else {
        setActiveColorIndex(recentColors.indexOf(color));
      }
      setCurrentColor(color);
    },
    [recentColors]
  );

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
        if (!isClickOnColorCircle) {
          setShowColorPicker(false);
        }
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
        const newRecentColors = [...recentColors];
        newRecentColors[activeColorIndex] = newColor;
        setRecentColors(newRecentColors);

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
  }, [
    showColorPicker,
    currentColor,
    activeColorIndex,
    recentColors,
    updateAnnotationColor,
    updateColorFromAnnotation
  ]);

  useEffect(() => {
    updateColorFromAnnotation(initialColor);
  }, [initialColor, updateColorFromAnnotation]);

  const handleColorCircleClick = (index: number, event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    const wasActive = activeColorIndex === index && showColorPicker;
    setActiveColorIndex(index);
    setCurrentColor(recentColors[index]);

    if (wasActive) {
      setShowColorPicker(false);
    } else if (showColorPicker) {
      setShowColorPicker(false);
      setTimeout(() => setShowColorPicker(true), 50);
    } else {
      updateAnnotationColor(recentColors[index]);
      setShowColorPicker(true);
    }
  };

  return (
    <>
      <div className="section-header">
        <h3>Color</h3>
      </div>
      <div className="color-selector">
        {recentColors.map((color, index) => (
          <button
            key={index}
            className={`color-circle ${index === activeColorIndex ? "color-circle-primary" : ""}`}
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

function rgbaToString(color: RgbaColor): string {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
}
