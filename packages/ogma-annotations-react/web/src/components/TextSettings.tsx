import { ColorPicker } from "./ColorPicker";
import { useAnnotationsContext } from "../../../src/AnnotationsContext";
import { fontSizes, fonts } from "../../../src/constants";

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
      <span>Font</span>
      <select
        onChange={(evt) => {
          setFont(evt.target.value as string);
        }}
        value={textStyle.font}
      >
        {fontOptions.map((font) => (
          <option key={font.value} value={font.value}>
            {font.label}
          </option>
        ))}
      </select>
      <span>Size</span>
      <select
        onChange={(evt) => setSize(evt.target.value)}
        value={textStyle.fontSize!.toString()}
      >
        {fontSizeOptions.map((fontSize) => (
          <option key={fontSize.value} value={fontSize.value}>
            {fontSize.label}
          </option>
        ))}
      </select>
      <span>Color</span>
      <ColorPicker color={textStyle.color} setColor={(c) => setTextColor(c)} />
      <span>Background</span>
      <ColorPicker
        hasTransparent={true}
        color={textStyle.background}
        setColor={(c) => setBgColor(c)}
      />
    </span>
  );
};
