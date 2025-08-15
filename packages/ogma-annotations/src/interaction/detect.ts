import Rtree, { BBox } from "rbush";
import { Store } from "../store";
import { Annotation, Arrow, Box, isArrow, Point, Text, Vector } from "../types";
import { getArrowEndPoints, getBbox } from "../utils";
import { dot, length, subtract, normalize, cross } from "../vec";

class Index extends Rtree<Annotation> {
  compareMinX(a: Annotation, b: Annotation): number {
    return getBbox(a)[0] - getBbox(b)[0];
  }
  compareMinY(a: Annotation, b: Annotation): number {
    return getBbox(a)[1] - getBbox(b)[1];
  }
  toBBox(item: Annotation): BBox {
    const bbox = getBbox(item as Box | Text);
    return {
      minX: bbox[0],
      minY: bbox[1],
      maxX: bbox[2],
      maxY: bbox[3]
    };
  }
}

export class HitDetector {
  private index = new Index();

  constructor(
    private hitThreshold: number,
    private store: Store
  ) {
    this.index = new Index();
    this.store.subscribe(
      (state) => state.features,
      (features) => {
        this.index.clear();
        Object.values(features).forEach((feature) =>
          this.index.insert(feature)
        );
      }
    );
  }

  detect(x: number, y: number, threshold = 0): Annotation | null {
    let result: Annotation | null = null;
    // broad phase
    const hit = this.index.search({
      minX: x - threshold,
      minY: y - threshold,
      maxX: x + threshold,
      maxY: y + threshold
    });
    if (hit.length === 0) return null;
    console.log(" ------ broad phase hit:", hit);
    // narrow phase
    for (const item of hit) {
      if (isArrow(item)) {
        if (this.detectArrow(item, { x, y }, threshold)) {
          result = item;
          break;
        }
      } else result = item;
    }
    return result;
  }

  detectArrow(a: Arrow, point: Point, threshold: number): boolean {
    const { start, end } = getArrowEndPoints(a);
    // p is the vector from mouse pointer to the center of the arrow
    const p: Vector = subtract(point, start);
    // detect if point is ON the line between start and end.
    // line width is the arrow width
    const width = a.properties.style!.strokeWidth!;
    const vec = subtract(end, start);

    const lineLen = length(vec);
    const proj = dot(p, normalize(vec));
    return (
      proj > 0 &&
      proj < lineLen &&
      Math.abs(cross(p, normalize(vec))) < width / 2 + threshold
    );
  }
}
