import Rtree, { BBox } from "rbush";
import { Store } from "../store";
import { Annotation, isBox, isText } from "../types";
import { getBbox, updateBbox } from "../utils";

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
    this.store.subscribe((state) => state.rotation, this.onRotationChange);

    this.polygons = [];
    this.layer = window.ogma.layers.addCanvasLayer((ctx) => {
      ctx.beginPath();
      this.polygons.forEach((p) => {
        ctx.moveTo(p[0].x, p[0].y);
        for (const pt of p) ctx.lineTo(pt.x, pt.y);
        ctx.lineTo(p[0].x, p[0].y);
      });
      ctx.stroke();
    });
  }

  private onRotationChange = (angle: number) => {
    const texts = this.store
      .getState()
      .getAllFeatures()
      .filter((feature) => isBox(feature));

    const sin = Math.sin(angle);
    const cos = Math.cos(angle);

    this.polygons = [];
    for (const text of texts) {
      this.remove(text);
      // counter rotate bbox around text center
      const [x0, y0, x1, y1] = getBbox(text);
      const cx = x0; //(x0 + x1) / 2;
      const cy = y0; //(y0 + y1) / 2;

      const corners = [
        { x: x0, y: y0 },
        { x: x1, y: y0 },
        { x: x1, y: y1 },
        { x: x0, y: y1 }
      ];
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      const poly = [];
      corners.forEach((corner) => {
        const dx = corner.x - cx;
        const dy = corner.y - cy;
        const x = cx + (dx * cos - dy * sin);
        const y = cy + (dx * sin + dy * cos);
        poly.push({ x, y });
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
        return { x, y };
      });
      this.polygons.push(poly);

      this.insert({
        ...text,
        bbox: [minX, minY, maxX, maxY]
      });
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
    return {
      minX: bbox[0],
      minY: bbox[1],
      maxX: bbox[2],
      maxY: bbox[3]
    };
  }

  query(bbox: BBox): Annotation[] {
    return super.search(bbox);
  }
}
