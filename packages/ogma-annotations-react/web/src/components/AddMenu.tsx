import { defaultArrowStyle, defaultTextStyle } from "../../../src/constants";
import { useOgma } from "@linkurious/ogma-react";
import { useAnnotationsContext } from "../../../src/AnnotationsContext";
import {
  createArrow,
  createText,
  isArrow,
  isText
} from "@linkurious/ogma-annotations";
import "../tooltip.css";
import { Text, ArrowRight, Download } from "iconoir-react";
import "./AddMenu.css";

export const AddMenu = () => {
  const { editor } = useAnnotationsContext();
  const ogma = useOgma();
  function addAnnotation(type: "arrow" | "text") {
    const opts = ogma.getOptions();
    ogma.setOptions({ cursor: { default: "crosshair" } });
    ogma.events.once("mousedown", (evt) => {
      const { x, y } = ogma.view.screenToGraphCoordinates(evt);
      const annotation =
        type === "arrow"
          ? createArrow(x, y, x, y, { ...defaultArrowStyle })
          : createText(x, y, 0, 0, "...", { ...defaultTextStyle });
      setTimeout(() => {
        if (isArrow(annotation)) editor.startArrow(x, y, annotation);
        if (isText(annotation)) editor.startText(x, y, annotation);
      }, 50);
      editor.once("add", () => {
        ogma.setOptions(opts);
      });
    });
  }

  function save() {
    // download the file
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([JSON.stringify(editor.getAnnotations())], {
        type: "text/plain"
      })
    );
    a.download = "annotations.json";
    a.click();
  }
  const buttonSize = 16;
  return (
    <div className="add-menu">
      <button data-tooltip="Add arrow" onClick={() => addAnnotation("arrow")}>
        <ArrowRight width={buttonSize} height={buttonSize} />
      </button>
      <button data-tooltip="Add text" onClick={() => addAnnotation("text")}>
        <Text width={buttonSize} height={buttonSize} />
      </button>
      <button data-tooltip="Download" onClick={() => save()}>
        <Download width={buttonSize} height={buttonSize} />
      </button>
    </div>
  );
};
