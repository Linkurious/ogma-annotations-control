import { Links } from "../links";
import { Store } from "../store";
import { Annotation, Arrow } from "../types";

export class Add {
  private links: Links;
  private store: Store;
  constructor(store: Store, links: Links) {
    this.store = store;
    this.links = links;
    this.store.subscribe((state) => state.features, this.onAddArrow);
  }

  private onAddArrow = (
    newFeatures: Record<string, Annotation>,
    prevFeatures: Record<string, Annotation>
  ) => {
    const state = this.store.getState();
    const oldIds = new Set(Object.keys(prevFeatures));
    const newIds = Object.keys(newFeatures).filter((id) => !oldIds.has(id));
    newIds.forEach((id) => {
      const feature = state.getFeature(id);
      if (!feature || feature.properties.type !== "arrow") return;
      const arrow = feature as Arrow;
      if (arrow.properties.link?.start) {
        this.links.add(
          arrow,
          "start",
          arrow.properties.link.start.id,
          arrow.properties.link.start.type,
          arrow.properties.link.start.magnet!
        );
      }
      if (arrow.properties.link?.end) {
        this.links.add(
          arrow,
          "end",
          arrow.properties.link.end.id,
          arrow.properties.link.end.type,
          arrow.properties.link.end.magnet!
        );
      }
    });
  };
}
