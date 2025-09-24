import { View } from "@linkurious/ogma";
import { getRotationMatrix } from "./utils";
import { defaultStyle as defaultBoxStyle } from "../../Editor_old/Box/defaults";
import { Box, Id, AnnotationType } from "../../types";
import { createSVGElement, getBoxPosition, getBoxSize } from "../../utils";

function createDom(
  elt: SVGGElement | undefined,
  id: Id,
  type: AnnotationType = "box"
): SVGGElement {
  if (!elt) {
    elt = createSVGElement<SVGGElement>("g");
    elt.setAttribute("data-annotation", `${id}`);
    elt.setAttribute("data-annotation-type", type);
    elt.classList.add(`annotation-${type}`);
    // rect is used for background and stroke
    const rect = createSVGElement<SVGRectElement>("rect");
    elt.appendChild(rect);
  }
  return elt;
}

export function renderBox(
  root: SVGElement,
  annotation: Box,
  view: View,
  cachedElement: SVGGElement | undefined
) {
  const id = annotation.id;
  const className = `class${id}`;
  const size = getBoxSize(annotation);

  const g = createDom(cachedElement, id, annotation.properties.type);
  const { strokeColor, strokeWidth, strokeType, background, borderRadius } =
    annotation.properties.style || defaultBoxStyle;
  g.classList.add("annotation-box");
  g.setAttribute("fill", `${background || "transparent"}`);

  // rect is used for background and stroke
  const rect = g.firstChild as SVGRectElement;

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
    const position = getBoxPosition(annotation);
    rect.setAttribute("width", `${size.width}`);
    rect.setAttribute("height", `${size.height}`);
    rect.setAttribute("x", `${position.x}`);
    rect.setAttribute("y", `${position.y}`);
  }
  g.appendChild(rect);

  g.setAttribute("transform", getRotationMatrix(-view.angle!, 0, 0));
  g.classList.add(className);
  g.setAttribute("data-annotation", `${annotation.id}`);
  g.setAttribute("data-annotation-type", annotation.properties.type);
  root.appendChild(g);
  return g;
}
