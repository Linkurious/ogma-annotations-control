import Rtree, { BBox } from "rbush";
import { Store } from "../store";
import { Annotation, Comment, Text, isComment, isText } from "../types";
import { getBbox, updateBbox, getBoxCenter, getBoxSize } from "../utils/utils";

const bboxCache: BBox = { minX: 0, minY: 0, maxX: 0, maxY: 0 };

const compareId = (a: Annotation, b: Annotation) => a.id === b.id;

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
        Object.values(features).forEach((feature) => {
          if (isText(feature) || isComment(feature))
            this.updateRotatedText(feature);
          else this.insert(feature);
        });
      }
    );

    // Update index when live updates are committed (features are modified)
    this.store.subscribe(
      (state) => ({
        features: state.features,
        isDragging: state.isDragging,
        lastChangedFeatures: state.lastChangedFeatures,
        rotation: state.rotation
      }),
      (current, previous) => {
        // Only update when dragging stops (live updates are committed)
        if (previous && previous.isDragging && !current.isDragging) {
          // Efficiently update only changed features instead of rebuilding entire index
          if (current.lastChangedFeatures.length > 0) {
            current.lastChangedFeatures.forEach((id) => {
              // Insert updated version
              const newFeature = current.features[id];
              if (newFeature) {
                updateBbox(newFeature);
                if (isText(newFeature) || isComment(newFeature))
                  this.updateRotatedText(newFeature);
                else {
                  this.remove(newFeature, compareId);
                  this.insert(newFeature);
                }
              }
            });
          }
        }
      },
      { equalityFn: (a, b) => a.isDragging === b.isDragging }
    );
    this.store.subscribe((state) => state.rotation, this.onRotationChange);
    this.store.subscribe((state) => state.zoom, this.onZoomChange);
  }

  private onRotationChange = () => {
    const texts = this.store
      .getState()
      .getAllFeatures()
      .filter((feature) => isText(feature) || isComment(feature));

    for (const text of texts) this.updateRotatedText(text as Text);
  };

  private onZoomChange = () => {
    const fixedSizeTexts = this.store
      .getState()
      .getAllFeatures()
      .filter(
        (feature) =>
          (isText(feature) || isComment(feature)) &&
          feature.properties.style?.fixedSize
      );

    for (const text of fixedSizeTexts) this.updateRotatedText(text as Text);
  };

  private updateRotatedText(text: Text | Comment) {
    const state = this.store.getState();
    this.remove(text, compareId);

    // Get bbox from center + dimensions (works with Point geometry)
    const center = getBoxCenter(text);
    let { width, height } = getBoxSize(text);

    // For fixed-size text, the world-space dimensions change with zoom
    const isFixedSize = text.properties.style?.fixedSize === true;
    if (isFixedSize) {
      const invZoom = state.invZoom;
      width *= invZoom;
      height *= invZoom;
    }

    const hw = width / 2;
    const hh = height / 2;

    // Calculate rotated AABB
    const raabb = state.getRotatedBBox(
      center.x - hw,
      center.y - hh,
      center.x + hw,
      center.y + hh
    );

    this.insert({
      ...text,
      // raabb is cached, we need to copy it
      geometry: { ...text.geometry, bbox: raabb.slice() }
    } as Text);
  }

  compareMinX(a: Annotation, b: Annotation): number {
    return getBbox(a)[0] - getBbox(b)[0];
  }

  compareMinY(a: Annotation, b: Annotation): number {
    return getBbox(a)[1] - getBbox(b)[1];
  }

  // insert(item: Annotation) {
  //   console.log(item.properties.type, "---", item.id, item.geometry.bbox);
  //   return super.insert(item);
  // }

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
