import type { Point } from "@linkurious/ogma";
import { Links } from "./links";
import { TARGET_TYPES } from "../constants";
import { Store, AnnotationState } from "../store";
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
  const liveUpdates: Record<Id, DeepPartial<Annotation>> = {};
  applyDragToAnnotation(state, links, annotationId, displacement, moveConnected, liveUpdates);
  state.applyLiveUpdates(liveUpdates);
}

/**
 * Moves every id in `annotationIds` by the same `displacement`, in a single
 * live-update batch. Used to drag a whole multi-selection together: the
 * annotation actually grabbed still goes through {@link handleDrag} (so it
 * keeps its own moveConnected behavior), while this moves the rest of the
 * selection alongside it - each by the same plain translation, plus
 * whatever arrows are linked to it (same as a normal single-annotation
 * drag), regardless of whether those linked arrows are themselves part of
 * the selection.
 */
export function handleMultiDrag(
  store: Store,
  links: Links,
  annotationIds: Id[],
  displacement: Point
) {
  const state = store.getState();
  const liveUpdates: Record<Id, DeepPartial<Annotation>> = {};
  for (const annotationId of annotationIds) {
    applyDragToAnnotation(state, links, annotationId, displacement, false, liveUpdates);
  }
  state.applyLiveUpdates(liveUpdates);
}

/**
 * When `primaryId` (the annotation a drag actually started on) is part of a
 * multi-selection, moves every *other* selected id by the same
 * `displacement` too - so grabbing any one member of a multi-selection
 * drags the whole group together. No-op when `primaryId` isn't selected, or
 * is the only thing selected. Called alongside the primary annotation's own
 * (unchanged) drag handling in text.ts/arrow.ts/polygon.ts, so the grabbed
 * annotation keeps its usual moveConnected/snap behavior - only the rest of
 * the selection goes through the plain translation in {@link handleMultiDrag}.
 */
export function dragSelectionAlong(
  store: Store,
  links: Links,
  primaryId: Id,
  displacement: Point
) {
  const selected = store.getState().selectedFeatures;
  if (selected.size < 2 || !selected.has(primaryId)) return;
  const others: Id[] = [];
  selected.forEach((id) => {
    if (id !== primaryId) others.push(id);
  });
  if (others.length) handleMultiDrag(store, links, others, displacement);
}

/**
 * Shared worker behind {@link handleDrag} and {@link handleMultiDrag}:
 * computes the live-update(s) for moving a single annotation by
 * `displacement` and writes them into the caller-supplied `liveUpdates`
 * accumulator (rather than applying immediately), so multiple annotations
 * can be moved in one batched `applyLiveUpdates` call.
 */
function applyDragToAnnotation(
  state: AnnotationState,
  links: Links,
  annotationId: Id,
  displacement: Point,
  moveConnected: boolean,
  liveUpdates: Record<Id, DeepPartial<Annotation>>
) {
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
