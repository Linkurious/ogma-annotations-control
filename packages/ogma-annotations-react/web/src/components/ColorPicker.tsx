import React from "react";
import { defaultColors } from "../../../src/constants";
import "./ColorPicker.css";

type ColorPickerProps = {
  color?: string;
  hasTransparent?: boolean;
  setColor?: (c: string) => void;
};

export const ColorPicker = ({
  color,
  setColor,
  hasTransparent
}: ColorPickerProps) => {
  const [colors, setColors] = React.useState(defaultColors);
  React.useEffect(() => {
    if (hasTransparent) setColors(["none", ...defaultColors.slice(0, -1)]);
    else setColors([...defaultColors]);
  }, [hasTransparent]);
  const [selected, setSelected] = React.useState(color);
  return (
    <span className="colorpicker">
      {colors.map((c) => (
        <div
          key={c}
          className={c === selected ? "selected" : ""}
          style={{
            width: 12,
            height: 12,
            borderRadius: 10,
            backgroundColor: c === "none" ? "#fff" : c,
            margin: 5,
            cursor: "pointer"
          }}
          onClick={() => {
            setSelected(c);
            setColor && setColor(c);
          }}
        />
      ))}
    </span>
  );
};
