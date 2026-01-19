import { Store } from "../store";
import { Annotation, AnnotationCollection, Id } from "../types";

/**
 * Manages annotation selection state
 */
export class SelectionManager {
  constructor(private store: Store) {}

  /**
   * Select one or more annotations by id
   * @param annotations The id(s) of the annotation(s) to select
   */
  public select(annotations: Id | Id[]): void {
    const ids = Array.isArray(annotations) ? annotations : [annotations];
    this.store.getState().setSelectedFeatures(ids);
  }

  /**
   * Unselect one or more annotations, or all if no ids provided
   * @param annotations The id(s) of the annotation(s) to unselect, or undefined to unselect all
   */
  public unselect(annotations?: Id | Id[]): void {
    const ids = Array.isArray(annotations) ? annotations : [annotations];
    if (annotations === undefined) {
      this.store.getState().setSelectedFeatures([]);
    } else {
      const filter = new Set(ids);
      const toSelect = Array.from(
        this.store.getState().selectedFeatures
      ).filter((id) => !filter.has(id));
      this.store.getState().setSelectedFeatures(toSelect);
    }
  }

  /**
   * Get the currently selected annotations as a collection
   * @returns A FeatureCollection of selected annotations
   */
  public getSelectedAnnotations(): AnnotationCollection {
    const state = this.store.getState();
    return {
      type: "FeatureCollection",
      features: Array.from(state.selectedFeatures).map(
        (id) => state.features[id]
      )
    };
  }

  /**
   * Get the first selected annotation (for backwards compatibility)
   * @returns The currently selected annotation, or null if none selected
   */
  public getSelected(): Annotation | null {
    const state = this.store.getState();
    const firstId = Array.from(state.selectedFeatures)[0];
    return firstId ? state.features[firstId] : null;
  }
}
