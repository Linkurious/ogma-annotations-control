import type { Point } from "@linkurious/ogma";
import { TARGET_TYPES } from "../constants";
import { Store } from "../store";
import type {
  Annotation,
  Arrow,
  Box,
  Comment,
  Id,
  Text,
  Polygon,
  DeepPartial
} from "../types";
import { isArrow, isBox, isComment, isPolygon, isText } from "../types";
import { getBoxCenter } from "../utils/utils";
import { Links } from "./links";

/**
 * Handles dragging of annotations and their linked elements.
 * When an arrow body is dragged, it moves both linked annotations and updates all affected arrows.
 * When an annotation is dragged, it updates all arrows linked to it.
 */
export function handleDrag(
  store: Store,
  links: Links,
  annotationId: Id,
  displacement: Point,
  moveConnected: boolean = false
) {
  const state = store.getState();
  const annotation = state.getFeature(annotationId);
  if (!annotation) return;

  const annotationsToMove = new Set<Id>();
  const arrowsToUpdate = new Set<Id>();
  let draggedArrow: Id = "";
  if (isArrow(annotation)) {
    const arrow = annotation as Arrow;
    if (moveConnected) {
      const link = arrow.properties.link || {};
      if (link.start && isAnnotationLink(link.start.type)) {
        annotationsToMove.add(link.start.id);
      }
      if (link.end && isAnnotationLink(link.end.type)) {
        annotationsToMove.add(link.end.id);
      }
    }
    draggedArrow = arrow.id;
    arrowsToUpdate.add(arrow.id);
  } else {
    annotationsToMove.add(annotation.id);
  }

  const liveUpdates: Record<Id, DeepPartial<Annotation>> = {};
  // Move all annotations
  for (const id of annotationsToMove) {
    const target = state.getFeature(id);
    if (!target) continue;

    const update = moveAnnotation(target, displacement);
    if (update) {
      liveUpdates[id] = update;
      // After moving an annotation, its linked arrows need updating
      links.updateLinkedArrowsDuringDrag(id, displacement, liveUpdates);
    }
  }

  // Update the dragged arrow's geometry
  for (const arrowId of arrowsToUpdate) {
    const arrow = state.getFeature(arrowId) as Arrow;
    if (!arrow) continue;

    const link = arrow.properties.link || {};
    const coords = arrow.geometry.coordinates;
    const newCoords = [...coords];

    // Move start if linked to an annotation (not node/edge)
    if (link.start && isAnnotationLink(link.start.type) || draggedArrow === arrowId) {
      newCoords[0] = [coords[0][0] + displacement.x, coords[0][1] + displacement.y];
    }

    // Move end if linked to an annotation (not node/edge)
    if (link.end && isAnnotationLink(link.end.type) || draggedArrow === arrowId) {
      newCoords[1] = [coords[1][0] + displacement.x, coords[1][1] + displacement.y];
    }
    liveUpdates[arrowId] = {
      geometry: {
        ...arrow.geometry,
        coordinates: newCoords
      }
    } as Partial<Arrow>;
  }
  state.applyLiveUpdates(liveUpdates);

}

/**
 * Check if a link type refers to an annotation (not a node or edge)
 */
function isAnnotationLink(type: string): boolean {
  return (
    type !== TARGET_TYPES.NODE &&
    type !== TARGET_TYPES.EDGE
  );
}

/**
 * Move an annotation by a displacement and return the update object
 */
function moveAnnotation(
  annotation: Annotation,
  displacement: Point
): Partial<Annotation> | null {
  // Text, Box, and Comment all use Point geometry with center coordinates
  if (isText(annotation) || isBox(annotation) || isComment(annotation)) {
    const center = getBoxCenter(annotation as Text | Box | Comment);
    return {
      geometry: {
        type: annotation.geometry.type,
        coordinates: [center.x + displacement.x, center.y + displacement.y]
      }
    } as Partial<Text>;
  }

  if (isPolygon(annotation)) {
    const polygon = annotation as Polygon;
    const newCoordinates = polygon.geometry.coordinates.map((ring) =>
      ring.map((coord) => [coord[0] + displacement.x, coord[1] + displacement.y])
    );
    return {
      geometry: {
        type: polygon.geometry.type,
        coordinates: newCoordinates
      }
    } as Partial<Polygon>;
  }

  return null;
}
