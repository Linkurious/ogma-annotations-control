import React, { useState, useRef, useEffect } from "react";
import "./Slider.css";

interface SliderProps {
  min: number;
  max: number;
  step?: number;
  initialValue?: number;
  onChange: (value: number) => void;
}

export const Slider: React.FC<SliderProps> = ({
  min,
  max,
  step = 1,
  initialValue = min,
  onChange
}) => {
  const [value, setValue] = useState(initialValue);
  const sliderRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    updateKnobPosition(value);
  }, [value]);

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (event: MouseEvent) => {
    if (sliderRef.current) {
      const rect = sliderRef.current.getBoundingClientRect();
      let newValue = Math.min(
        Math.max(
          min,
          ((event.clientX - rect.left) / rect.width) * (max - min) + min
        ),
        max
      );
      // take step into account
      const remainder = newValue % step;
      if (remainder !== 0) {
        if (remainder < step / 2) newValue -= remainder;
        else newValue += step - remainder;
      }
      setValue(newValue);
      onChange(newValue);
    }
  };

  const handleMouseUp = () => {
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  const updateKnobPosition = (value: number) => {
    if (sliderRef.current && knobRef.current) {
      const percentage = ((value - min) / (max - min)) * 100;
      knobRef.current.style.left = `calc(${percentage}% - ${knobRef.current.offsetWidth / 2}px)`;
    }
  };

  return (
    <div className="slider-container" ref={sliderRef}>
      <div className="slider-track"></div>
      <div className="slider-knob" ref={knobRef} onMouseDown={handleMouseDown}>
        {Math.round(value)}
      </div>
    </div>
  );
};
