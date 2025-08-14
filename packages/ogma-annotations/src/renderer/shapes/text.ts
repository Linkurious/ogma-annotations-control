import { View } from "@linkurious/ogma";
import { getTransformMatrix } from "./utils";
import { defaultStyle as defaultTextStyle } from "../../Editor/Texts/defaults";
import { Text } from "../../types";
import { createSVGElement, getTextSize } from "../../utils";

export function renderText(root: SVGElement, annotation: Text, view: View) {
  const id = annotation.id;
  const className = `class${id}`;
  const size = getTextSize(annotation);

  // TODO: edited element is rendered in DOM
  //if (id === this.selectedId) continue;

  const {
    color = defaultTextStyle.color,
    fontSize = defaultTextStyle.fontSize,
    font = defaultTextStyle.font,
    strokeColor = defaultTextStyle.strokeColor,
    strokeWidth = defaultTextStyle.strokeWidth,
    strokeType = defaultTextStyle.strokeType,
    background,
    borderRadius
  } = annotation.properties.style || defaultTextStyle;
  const g = createSVGElement<SVGGElement>("g");
  g.classList.add("annotation-text");
  g.setAttribute("fill", `${color}`);
  g.setAttribute("font-size", `${fontSize}px`);
  g.setAttribute("font-family", `${font}`);

  // rect is used for background and stroke
  const rect = createSVGElement<SVGRectElement>("rect");

  if (borderRadius) {
    rect.setAttribute("rx", `${borderRadius}`);
    rect.setAttribute("ry", `${borderRadius}`);
  }
  let addRect = false;
  if (strokeType && strokeType !== "none") {
    addRect = true;
    rect.setAttribute("stroke", strokeColor || "black");
    rect.setAttribute("stroke-width", `${strokeWidth}`);
    if (strokeType === "dashed") {
      rect.setAttribute("stroke-dasharray", `5,5`);
    }
  }
  if ((background && background.length) || addRect) {
    addRect = true;
    rect.setAttribute("fill", background || "transparent");
  }
  if (addRect) {
    rect.setAttribute("width", `${size.width}`);
    rect.setAttribute("height", `${size.height}`);
  }
  g.appendChild(rect);
  //this.drawContent(annotation, g);
  g.setAttribute("transform", getTransformMatrix(annotation, view));
  g.classList.add(className);
  g.setAttribute("data-annotation", `${annotation.id}`);
  g.setAttribute("data-annotation-type", annotation.properties.type);
  root.appendChild(g);
}
