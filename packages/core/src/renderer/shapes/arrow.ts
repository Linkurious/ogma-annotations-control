import { isCommentArrow } from "../../handlers/commentHelpers";
import { AnnotationState } from "../../store";
import { Arrow, Extremity, Id, Point, defaultArrowStyle } from "../../types";
import { createSVGElement, getArrowEndPoints } from "../../utils/utils";
import {
  subtract,
  length,
  invert,
  rotateRadians,
  normalize,
  mul,
  add
} from "../../utils/vec";

const HALO_OPACITY = 0.5;

/**
 * @function getArrowHeight
 * @param arrow The arrow to measure
 * @returns The height of the bounding box of the arrow
 */
export function getArrowHeight(
  arrow: Arrow,
  strokeWidth: number,
  min: number,
  max: number
): number {
  const { start, end } = getArrowEndPoints(arrow);
  const vec = subtract(end, start);
  return Math.min(max, Math.max(2 * strokeWidth, length(vec) * 0.01, min));
}

/**
 * @function getExtremityOffset
 * @param type The extremity type
 * @param strokeWidth The stroke width
 * @returns The offset distance from the endpoint
 */
function getExtremityOffset(
  type: Extremity | undefined,
  strokeWidth: number
): number {
  if (!type || type === "none") return 0;
  if (type === "dot") return strokeWidth * 2;
  if (type === "halo-dot") return strokeWidth * 4;
  if (type === "arrow" || type === "arrow-plain") return strokeWidth;
  return 0;
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
 * @private
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
  const style = arrow.properties.style || defaultArrowStyle;
  const { tail, strokeWidth = 0, head, strokeColor, strokeType } = style;
  const vec = subtract(end, start);
  const zoom = isCommentArrow(arrow) ? 1 / state.zoom : 1;

  const tipLength =
    getArrowHeight(arrow, strokeWidth, minArrowHeight, maxArrowHeight) * zoom;

  const lineGroup = createDom(chachedElement, arrow.id);
  const path = lineGroup.firstChild as SVGPathElement;

  const color = strokeColor || "none";
  path.setAttribute("stroke", color);
  path.setAttribute("stroke-width", `${zoom * strokeWidth}`);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");

  // Calculate shortened line endpoints to avoid overlap with arrow heads
  const startOffset = getExtremityOffset(tail, strokeWidth * zoom);
  const endOffset = getExtremityOffset(head, strokeWidth * zoom);

  const vecNorm = normalize(vec);
  const adjustedStart = add(start, mul(vecNorm, startOffset));
  const adjustedEnd = add(end, mul(vecNorm, -endOffset));

  const d = `M ${adjustedStart.x} ${adjustedStart.y} L ${adjustedEnd.x} ${adjustedEnd.y}`;
  path.setAttribute("d", d);

  const endpointsGroup = lineGroup.children[1] as SVGGElement;
  endpointsGroup.innerHTML = "";

  if (strokeType === "dashed") path.setAttribute("stroke-dasharray", `5,10`);
  else path.removeAttribute("stroke-dasharray");

  addExtremity(
    endpointsGroup,
    start,
    vec,
    color,
    tail,
    strokeWidth,
    zoom,
    tipLength
  );
  addExtremity(
    endpointsGroup,
    end,
    invert(vec),
    color,
    head,
    strokeWidth,
    zoom,
    tipLength
  );
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
  vec: Point,
  color: string,
  type: Extremity | undefined,
  strokeWidth: number,
  zoom: number,
  tipLength: number
) {
  if (type === "halo-dot")
    addDot(
      lineGroup,
      point,
      getHaloColor(color),
      HALO_OPACITY,
      strokeWidth * zoom * 4
    );
  if (type === "dot" || type === "halo-dot")
    addDot(lineGroup, point, color, 1, strokeWidth * zoom * 2);
  if (type === "arrow" || type === "arrow-plain")
    addArrowHead(
      lineGroup,
      point,
      vec,
      color,
      type === "arrow-plain",
      strokeWidth * zoom,
      tipLength
    );
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

function addArrowHead(
  lineGroup: SVGGElement,
  point: Point,
  vec: Point,
  color: string,
  filled: boolean,
  strokeWidth: number,
  tipLength: number
) {
  const delta = mul(normalize(vec), tipLength);
  const p1 = add(point, rotateRadians(delta, Math.PI / 6));
  const p2 = add(point, rotateRadians(delta, -Math.PI / 6));

  const path = createSVGElement<SVGPathElement>("path");
  const pt = `${point.x} ${point.y}`;
  const d = `M ${p1.x} ${p1.y} L ${pt} L ${p2.x} ${p2.y}${filled ? " Z" : ""}`;

  path.setAttribute("d", d);
  path.setAttribute("stroke", color);
  path.setAttribute("stroke-width", `${strokeWidth}`);
  path.setAttribute("fill", filled ? color : "none");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");

  lineGroup.appendChild(path);
}
