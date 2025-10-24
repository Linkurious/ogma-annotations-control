import { Position } from "geojson";
import { AnnotationState } from "../../store";
import { AnnotationType } from "../../types";
import { Polygon, defaultPolygonStyle } from "../../types/features/Polygon";
import { createSVGElement } from "../../utils";

/**
 * Convert polygon coordinates to a smooth SVG path using Catmull-Rom splines
 */
function pointsToSmoothPath(coords: Position[], tension: number = 0.5): string {
  if (coords.length < 3) {
    // Not enough points for smoothing, use straight lines
    return (
      coords
        .map((xy, i) => `${i === 0 ? "M" : "L"}${xy[0]},${xy[1]}`)
        .join(" ") + " Z"
    );
  }

  const points = coords; // Remove closing duplicate point
  const N = points.length - 1;
  const path: string[] = [];

  // Need to loop through all N points to create N curve segments (including closing segment)
  for (let i = 0; i < N; i++) {
    const p0 = points[(i - 1 + N) % N];
    const p1 = points[i];
    const p2 = points[(i + 1) % N];
    const p3 = points[(i + 2) % N];

    // Calculate control points using Catmull-Rom to Bézier conversion
    const cp1x = p1[0] + ((p2[0] - p0[0]) / 6) * tension;
    const cp1y = p1[1] + ((p2[1] - p0[1]) / 6) * tension;
    const cp2x = p2[0] - ((p3[0] - p1[0]) / 6) * tension;
    const cp2y = p2[1] - ((p3[1] - p1[1]) / 6) * tension;

    if (i === 0) {
      path.push(`M${p1[0]},${p1[1]}`);
    }

    path.push(`C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]}`);
  }

  return path.join(" ");
}

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

  // Get or create the path element (use path instead of polygon for smooth curves)
  let polygonPath = g.querySelector("path") as SVGPathElement | null;
  if (!polygonPath) {
    polygonPath = createSVGElement<SVGPathElement>("path");
    g.appendChild(polygonPath);
  }

  // Convert coordinates to smooth SVG path
  const coords = polygon.geometry.coordinates[0]; // Exterior ring
  const smoothPath = pointsToSmoothPath(coords, 0.5);

  polygonPath.setAttribute("d", smoothPath);

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
