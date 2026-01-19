import React from "react";
import { ColorPicker } from "./ColorPicker";
import { useAnnotationsContext, fontSizes, fonts } from "../../../src";

const fontOptions = fonts.map((f) => ({ value: f, label: f }));
const fontSizeOptions = fontSizes.map((v) => ({ value: `${v}`, label: v }));

export const TextSettings = () => {
  const { textStyle, setTextStyle } = useAnnotationsContext();

  function setFont(font: string) {
    setTextStyle({ ...textStyle, font });
  }

  function setSize(f: string) {
    setTextStyle({ ...textStyle, fontSize: parseFloat(f) });
  }

  function setBgColor(background: string) {
    setTextStyle({ ...textStyle, background });
  }

  function setTextColor(color: string) {
    setTextStyle({ ...textStyle, color });
  }

  return (
    <span className="settings-panel">
      <h4>Font</h4>
      <select
        onChange={(evt) => setFont(evt.target.value)}
        value={textStyle.font}
      >
        {fontOptions.map((font) => (
          <option key={font.value} value={font.value}>
            {font.label}
          </option>
        ))}
      </select>
      <h4>Size</h4>
      <select
        onChange={(evt) => setSize(evt.target.value)}
        value={textStyle.fontSize?.toString() || ""}
      >
        {fontSizeOptions.map((fontSize) => (
          <option key={fontSize.value} value={fontSize.value}>
            {fontSize.label}
          </option>
        ))}
      </select>
      <h4>Color</h4>
      <ColorPicker color={textStyle.color} setColor={(c) => setTextColor(c)} />
      <h4>Background</h4>
      <ColorPicker
        hasTransparent={true}
        color={textStyle.background}
        setColor={(c) => setBgColor(c)}
      />
    </span>
  );
};
