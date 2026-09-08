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
 * Moves `annotationId` by `displacement` (and its linked arrows), same as
 * before. If it's part of a multi-selection, the rest of the selection is
 * carried along by the same displacement too, so a drag started on any one
 * selected annotation moves the whole group.
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

  moveOne(state, links, annotationId, displacement, moveConnected, liveUpdates);
  for (const id of state.selectedFeatures) {
    if (id !== annotationId) moveOne(state, links, id, displacement, false, liveUpdates);
  }

  state.applyLiveUpdates(liveUpdates);
}

function isAnnotationLink(type: string): boolean {
  return type !== TARGET_TYPES.NODE && type !== TARGET_TYPES.EDGE;
}

/** Computes the live update(s) for moving one annotation, writing into the
 * shared `liveUpdates` accumulator instead of applying immediately - lets
 * handleDrag batch a whole selection into a single store update. */
function moveOne(
  state: AnnotationState,
  links: Links,
  annotationId: Id,
  displacement: Point,
  moveConnected: boolean,
  liveUpdates: Record<Id, DeepPartial<Annotation>>
) {
  const annotation = state.getFeature(annotationId);
  if (!annotation) return;

  if (isArrow(annotation)) {
    // Move connected shapes first: this may cascade into staging an update
    // for this same arrow too (its endpoint linked to one of them, via
    // updateLinkedArrowsDuringDrag below). Compute the arrow's own geometry
    // last, as a pure translation of its committed coordinates, so it
    // overwrites that instead of adding to it - otherwise a linked endpoint
    // gets displaced twice.
    if (moveConnected) {
      const link = annotation.properties.link || {};
      for (const end of [link.start, link.end]) {
        if (end && isAnnotationLink(end.type)) {
          moveOne(state, links, end.id, displacement, false, liveUpdates);
        }
      }
    }

    const coords = annotation.geometry.coordinates;
    liveUpdates[annotationId] = {
      geometry: {
        ...annotation.geometry,
        coordinates: [
          [coords[0][0] + displacement.x, coords[0][1] + displacement.y],
          [coords[1][0] + displacement.x, coords[1][1] + displacement.y]
        ]
      }
    } as Partial<Arrow>;
    return;
  }

  const update = moveAnnotation(annotation, displacement);
  if (!update) return;
  liveUpdates[annotationId] = update;
  links.updateLinkedArrowsDuringDrag(annotationId, displacement, liveUpdates);
}

/** Move a Text/Box/Comment/Polygon annotation by a displacement. */
function moveAnnotation(
  annotation: Annotation,
  displacement: Point
): Partial<Annotation> | null {
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
