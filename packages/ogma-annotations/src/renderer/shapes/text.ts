import Textbox from "@borgar/textbox";
import { renderBox } from "./box";
import { AnnotationState } from "../../store";
import { Box, Text, defaultTextStyle } from "../../types";
import { getBoxPosition, getTextSize } from "../../utils";

export function renderText(
  root: SVGElement,
  annotation: Text,
  cachedElement: SVGGElement | undefined,
  state: AnnotationState
) {
  const size = getTextSize(annotation);
  //const position = getBoxPosition(annotation);

  // TODO: edited element is rendered in DOM
  //if (id === this.selectedId) continue;

  const {
    color = defaultTextStyle.color,
    strokeColor = defaultTextStyle.strokeColor,
    strokeWidth = defaultTextStyle.strokeWidth,
    strokeType = defaultTextStyle.strokeType,
    background,
    borderRadius
  } = annotation.properties.style || defaultTextStyle;

  const g = renderBox(root, annotation as unknown as Box, cachedElement, state);
  g.setAttribute("data-annotation-type", annotation.properties.type);
  g.classList.add("annotation-text");
  g.setAttribute("fill", `${color}`);

  for (const child of g.children) {
    if (child.tagName !== "rect") g.removeChild(child);
  }
  // rect is used for background and stroke
  const rect = g.firstChild as SVGRectElement;

  if (borderRadius) {
    rect.setAttribute("rx", `${borderRadius}`);
    rect.setAttribute("ry", `${borderRadius}`);
  }

  if (strokeType && strokeType !== "none") {
    rect.setAttribute("stroke", strokeColor || "black");
    rect.setAttribute("stroke-width", `${strokeWidth}`);
    if (strokeType === "dashed") rect.setAttribute("stroke-dasharray", `5,5`);
  }
  if (background && background.length) {
    rect.setAttribute("fill", background || "transparent");
  }
  rect.setAttribute("width", `${size.width}`);
  rect.setAttribute("height", `${size.height}`);
  const position = getBoxPosition(annotation);
  rect.setAttribute("x", `0`);
  rect.setAttribute("y", `0`);

  drawContent(annotation, g);

  g.setAttribute(
    "transform",
    state.getScreenAlignedTransform(position.x, position.y)
  );

  root.appendChild(g);
  return g;
}

const removeEllipsis = (str: string) => str.replace(/…$/, "");
const getText = (e: Element) => e.children[0].innerHTML;

/**
 * @function draw
 * @param annotation the annotation to draw
 * @param g the group in which the text should be drawn
 */
function drawContent(annotation: Text, parent: SVGGElement) {
  // make sure text does not overflow
  const size = getTextSize(annotation);
  const {
    fontSize = defaultTextStyle.fontSize,
    font = defaultTextStyle.font,
    padding = 0
  } = annotation.properties.style || {};

  if (size.width === size.height && size.width === 0) return;

  const box = new Textbox({
    font: `${fontSize}px/${fontSize}px ${font}`.replace(/(px)+/g, "px"),
    width: size.width - padding * 2,
    height: size.height - padding * 2,
    align: "left",
    valign: "top",
    x: 0,
    overflow: "ellipsis",
    parser: "html",
    createElement: Textbox.createElement
  });
  box.overflowWrap("break-word");

  const content = annotation.properties.content || "";
  if (content.length === 0) return;

  const lines = box.linebreak(content.replaceAll("\n", "<br>"));
  const text = lines.render();
  const children = [...text.children];
  // remove extra blank lines
  let index = 0;
  const toRemove: number[] = [];
  content.split("\n").forEach((l) => {
    let query = l;
    while (query.length && index < children.length) {
      if (children[index].innerHTML === "&nbsp;") {
        if (!query.startsWith("\n")) toRemove.push(index);
        index++;
        break;
      }
      const text = removeEllipsis(getText(children[index]));
      if (query.startsWith(text)) query = query.slice(text.length).trim();
      index++;
    }
  });

  toRemove.forEach((i) => text.removeChild(children[i]));
  // replace spans with links:
  const matches = content.match(/(https?:\/\/.*)/gm);
  const links = matches ? matches.map((match) => match.split(" ")[0]) : [];
  text.setAttribute("transform", `translate(${padding}, ${padding})`);
  links.forEach((l) => {
    let query = l;
    const toReplace: typeof children = [];
    while (query.length > 0) {
      const start = children.find(
        (e) =>
          !!e.children[0] &&
          e.children[0].tagName === "tspan" &&
          query.startsWith(removeEllipsis(getText(e)))
      );
      if (!start) break;
      toReplace.push(start);
      const length = removeEllipsis(start.children[0].innerHTML).length;
      if (!length) break;
      query = query.slice(length);
    }
    toReplace.forEach((e) => {
      const link = document.createElementNS("http://www.w3.org/2000/svg", "a");
      link.setAttribute("href", l);
      link.setAttribute("target", "_blank");
      link.innerHTML = getText(e);
      e.children[0].innerHTML = "";
      e.children[0].appendChild(link);
    });
  });
  parent.appendChild(text);
}
