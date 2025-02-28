import { Arrow, ArrowStyles, Extremity, Point } from "../../types";
import { colorToRgba, createSVGElement, getArrowEndPoints } from "../../utils";
import {
  subtract,
  length,
  invert,
  rotateRadians,
  normalize,
  mul,
  add
} from "../../vec";

const HALO_OPACITY = 0.5;

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
  return Math.min(max, Math.max(3 * strokeW, length(vec) * 0.01, min));
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
  if (!type || (type !== "arrow" && type !== "arrow-plain")) return "";
  const p1 = add(point, rotateRadians(delta, Math.PI / 10));
  const p2 = add(point, rotateRadians(delta, -Math.PI / 10));

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
  const {
    tail,
    head,
    strokeColor,
    strokeWidth = 0
  } = arrow.properties.style || defaultStyle;
  const vec = subtract(end, start);
  const tipLength = getArrowHeight(arrow, minArrowHeight, maxArrowHeight);
  const lineGroup = createSVGElement<SVGGElement>("g");
  const path = createSVGElement<SVGPathElement>("path");
  lineGroup.setAttribute("data-annotation", `${arrow.id}`);
  lineGroup.setAttribute("data-annotation-type", "arrow");

  const filled = head === "arrow-plain" || tail === "arrow";
  const color = strokeColor || "none";
  path.setAttribute("stroke", color);
  path.setAttribute("stroke-width", `${strokeWidth}`);
  path.setAttribute("fill", filled ? strokeColor || "" : "none");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");

  const headD = drawExt(start, invert(vec), tail, tipLength);
  const tailD = drawExt(end, vec, head, tipLength);

  const d = headD + `M ${start.x} ${start.y} ${end.x} ${end.y}` + tailD;
  path.setAttribute("d", d);
  lineGroup.appendChild(path);

  addExtremity(lineGroup, start, color, tail, strokeWidth);
  addExtremity(lineGroup, end, color, head, strokeWidth);
  g.appendChild(lineGroup);
}

function addExtremity(
  lineGroup: SVGGElement,
  point: Point,
  color: string,
  type: Extremity | undefined,
  strokeWidth: number
) {
  if (type === "halo-dot")
    addDot(lineGroup, point, getHaloColor(color), strokeWidth * 4);
  if (type === "dot" || type === "halo-dot")
    addDot(lineGroup, point, color, strokeWidth * 2);
}

function getHaloColor(color: string) {
  if (color === "none") return "none";
  return colorToRgba(color, HALO_OPACITY);
}

function addDot(
  lineGroup: SVGGElement,
  point: Point,
  color: string,
  size: number
) {
  const circle = createSVGElement<SVGCircleElement>("circle");
  circle.setAttribute("cx", `${point.x}`);
  circle.setAttribute("cy", `${point.y}`);
  circle.setAttribute("r", `${size}`);
  circle.setAttribute("fill", color);
  lineGroup.appendChild(circle);
}
