import Rtree, { BBox } from "rbush";
import { get } from "http";
import { Store } from "../store";
import { Annotation, Box, isArrow, isBox, Text } from "../types";
import { getBbox, updateBbox } from "../utils";

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

  detect(x: number, y: number): Annotation | null {
    const hit = this.index.search({
      minX: x - this.hitThreshold,
      minY: y - this.hitThreshold,
      maxX: x + this.hitThreshold,
      maxY: y + this.hitThreshold
    });
    return hit.length > 0 ? hit[0] : null;
  }
}
