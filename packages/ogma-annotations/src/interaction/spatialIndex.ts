import Rtree, { BBox } from "rbush";
import { Store } from "../store";
import { Annotation, Text, isText } from "../types";
import { getBbox, updateBbox } from "../utils";

const bboxCache: BBox = { minX: 0, minY: 0, maxX: 0, maxY: 0 };

export class Index extends Rtree<Annotation> {
  private store: Store;

  constructor(store: Store) {
    super();
    this.store = store;

    // Rebuild index when features are added/removed
    this.store.subscribe(
      (state) => state.features,
      (features) => {
        this.clear();
        Object.values(features).forEach((feature) => this.insert(feature));
      }
    );

    // Update index when live updates are committed (features are modified)
    this.store.subscribe(
      (state) => ({
        features: state.features,
        isDragging: state.isDragging,
        lastChangedFeatures: state.lastChangedFeatures
      }),
      (current, previous) => {
        // Only update when dragging stops (live updates are committed)
        if (previous && previous.isDragging && !current.isDragging) {
          // Efficiently update only changed features instead of rebuilding entire index
          if (current.lastChangedFeatures.length > 0) {
            current.lastChangedFeatures.forEach((id) => {
              // Insert updated version
              const newFeature = current.features[id];
              updateBbox(newFeature);
              if (newFeature) {
                this.remove(newFeature);
                this.insert(newFeature);
              }
            });
          }
        }
      },
      { equalityFn: (a, b) => a.isDragging === b.isDragging }
    );
    this.store.subscribe(
      (state) => state.rotation,
      (angle) => {
        this.onRotationChange(angle);
      }
    );

    this.polygons = [];
    this.rects = [];
    this.layer = window.ogma.layers.addCanvasLayer((ctx) => {
      ctx.beginPath();
      this.polygons.forEach((p) => {
        ctx.moveTo(p[0].x, p[0].y);
        for (const pt of p) ctx.lineTo(pt.x, pt.y);
        ctx.lineTo(p[0].x, p[0].y);
      });
      this.rects.forEach((r) => {
        ctx.moveTo(r[0], r[1]);
        ctx.rect(r[0], r[1], r[2] - r[0], r[3] - r[1]);
      });
      ctx.stroke();
    });
  }

  private onRotationChange = () => {
    const state = this.store.getState();
    const texts = state.getAllFeatures().filter((feature) => isText(feature));

    this.polygons = [];
    for (const text of texts) {
      this.remove(text, (a, b) => a.id === b.id);
      // counter rotate bbox around text corner
      const [x0, y0, x1, y1] = getBbox(text);
      const raabb = state.getRotatedBBox(x0, y0, x1, y1);

      this.polygons.push([
        { x: raabb[0], y: raabb[1] },
        { x: raabb[2], y: raabb[1] },
        { x: raabb[2], y: raabb[3] },
        { x: raabb[0], y: raabb[3] }
      ]);

      this.insert({
        ...text,
        geometry: { ...text.geometry, bbox: raabb }
      } as Text);
    }
  };

  compareMinX(a: Annotation, b: Annotation): number {
    return getBbox(a)[0] - getBbox(b)[0];
  }

  compareMinY(a: Annotation, b: Annotation): number {
    return getBbox(a)[1] - getBbox(b)[1];
  }

  toBBox(item: Annotation): BBox {
    const bbox = getBbox(item);
    bboxCache.minX = bbox[0];
    bboxCache.minY = bbox[1];
    bboxCache.maxX = bbox[2];
    bboxCache.maxY = bbox[3];
    return bboxCache;
  }

  query(bbox: BBox): Annotation[] {
    return super.search(bbox);
  }
}
