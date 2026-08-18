import type { Point } from "@linkurious/ogma";
import { SIDE_START, TARGET_TYPES } from "../../constants";
import { Store } from "../../store";
import type { Annotation, Comment, DeepPartial, Id, Link } from "../../types";
import { isComment, isRigidConnector } from "../../types";
import { updateBbox } from "../../utils/utils";

/**
 * The subset of {@link Links}' bookkeeping this module needs. Kept as plain
 * Maps rather than a `Links` instance so this logic can be exercised without
 * constructing the whole class.
 */
type LinksByArrowId = Map<Id, { start?: Id; end?: Id }>;

/**
 * Rigid-follow guard: returns the linked Comment when this arrow's *other*
 * endpoint (relative to `nodeSideLink`) is attached to a comment whose
 * connector mode is "rigid" (the default). In that case a node drag should
 * translate the whole callout (comment + arrow) rather than just moving
 * the node-side endpoint. Returns undefined when the far side isn't a
 * comment, or the comment opted into "elastic" mode.
 */
export function getRigidFollowComment(
  links: Map<Id, Link>,
  linksByArrowId: LinksByArrowId,
  store: Store,
  arrowId: Id,
  nodeSideLink: Link
): Comment | undefined {
  const arrowLinks = linksByArrowId.get(arrowId);
  if (!arrowLinks) return undefined;

  // The far side is whichever end isn't the one anchored to the moved node.
  const farLinkId =
    nodeSideLink.side === SIDE_START ? arrowLinks.end : arrowLinks.start;
  if (!farLinkId) return undefined;

  const farLink = links.get(farLinkId);
  if (!farLink || farLink.targetType !== TARGET_TYPES.COMMENT) return undefined;

  return getRigidComment(store, farLink);
}

/**
 * Returns the Comment targeted by `link`, when it's a comment link whose
 * connector mode is "rigid". Shared eligibility check for both the
 * node-drag path and the generic (edge / annotation move) path.
 */
export function getRigidComment(
  store: Store,
  link: Link | undefined
): Comment | undefined {
  if (!link || link.targetType !== TARGET_TYPES.COMMENT) return undefined;
  const comment = store.getState().getFeature(link.target);
  if (!comment || !isComment(comment)) return undefined;
  if (!isRigidConnector(comment)) return undefined;
  return comment;
}

/**
 * Translate a comment by `delta` and stage the update, mirroring the
 * rigid-follow handling in `Links.updateFromNodePositions`.
 */
export function translateComment(
  comment: Comment,
  delta: Point,
  updates: Record<Id, DeepPartial<Annotation>>,
  updatedItems: Set<Id>
) {
  const [cx, cy] = comment.geometry.coordinates as [number, number];
  const commentUpdate: DeepPartial<Comment> = {
    ...comment,
    geometry: {
      type: "Point",
      coordinates: [cx + delta.x, cy + delta.y]
    }
  };
  updates[comment.id] = commentUpdate as Annotation;
  updateBbox(commentUpdate as Comment);
  updatedItems.add(comment.id);
}
