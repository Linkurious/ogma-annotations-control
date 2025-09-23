import { View } from "@linkurious/ogma";
import { defaultStyle as defaultBoxStyle } from "../../Editor_old/Box/defaults";
import { Box } from "../../types";
import { createSVGElement, getBoxSize } from "../../utils";

export function renderBox(
  root: SVGElement,
  annotation: Box,
  view: View,
  _elt: SVGGElement | undefined
) {
  const id = annotation.id;
  const className = `class${id}`;
  const size = getBoxSize(annotation);

  // TODO: edited element is rendered in DOM
  //if (this.store.getState().id === this.selectedId) continue;

  const { strokeColor, strokeWidth, strokeType, background, borderRadius } =
    annotation.properties.style || defaultBoxStyle;
  const g = createSVGElement<SVGGElement>("g");
  g.classList.add("annotation-box");
  g.setAttribute("fill", `${background || "transparent"}`);

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
    if (strokeType === "dashed") rect.setAttribute("stroke-dasharray", `5,5`);
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

  g.setAttribute("transform", getRotationMatrix(-view.angle!, 0, 0));
  g.classList.add(className);
  g.setAttribute("data-annotation", `${annotation.id}`);
  g.setAttribute("data-annotation-type", annotation.properties.type);
  root.appendChild(g);
}

function getRotationMatrix(angle: number, cx: number, cy: number) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const tx = cx * (1 - cos) + cy * sin;
  const ty = cy * (1 - cos) - cx * sin;
  return `matrix(${cos}, ${sin}, ${-sin}, ${cos}, ${tx}, ${ty})`;
}
