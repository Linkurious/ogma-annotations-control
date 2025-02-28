import Textbox from "@borgar/textbox";
import { Text } from "../../types";
import { getTextSize } from "../../utils";

function removeElipse(str: string): string {
  return str.replace(/…$/, "");
}

function getText(e: Element) {
  return e.children[0].innerHTML;
}
/**
 * @function draw
 * @param annotation the annotation to draw
 * @param g the group in which the text should be drawn
 */
export default function draw(annotation: Text, g: SVGGElement) {
  // make sure text does not overflow
  const size = getTextSize(annotation);
  const { fontSize, font, padding = 0 } = annotation.properties.style || {};

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

  const lines = box.linebreak(
    annotation.properties.content.replaceAll("\n", "<br>")
  );
  const text = lines.render();
  const children = [...text.children];
  // remove extra blank lines
  let index = 0;
  const toRemove: number[] = [];
  annotation.properties.content.split("\n").forEach((l) => {
    let query = l;
    while (query.length && index < children.length) {
      if (children[index].innerHTML === "&nbsp;") {
        if (!query.startsWith("\n")) toRemove.push(index);
        index++;
        break;
      }
      const text = removeElipse(getText(children[index]));
      if (query.startsWith(text)) {
        query = query.slice(text.length).trim();
      }
      index++;
    }
  });
  toRemove.forEach((i) => text.removeChild(children[i]));
  // replace spans with links:
  const matches = annotation.properties.content.match(/(https?:\/\/.*)/gm);
  const links = matches ? matches.map((match) => match.split(" ")[0]) : [];
  text.setAttribute("transform", `translate(${padding}, ${padding})`);
  links.forEach((l) => {
    let query = l;
    const toReplace = [];
    while (query.length > 0) {
      const start = children.find(
        (e) =>
          !!e.children[0] &&
          e.children[0].tagName === "tspan" &&
          query.startsWith(removeElipse(getText(e)))
      );
      if (!start) break;
      toReplace.push(start);
      const length = removeElipse(start.children[0].innerHTML).length;
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

  g.appendChild(text);
}
