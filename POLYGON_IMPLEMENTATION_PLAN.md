# Polygon Annotation Implementation Plan

## Overview
Add a new "polygon" (or "shape") annotation type that can be drawn freehand and shares features with box annotations. Uses GeoJSON Polygon geometry.

## 1. Type Definitions

### Files to create/modify:
- `packages/ogma-annotations/src/types/features/Polygon.ts` (new file)
- `packages/ogma-annotations/src/types/index.ts` (export polygon types)

### Implementation:
```typescript
// Polygon.ts
import { Polygon as GeoJSONPolygon } from "geojson";
import { AnnotationFeature, AnnotationProps } from "./Annotation";
import { BoxStyle } from "./Box";

export interface PolygonProperties extends AnnotationProps {
  type: "polygon";
  style?: BoxStyle; // Reuse BoxStyle (background, stroke, padding, etc.)
}

export type Polygon = AnnotationFeature<GeoJSONPolygon, PolygonProperties>;

export const isPolygon = (
  a: AnnotationFeature<Geometry, AnnotationProps>
): a is Polygon => a.properties.type === "polygon";

export function detectPolygon(
  polygon: Polygon,
  point: Point,
  threshold: number = 0
): boolean {
  // Point-in-polygon detection using ray casting algorithm
  // Check if point is inside polygon or within threshold of edges
}

export function createPolygon(
  coordinates: [number, number][][],
  properties?: Partial<PolygonProperties>
): Polygon {
  // Create polygon with proper bbox calculation
}
```

## 2. Drawing Handler

### Files to create/modify:
- `packages/ogma-annotations/src/handlers/drawPolygon.ts` (new file)
- `packages/ogma-annotations/src/handlers/index.ts` (export handler)

### Implementation:
```typescript
// drawPolygon.ts
export class DrawPolygon extends Handler {
  private points: Point[] = [];
  private isDrawing = false;

  // Mouse down: start drawing or add point
  // Mouse move: update preview of current segment
  // Mouse up: finalize point
  // Double-click or Escape: finish polygon
  // Minimum 3 points required

  // Features:
  // - Freehand drawing (collect points as user drags)
  // - Click-to-add-points mode (optional)
  // - Auto-close polygon when near start point
  // - Smooth/simplify path (optional - Douglas-Peucker algorithm)
}
```

## 3. Renderer

### Files to create/modify:
- `packages/ogma-annotations/src/renderer/shapes/polygon.ts` (new file)
- `packages/ogma-annotations/src/renderer/shapes/index.ts` (render polygons)

### Implementation:
```typescript
// polygon.ts
export function renderPolygon(
  root: SVGGElement,
  polygon: Polygon,
  existingElement: SVGGElement | undefined,
  state: State
): SVGGElement {
  // Create/update SVG polygon element
  // Apply BoxStyle (fill, stroke, strokeWidth, etc.)
  // Handle selection/hover states
  // Apply bbox for hit detection

  const element = existingElement || createSVGElement<SVGGElement>("g");
  const polygonPath = element.querySelector("polygon") ||
    createSVGElement<SVGPolygonElement>("polygon");

  // Convert coordinates to points string
  const points = polygon.geometry.coordinates[0]
    .map(([x, y]) => `${x},${y}`)
    .join(" ");

  polygonPath.setAttribute("points", points);
  // Apply styles...

  return element;
}
```

Update `src/renderer/shapes/index.ts`:
```typescript
// In render loop, add polygon rendering:
else if (isPolygon(feature))
  existingElement = renderPolygon(
    annotationsRoot,
    feature,
    existingElement,
    state
  );
```

## 4. Manipulation Handlers

### Files to create/modify:
- `packages/ogma-annotations/src/handlers/dragPolygon.ts` (new file)
- `packages/ogma-annotations/src/handlers/resizePolygon.ts` (new file)

### Implementation:

**dragPolygon.ts:**
- Move entire polygon by translating all coordinates
- Update bbox during drag
- Similar to dragBox but update all polygon points

**resizePolygon.ts:**
- Show vertex handles at each polygon point
- Allow dragging individual vertices to reshape
- Add midpoint handles between vertices to add new points
- Delete vertex on double-click (minimum 3 points)
- Update bbox after resize

## 5. Detection and Spatial Indexing

### Files to modify:
- `packages/ogma-annotations/src/interaction/spatialIndex.ts`

### Implementation:
- Add polygon features to R-tree using their bbox
- Point-in-polygon detection for selection
- Edge proximity detection for snapping (reuse edge snapping logic)

## 6. Link Support

### Files to modify:
- `packages/ogma-annotations/src/links.ts`
- `packages/ogma-annotations/src/handlers/snapping.ts`

### Implementation:
- Allow arrows to link to polygon edges (similar to box)
- Calculate magnet points on polygon perimeter
- Edge snapping for polygon sides
- Update link positions when polygon is resized/moved

## 7. Utility Functions

### Files to create/modify:
- `packages/ogma-annotations/src/utils/polygon.ts` (new file)
- `packages/ogma-annotations/src/utils/index.ts` (export utilities)

### Implementation:
```typescript
// polygon.ts
export function getPolygonBounds(polygon: Polygon): BBox {
  // Calculate bounding box from coordinates
}

export function getPolygonCenter(polygon: Polygon): Point {
  // Calculate centroid
}

export function translatePolygon(
  polygon: Polygon,
  dx: number,
  dy: number
): Polygon {
  // Move all coordinates
}

export function simplifyPolygon(
  coordinates: [number, number][],
  tolerance: number
): [number, number][] {
  // Douglas-Peucker simplification for freehand smoothing
}

export function isPointInPolygon(
  point: Point,
  coordinates: [number, number][][]
): boolean {
  // Ray casting algorithm
}

export function distanceToPolygonEdge(
  point: Point,
  coordinates: [number, number][]
): number {
  // Minimum distance from point to any polygon edge
}
```

## 8. Control API Methods

### Files to modify:
- `packages/ogma-annotations/src/Control.ts`

### Implementation:
- Ensure `add()` handles polygon type
- Ensure `updateStyle()` works with polygons
- Ensure `setScale()` scales polygon coordinates
- Update event emissions to include polygons

## 9. Store Integration

### Files to modify:
- `packages/ogma-annotations/src/store/index.ts`

### Implementation:
- Add polygon to `Annotation` union type
- Ensure store methods handle polygon features
- Update bbox calculation for polygons
- History/undo support for polygon operations

## 10. Testing

### Files to create:
- `packages/ogma-annotations/test/unit/polygon.test.ts`
- `packages/ogma-annotations/test/unit/drawPolygon.test.ts`
- `packages/ogma-annotations/test/unit/dragPolygon.test.ts`
- `packages/ogma-annotations/test/unit/resizePolygon.test.ts`

### Test coverage:
- Creating polygons with various coordinate sets
- Point-in-polygon detection
- Bbox calculation
- Drawing and finalizing polygons
- Dragging polygons
- Resizing vertices
- Adding/removing vertices
- Linking arrows to polygon edges
- Style updates
- Serialization/deserialization

## 11. Example Integration

### Files to modify:
- `packages/ogma-annotations/web/main.ts`

### Add drawing mode:
```typescript
// Add polygon drawing button
document.getElementById("draw-polygon")?.addEventListener("click", () => {
  editor.setMode("draw-polygon");
});

// Add example polygon to test data
const examplePolygon = createPolygon(
  [[[100, 100], [200, 80], [250, 150], [180, 200], [100, 180], [100, 100]]],
  { style: { strokeColor: "purple", background: "rgba(128,0,128,0.1)" } }
);
```

## Implementation Order

1. **Phase 1: Core Types & Utilities**
   - Create Polygon type definition
   - Implement utility functions (bbox, centroid, detection)
   - Add polygon to type system
   - **Why first**: Foundation needed by all other components

2. **Phase 2: Rendering**
   - Create polygon renderer
   - Integrate into shapes renderer
   - Test basic polygon display with manually created data
   - **Why before drawing**: Need to see polygons to verify drawing works

3. **Phase 3: Drawing**
   - Implement DrawPolygon handler
   - Add freehand drawing support
   - Add path simplification
   - **Why after rendering**: Drawing creates data that must be rendered

4. **Phase 4: Manipulation**
   - Implement drag handler
   - Implement vertex resize handler
   - Add vertex add/remove functionality
   - **Why after drawing**: Need drawn polygons to manipulate

5. **Phase 5: Integration**
   - Add to spatial index
   - Integrate with link system
   - Add snapping support
   - **Why later**: Advanced features built on stable foundation

6. **Phase 6: Testing & Polish**
   - Write comprehensive unit tests
   - Add example to demo
   - Update documentation
   - **Why last**: Verify complete implementation

## Technical Considerations

### GeoJSON Polygon Format
```typescript
{
  type: "Feature",
  geometry: {
    type: "Polygon",
    coordinates: [
      [[x1, y1], [x2, y2], [x3, y3], ..., [x1, y1]] // Exterior ring (closed)
      // Optional: [[...], [...]] // Interior rings (holes)
    ],
    bbox: [minX, minY, maxX, maxY]
  },
  properties: {
    type: "polygon",
    style: { ... }
  }
}
```

### Drawing Modes
- **Freehand**: Collect points as mouse moves (high frequency)
- **Click-to-add**: Add vertex on each click (precise)
- **Hybrid**: Freehand while dragging, click-to-add otherwise

### Simplification
Use Douglas-Peucker algorithm to reduce points from freehand drawing while preserving shape.

### Performance
- Simplify paths during drawing to reduce point count
- Use bbox for broad-phase collision detection
- Cache polygon centroid and bounds

### Edge Cases
- Minimum 3 points required for valid polygon
- Self-intersecting polygons allowed or prevented?
- Holes/interior rings supported initially or later?
- Maximum number of vertices?

## Future Enhancements
- Multi-polygon support (holes)
- Polygon boolean operations (union, difference, intersection)
- Convert box to polygon and vice versa
- Smart shape recognition (detect rectangles, circles)
- Bezier curve support for smooth shapes
