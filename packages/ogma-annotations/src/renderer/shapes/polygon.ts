import { AnnotationState } from "../../store";
import { AnnotationType } from "../../types";
import { Polygon, defaultPolygonStyle } from "../../types/features/Polygon";
import { createSVGElement } from "../../utils";

const createDom = (
  elt: SVGGElement | undefined,
  id: string,
  type: AnnotationType = "box"
): SVGGElement => {
  if (!elt) {
    elt = createSVGElement<SVGGElement>("g");
    elt.setAttribute("data-annotation", `${id}`);
    elt.classList.add(`annotation-${type}`);
  }
  return elt;
};

export function renderPolygon(
  root: SVGGElement,
  polygon: Polygon,
  cachedElement: SVGGElement | undefined,
  state: AnnotationState
): SVGGElement {
  const g = createDom(
    cachedElement,
    polygon.id.toString(),
    polygon.properties.type
  );
  g.setAttribute("data-annotation", String(polygon.id));

  // Get or create the polygon path element
  let polygonPath = g.querySelector("polygon") as SVGPolygonElement | null;
  if (!polygonPath) {
    polygonPath = createSVGElement<SVGPolygonElement>("polygon");
    g.appendChild(polygonPath);
  }

  // Convert coordinates to SVG points string
  const coords = polygon.geometry.coordinates[0]; // Exterior ring
  const pointsString = coords.map((xy) => `${xy[0]},${xy[1]}`).join(" ");

  polygonPath.setAttribute("points", pointsString);

  // Apply styles
  const {
    strokeColor = defaultPolygonStyle.strokeColor,
    strokeWidth = defaultPolygonStyle.strokeWidth,
    background = defaultPolygonStyle.background,
    strokeType = defaultPolygonStyle.strokeType
  } = polygon.properties.style || defaultPolygonStyle;
  if (strokeColor) polygonPath.setAttribute("stroke", strokeColor);
  if (strokeWidth !== undefined)
    polygonPath.setAttribute("stroke-width", String(strokeWidth));
  if (background) polygonPath.setAttribute("fill", background);
  if (strokeType) polygonPath.setAttribute("stroke-dasharray", strokeType);

  g.setAttribute("transform", state.getRotationTransform(0, 0));

  // Append to root if not already there
  root.appendChild(g);

  return g;
}
