import React from "react";
import { useAnnotationsContext } from "../../../../src";

interface SliderControllerProps {
  annotation: any;
  title: string;
  property: string;
  value: number;
  min: number;
  max: number;
  mode?: "arrow" | "text" | "polygon";
  currentColor?: string;
}

export const SliderController: React.FC<SliderControllerProps> = ({
  annotation,
  title,
  property,
  value,
  min,
  max,
  mode,
  currentColor
}) => {
  const { editor } = useAnnotationsContext();
  const [sliderValue, setSliderValue] = React.useState<number>(value);

  React.useEffect(() => {
    setSliderValue(value);
  }, [value]);

  const handleSliderChange = (newValue: number) => {
    if (!annotation) return;

    if (property === "strokeWidth") {
      if (mode === "text" && currentColor) {
        editor?.updateStyle(annotation.id, {
          strokeWidth: newValue,
          strokeColor: currentColor
        });
      } else {
        editor?.updateStyle(annotation.id, { strokeWidth: newValue });
      }
    } else if (property === "fontSize") {
      editor?.updateStyle(annotation.id, { fontSize: newValue });
    }
  };

  return (
    <>
      <div className="section-header">
        <h3>{title}</h3>
      </div>
      <div className="slider-section">
        <input
          type="range"
          id={`${property}-slider`}
          className="slider"
          min={min}
          max={max}
          value={sliderValue}
          onChange={(e) => {
            const newValue = parseInt(e.target.value, 10);
            setSliderValue(newValue);
            handleSliderChange(newValue);
          }}
        />
        <div className="slider-value">
          <span>{sliderValue}</span>
        </div>
      </div>
    </>
  );
};
