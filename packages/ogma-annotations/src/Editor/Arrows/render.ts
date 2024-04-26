import { Arrow, ArrowStyles, Extremity, Point } from "../../types";
import { createSVGElement, getArrowEndPoints } from "../../utils";
import {
  subtract,
  length,
  invert,
  rotateRadians,
  normalize,
  mul,
  add,
} from "../../vec";

/**
 * @function getArrowHeight
 * @param arrow The arrow to measure
 * @returns The height of the bounding box of the arrow
 */
export function getArrowHeight(arrow: Arrow, min = 5, max = 30): number {
  const { start, end } = getArrowEndPoints(arrow);
  const vec = subtract(end, start);
  const strokeW =
    arrow.properties.style && arrow.properties.style.strokeWidth
      ? arrow.properties.style?.strokeWidth
      : 0;
  return Math.min(max, Math.max(3 * strokeW, length(vec) * 0.1, min));
}

/**
 * @function drawExt
 * @param point The extremity position
 * @param vec The arrow vector (end-start)
 * @param type The type of extremity
 * @param height The height of the arrow
 */
function drawExt(
  point: Point,
  vec: Point,
  type: Extremity | undefined,
  height: number
): string {
  const delta = mul(invert(normalize(vec)), height);
  if (!type || type === "none") return "";
  const p1 = add(point, rotateRadians(delta, Math.PI / 8));
  const p2 = add(point, rotateRadians(delta, -Math.PI / 8));

  const pt = `${point.x} ${point.y}`;
  return `M ${p1.x} ${p1.y} L ${pt} ${p2.x} ${p2.y} ${
    type === "arrow" ? "" : `${p1.x} ${p1.y}`
  }`;
}

/**
 * @function draw
 * @param arrow The arrow to draw
 * @param g the group in which to draw
 */
export default function draw(
  arrow: Arrow,
  g: SVGGElement,
  defaultStyle: ArrowStyles,
  minArrowHeight: number,
  maxArrowHeight: number
) {
  const { start, end } = getArrowEndPoints(arrow);
  const { tail, head, strokeColor, strokeWidth } =
    arrow.properties.style || defaultStyle;
  const vec = subtract(end, start);
  const tipLength = getArrowHeight(arrow, minArrowHeight, maxArrowHeight);
  const path = createSVGElement<SVGPathElement>("path");
  path.setAttribute("data-annotation", `${arrow.id}`);
  path.setAttribute("data-annotation-type", "arrow");
  const filled = head === "arrow-plain" || tail === "arrow";
  path.setAttribute("stroke", strokeColor || "none");
  path.setAttribute("stroke-width", `${strokeWidth}`);
  path.setAttribute("fill", filled ? strokeColor || "" : "none");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  const headD = drawExt(start, invert(vec), tail, tipLength);
  const tailD = drawExt(end, vec, head, tipLength);
  const d = headD + `M ${start.x} ${start.y} ${end.x} ${end.y}` + tailD;
  path.setAttribute("d", d);
  g.appendChild(path);
}
