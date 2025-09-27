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
    this.store.subscribe((state) => state.rotation, this.onRotationChange);
  }

  private onRotationChange = () => {
    const state = this.store.getState();
    const texts = state.getAllFeatures().filter((feature) => isText(feature));

    for (const text of texts) {
      this.remove(text, (a, b) => a.id === b.id);
      // counter rotate bbox around text corner
      const [x0, y0, x1, y1] = getBbox(text);
      const raabb = state.getRotatedBBox(x0, y0, x1, y1);

      this.insert({
        ...text,
        // raabb is cached, we need to copy it
        geometry: { ...text.geometry, bbox: raabb.slice() }
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
