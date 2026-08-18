import type { Ogma, Point } from "@linkurious/ogma";
import { Snapping } from "../snapping";
import { getRigidFollowComment, translateComment } from "../commentFollow";
import { LinkGeometry } from "./geometry";
import { LinkIndex, type LinksByArrowId, type MagnetSource } from "./registry";
import { LinkSync } from "./sync";
import { SIDE_END, SIDE_START } from "../../constants";
import { Store } from "../../store";
import type {
  Arrow,
  Id,
  TargetType,
  Link,
  Side,
  Text,
  Annotation,
  DeepPartial,
  Comment
} from "../../types";
import { isBox, isText, isPolygon, isComment } from "../../types";
import { add } from "../../utils/vec";

export type { MagnetSource } from "./registry";

/**
 * Orchestrates linking between annotation arrows and the things they attach
 * to (nodes, edges, or other annotations). Composes three collaborators
 * rather than owning everything itself:
 * - {@link LinkIndex}: the link registry (add/remove/lookup)
 * - {@link LinkGeometry}: snap-point math for node/edge/box/polygon targets
 * - {@link LinkSync}: reacts to Ogma node/edge/zoom changes and schedules commits
 *
 * `Links` itself owns the interactive-drag cascade
 * ({@link updateLinkedArrowsDuringDrag}, {@link snapLinkedArrowsDuringDrag})
 * and wires the registry to store `features` changes - the two concerns
 * that need direct access to more than one collaborator at once.
 *
 * An arrow can be connected to a text or to a node. It supports double
 * indexing so that you could get the arrow by the id of the text or the id
 * of the node or by the id of the arrow id itself. A node or text can be
 * connected to multiple arrows. An arrow can be connected to only one node
 * or text, but on both ends.
 */
export class Links {
  private registry: LinkIndex;
  private geometry: LinkGeometry;
  private sync: LinkSync;
  private store: Store;
  private snapping: Snapping;
  private updatedItems = new Set<Id>();

  constructor(
    ogma: Ogma,
    snapping: Snapping,
    store: Store,
    onLinkCreated?: (arrow: Arrow, link: Link) => void
  ) {
    this.store = store;
    this.snapping = snapping;
    this.registry = new LinkIndex(ogma, store, onLinkCreated);
    this.geometry = new LinkGeometry(ogma, store);
    this.sync = new LinkSync(ogma, store, this.registry, this.geometry, this.updatedItems);

    this.store.subscribe((state) => state.features, this.onAddArrow);
  }

  /**
   * Called by handlers during drag operations to update linked arrows.
   *
   * Translates every arrow linked to `annotationId` by `displacement`. When
   * an arrow's *other* end is a comment in "rigid" mode, that comment (and
   * everything else attached to it) is cascaded through the same
   * displacement.
   *
   * `displacement` is always the *total* offset from the start of the drag
   * (matching the convention every caller already uses), and every read
   * here goes through the committed feature plus whatever this same call
   * has already staged — never the store's own `liveUpdates` bucket, which
   * can still hold a *previous* drag frame's stale values. Reading that
   * would compound frame over frame instead of recomputing the absolute
   * position each time.
   */
  public updateLinkedArrowsDuringDrag(
    annotationId: Id,
    displacement: Point,
    liveUpdates?: Record<Id, DeepPartial<Annotation>>
  ) {
    // Batch internally even when the caller wants immediate application, so
    // the rigid-comment cascade below can see updates staged earlier in the
    // very same call instead of clobbering them.
    const batched = liveUpdates ?? {};
    this._collectLinkedArrowUpdates(annotationId, displacement, batched, new Set());
    if (!liveUpdates) this.store.getState().applyLiveUpdates(batched);
  }

  /**
   * Recursive worker for {@link updateLinkedArrowsDuringDrag}. `visited`
   * bounds the recursion so a link graph can't cause it to revisit an
   * annotation it already moved.
   */
  private _collectLinkedArrowUpdates(
    annotationId: Id,
    displacement: Point,
    liveUpdates: Record<Id, DeepPartial<Annotation>>,
    visited: Set<Id>
  ) {
    if (visited.has(annotationId)) return;
    visited.add(annotationId);

    const state = this.store.getState();
    const annotation = state.getFeature(annotationId) as Text;
    if (!annotation) return;

    const links = this.registry.annotationToLink.get(annotationId);

    if (!links) return;

    const rigidComments = new Set<Id>();

    for (const linkId of links) {
      const link = this.registry.links.get(linkId);
      if (!link) continue;

      const committedArrow = state.getFeature(link.arrow) as Arrow;
      if (!committedArrow) continue;
      // An earlier link in this same cascade (e.g. this arrow's other end,
      // processed via the rigid-comment recursion below) may have already
      // staged a live update for this arrow — build on top of that instead
      // of the committed geometry, or we'd clobber it back to its pre-drag
      // position.
      const staged = liveUpdates[link.arrow] as Partial<Arrow> | undefined;
      const baseCoordinates = (staged?.geometry?.coordinates ??
        committedArrow.geometry.coordinates) as number[][];
      const sideIndex = link.side === SIDE_START ? 0 : 1;
      const currentEndPoint = {
        x: baseCoordinates[sideIndex][0],
        y: baseCoordinates[sideIndex][1]
      };
      const newEndPoint = add(currentEndPoint, displacement);

      // Stage the update for the arrow
      const updatedGeometry = {
        ...committedArrow.geometry,
        coordinates: baseCoordinates.map((coord, idx) => {
          if (idx === sideIndex) return [newEndPoint.x, newEndPoint.y];
          return [...coord];
        })
      };
      liveUpdates[link.arrow] = {
        geometry: updatedGeometry
      } as Partial<Arrow>;
      this.updatedItems.add(link.arrow);

      // Rigid-follow: if this arrow's *other* end is a comment in "rigid"
      // mode, it should translate along with `annotationId` too, instead of
      // being left behind to stretch elastically.
      const rigidComment = getRigidFollowComment(
        this.registry.links,
        this.registry.linksByArrowId,
        this.store,
        link.arrow,
        link
      );
      if (rigidComment && !visited.has(rigidComment.id))
        rigidComments.add(rigidComment.id);
    }

    for (const commentId of rigidComments) {
      const comment = state.getFeature(commentId) as Comment | undefined;
      if (!comment) continue;
      translateComment(comment, displacement, liveUpdates, this.updatedItems);

      // Cascade: move every other arrow attached to this comment too (and,
      // transitively, anything rigidly attached beyond that).
      this._collectLinkedArrowUpdates(commentId, displacement, liveUpdates, visited);
    }
  }

  public snapLinkedArrowsDuringDrag(
    annotationId: Id,
    liveUpdates?: Record<Id, DeepPartial<Annotation>>
  ) {
    const state = this.store.getState();
    let annotation = state.getFeature(annotationId);
    if (!annotation) return;
    const updates = state.liveUpdates[annotationId];
    annotation = updates
      ? { ...annotation, ...(updates as Annotation) }
      : annotation;
    const links = this.registry.annotationToLink.get(annotationId);

    if (!links) return;
    for (const linkId of links) {
      const link = this.registry.links.get(linkId);
      if (!link) continue;

      let arrow = state.getFeature(link.arrow) as Arrow;
      const arrowUpdates = state.liveUpdates[arrow.id];
      arrow = arrowUpdates ? { ...arrow, ...(arrowUpdates as Arrow) } : arrow;
      const position =
        arrow.geometry.coordinates[link.side === SIDE_START ? 0 : 1];
      const point = {
        x: position[0],
        y: position[1]
      };
      let snap;
      if (isText(annotation) || isComment(annotation) || isBox(annotation)) {
        snap = this.snapping.snapToText(point, [annotation as Text]);
      } else if (isPolygon(annotation)) {
        snap = this.snapping.snapToPolygon(point, [annotation]);
      }
      if (!snap) continue;
      const newEndPoint = snap.point;
      const updatedGeometry = {
        ...arrow.geometry,
        coordinates: arrow.geometry.coordinates.map((coord, idx) => {
          if (
            (link.side === SIDE_START && idx === 0) ||
            (link.side === SIDE_END && idx === 1)
          )
            return [newEndPoint.x, newEndPoint.y];

          return [...coord];
        })
      };
      if (liveUpdates) {
        liveUpdates[arrow.id] = {
          geometry: updatedGeometry
        } as Partial<Arrow>;
      } else {
        state.applyLiveUpdate(arrow.id, {
          geometry: updatedGeometry
        } as Partial<Arrow>);
      }
    }
  }

  public add(
    arrow: Arrow,
    side: Side,
    targetId: Id,
    targetType: TargetType,
    magnet: Point,
    magnetSource: MagnetSource = "absolute"
  ): this | undefined {
    const result = this.registry.add(arrow, side, targetId, targetType, magnet, magnetSource);
    return result ? this : undefined;
  }

  public remove(arrow: Arrow | Id, side: Side) {
    this.registry.remove(arrow, side);
    return this;
  }

  /** Re-syncs fixedSize-linked arrows after a zoom/rotation change. */
  public refresh = () => this.sync.refresh();

  /**
   * Recompute and commit arrow positions for the given links (or every
   * known link, by default). Used when annotations move programmatically.
   */
  public update(linksByArrowId?: LinksByArrowId) {
    this.sync.update(linksByArrowId);
  }

  private onAddArrow = (
    newFeatures: Record<string, Annotation>,
    prevFeatures: Record<string, Annotation>
  ) => {
    const linksToRefresh = this.registry.syncFromFeatureChange(newFeatures, prevFeatures);
    if (linksToRefresh.size > 0) this.sync.updateAndCommitSync(linksToRefresh);
  };

  public destroy() {
    this.sync.destroy();
  }
}
