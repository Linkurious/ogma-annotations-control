import Rtree, { BBox } from "rbush";
import { Store } from "../store";
import { Annotation, Comment, Id, Text, isComment, isText } from "../types";
import { getBbox, updateBbox, getBoxCenter, getBoxSize } from "../utils/utils";

const compareId = (a: Annotation, b: Annotation) => a.id === b.id;

export class Index extends Rtree<Annotation> {
  private store: Store;

  constructor(store: Store) {
    super();
    this.store = store;

    // Rebuild index when features are added/removed
    this.store.subscribe((state) => state.features, this.rebuild);
    // isVisible is a function, not data - watch it separately so a fresh setOptions() call alone still re-indexes.
    this.store.subscribe(
      (state) => state.options.isVisible,
      () => this.rebuild(this.store.getState().features)
    );

    // Catch up once a drag ends if anything was deferred while it lasted.
    this.store.subscribe(
      (state) => state.isDragging,
      (isDragging) => {
        if (!isDragging && this.dirty) this.rebuild(this.store.getState().features);
      }
    );
    this.store.subscribe((state) => state.rotation, this.onRotationChange);
    this.store.subscribe((state) => state.zoom, this.onZoomChange);
  }

  /**
   * Re-indexing is skipped for the duration of a drag: commits keep
   * landing mid-gesture (e.g. LinkSync's debounced arrow commit while a node
   * with an attached comment is dragged), and each one would otherwise clear
   * and re-insert the whole tree - repeatedly, and re-entrantly when the
   * commit cascades into further feature updates. Hover detection is off
   * while dragging and snapping targets don't move mid-drag, so defer to
   * one rebuild at the end of the drag.
   */
  private dirty = false;

  private deferWhileDragging(): boolean {
    if (!this.store.getState().isDragging) return false;
    this.dirty = true;
    return true;
  }

  private onRotationChange = () => {
    if (this.deferWhileDragging()) return;
    const texts = this.store
      .getState()
      .getAllFeatures()
      .filter(
        (feature) =>
          (isText(feature) || isComment(feature)) && this.isVisible(feature)
      );

    for (const text of texts) this.updateRotatedText(text as Text);
  };

  private onZoomChange = () => {
    if (this.deferWhileDragging()) return;
    const fixedSizeTexts = this.store
      .getState()
      .getAllFeatures()
      .filter(
        (feature) =>
          (isText(feature) || isComment(feature)) &&
          feature.properties.style?.fixedSize &&
          this.isVisible(feature)
      );

    for (const text of fixedSizeTexts) this.updateRotatedText(text as Text);
  };

  private isVisible = (feature: Annotation): boolean =>
    this.store.getState().options.isVisible(feature);

  private rebuild = (features: Record<Id, Annotation>) => {
    if (this.deferWhileDragging()) return;
    this.dirty = false;
    this.clear();
    for (const feature of Object.values(features)) {
      if (!this.isVisible(feature)) continue;
      if (isText(feature) || isComment(feature)) this.updateRotatedText(feature);
      else {
        // Drag handlers spread the old geometry into their updates, so a
        // committed arrow/polygon can carry a stale cached bbox.
        updateBbox(feature);
        this.insert(feature);
      }
    }
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

  // Must return a fresh object: rbush's _insert holds on to the inserted
  // item's bbox across _split, which calls toBBox on the node's other
  // children - a shared, reused object would get overwritten underneath it
  // and _adjustParentBBoxes would then extend the path with the wrong box.
  toBBox(item: Annotation): BBox {
    const bbox = getBbox(item);
    return { minX: bbox[0], minY: bbox[1], maxX: bbox[2], maxY: bbox[3] };
  }

  query(bbox: BBox): Annotation[] {
    return super.search(bbox);
  }
}
