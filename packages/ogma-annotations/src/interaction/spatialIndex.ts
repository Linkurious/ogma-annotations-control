import Rtree, { BBox } from "rbush";
import { Store } from "../store";
import { Annotation } from "../types";
import { getBbox } from "../utils";

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
            console.log(
              "Updating spatial index for changed features:",
              current.lastChangedFeatures
            );
            current.lastChangedFeatures.forEach((id) => {
              // Remove old version of the feature from index
              const oldFeature = previous.features[id];
              if (oldFeature) this.remove(oldFeature);

              // Insert updated version
              const newFeature = current.features[id];
              if (newFeature) this.insert(newFeature);
            });
          }
        }
      },
      { equalityFn: (a, b) => a.isDragging === b.isDragging }
    );
  }
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
