import { AnnotationState } from "../../store";
import { Arrow, Extremity, Id, Point, defaultArrowStyle } from "../../types";
import { createSVGElement, getArrowEndPoints } from "../../utils";
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

function createDom(elt: SVGGElement | undefined, id: Id): SVGGElement {
  if (!elt) {
    elt = createSVGElement<SVGGElement>("g");
    const path = createSVGElement<SVGPathElement>("path");
    elt.classList.add("annotation-arrow");
    elt.setAttribute("data-annotation", `${id}`);
    elt.setAttribute("data-annotation-type", "arrow");
    elt.appendChild(path);
    const endpointsGroup = createSVGElement<SVGGElement>("g");
    endpointsGroup.classList.add("annotation-arrow-endpoints");
    elt.appendChild(endpointsGroup);
  }
  return elt;
}

/**
 * @function draw
 * @param arrow The arrow to draw
 * @param g the group in which to draw
 */
export function renderArrow(
  root: SVGGElement,
  arrow: Arrow,
  minArrowHeight: number,
  maxArrowHeight: number,
  chachedElement: SVGGElement | undefined,
  state: AnnotationState
) {
  const { start, end } = getArrowEndPoints(arrow);
  const {
    tail,
    head,
    strokeColor,
    strokeWidth = 0
  } = arrow.properties.style || defaultArrowStyle;
  const vec = subtract(end, start);
  const tipLength = getArrowHeight(arrow, minArrowHeight, maxArrowHeight);

  const lineGroup = createDom(chachedElement, arrow.id);
  const path = lineGroup.firstChild as SVGPathElement;

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

  const endpointsGroup = lineGroup.children[1] as SVGGElement;
  endpointsGroup.innerHTML = "";

  addExtremity(endpointsGroup, start, color, tail, strokeWidth);
  addExtremity(endpointsGroup, end, color, head, strokeWidth);
  lineGroup.setAttribute(
    "transform",
    `rotate(${-state.rotation * (180 / Math.PI)})`
  );
  root.appendChild(lineGroup);
  return lineGroup;
}

function addExtremity(
  lineGroup: SVGGElement,
  point: Point,
  color: string,
  type: Extremity | undefined,
  strokeWidth: number
) {
  if (type === "halo-dot")
    addDot(
      lineGroup,
      point,
      getHaloColor(color),
      HALO_OPACITY,
      strokeWidth * 4
    );
  if (type === "dot" || type === "halo-dot")
    addDot(lineGroup, point, color, 1, strokeWidth * 2);
}

function getHaloColor(color: string) {
  if (color === "none") return "none";
  return color;
}

function addDot(
  lineGroup: SVGGElement,
  point: Point,
  color: string,
  opacity: number,
  size: number
) {
  const circle = createSVGElement<SVGCircleElement>("circle");
  circle.setAttribute("cx", `${point.x}`);
  circle.setAttribute("cy", `${point.y}`);
  circle.setAttribute("r", `${size}`);
  circle.setAttribute("fill-opacity", `${opacity}`);
  circle.setAttribute("fill", color);
  lineGroup.appendChild(circle);
}
