import { Position } from "geojson";
import { Store } from "../store";
import {
  Annotation,
  AnnotationCollection,
  Box,
  DeepPartial,
  Id,
  isAnnotationCollection,
  isArrow,
  isBox,
  isText
} from "../types";
import { migrateBoxOrTextIfNeeded } from "../utils/utils";

/**
 * Manages CRUD operations for annotations
 */
export class UpdateManager {
  constructor(private store: Store) {}

  /**
   * Add an annotation to the controller
   * @param annotation The annotation to add
   */
  public add(annotation: Annotation | AnnotationCollection): void {
    if (isAnnotationCollection(annotation)) {
      for (const feature of annotation.features) this.add(feature);
    } else {
      // Migrate old Polygon format to new Point format for Box/Text
      const migrated = migrateBoxOrTextIfNeeded(annotation);
      this.store.getState().addFeature(migrated);
    }
  }

  /**
   * Remove an annotation or an array of annotations from the controller
   * @param annotation The annotation(s) to remove
   */
  public remove(annotation: Annotation | AnnotationCollection): void {
    if (isAnnotationCollection(annotation)) {
      for (const feature of annotation.features) this.remove(feature);
    } else {
      this.store.getState().removeFeature(annotation.id);
    }
  }

  /**
   * Get all annotations in the controller
   * @returns A FeatureCollection containing all annotations
   */
  public getAnnotations(): AnnotationCollection {
    const features = this.store.getState().features;
    return {
      type: "FeatureCollection",
      features: Object.values(features)
    };
  }

  /**
   * Get a specific annotation by id
   * @param id The id of the annotation to retrieve
   * @returns The annotation with the given id, or undefined if not found
   */
  public getAnnotation<T = Annotation>(id: Id): T | undefined {
    return this.store.getState().getFeature(id) as T | undefined;
  }

  /**
   * Update the style of the annotation with the given id
   * @param id The id of the annotation to update
   * @param style The new style
   */
  public updateStyle<A extends Annotation>(
    id: Id,
    style: A["properties"]["style"]
  ): void {
    const feature = this.store.getState().getFeature(id);
    if (!feature) return;

    this.store.getState().updateFeature(id, {
      id,
      properties: {
        ...feature.properties,
        style: {
          ...feature.properties.style,
          ...style
        }
      }
    } as A);
  }

  /**
   * Update an annotation with partial updates
   *
   * This method allows you to update any properties of an annotation, including
   * geometry, properties, and style. Updates are merged with existing data.
   *
   * @param annotation Partial annotation object with id and properties to update
   *
   * @example
   * ```ts
   * // Update arrow geometry
   * controller.update({
   *   id: arrowId,
   *   geometry: {
   *     type: 'LineString',
   *     coordinates: [[0, 0], [200, 200]]
   *   }
   * });
   *
   * // Update text content and position
   * controller.update({
   *   id: textId,
   *   geometry: {
   *     type: 'Point',
   *     coordinates: [100, 100]
   *   },
   *   properties: {
   *     content: 'Updated text'
   *   }
   * });
   *
   * // Update style only (prefer updateStyle for style-only updates)
   * controller.update({
   *   id: boxId,
   *   properties: {
   *     style: {
   *       background: '#ff0000'
   *     }
   *   }
   * });
   * ```
   */
  public update<A extends Annotation>(
    annotation: DeepPartial<A> & { id: Id }
  ): void {
    const state = this.store.getState();
    const feature = state.getFeature(annotation.id);
    if (!feature) return;

    state.updateFeature(annotation.id, {
      ...feature,
      ...annotation,
      properties: {
        ...feature.properties,
        ...annotation.properties,
        style: {
          ...feature.properties.style,
          ...annotation.properties?.style
        }
      },
      geometry: {
        ...feature.geometry,
        ...annotation.geometry
      }
    } as Annotation);
  }

  /**
   * Scale an annotation by a given factor around an origin point
   * @param id The id of the annotation to scale
   * @param scale The scale factor
   * @param ox Origin x coordinate
   * @param oy Origin y coordinate
   */
  public setScale(id: Id, scale: number, ox: number, oy: number): void {
    const feature = this.store.getState().getFeature(id);
    if (!feature) return;

    const state = this.store.getState();

    if (isArrow(feature)) {
      // Scale arrow coordinates around origin
      const coords = feature.geometry.coordinates.map(([x, y]) => {
        const dx = x - ox;
        const dy = y - oy;
        return [ox + dx * scale, oy + dy * scale] as Position;
      });

      state.updateFeature(id, {
        geometry: {
          ...feature.geometry,
          coordinates: coords
        }
      } as Partial<Annotation>);
    } else if (isText(feature) || isBox(feature)) {
      // Scale text/box dimensions and position around origin
      const [cx, cy] = feature.geometry.coordinates;
      const dx = cx - ox;
      const dy = cy - oy;
      const newCx = ox + dx * scale;
      const newCy = oy + dy * scale;

      const newWidth = (feature.properties as Box["properties"]).width * scale;
      const newHeight =
        (feature.properties as Box["properties"]).height * scale;

      state.updateFeature(id, {
        properties: {
          ...feature.properties,
          width: newWidth,
          height: newHeight
        },
        geometry: {
          ...feature.geometry,
          coordinates: [newCx, newCy]
        }
      } as Partial<Annotation>);
    }
  }
}
