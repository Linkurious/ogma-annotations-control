import type { NodeList, Ogma, Point, NodesEvent } from "@linkurious/ogma";
import * as martinez from "martinez-polygon-clipping";
import type { BBox } from "rbush";
import {
  REGION_BRIDGE_HALF_WIDTH,
  REGION_CIRCLE_POINTS_PER_NODE,
  REGION_COMMIT_DEBOUNCE_MS,
  REGION_DEFAULT_PADDING,
  REGION_SIMPLIFY_TOLERANCE
} from "../constants";
import { Index } from "../interaction/spatialIndex";
import { Store } from "../store";
import type { Annotation, DeepPartial, Id, Polygon, PolygonRegion, PolygonStyle } from "../types";
import { createPolygon, isPolygon } from "../types";
import { isPointInsidePolygon } from "./snapping/polygon";
import { getBbox } from "../utils/utils";
import { updatePolygonBbox, simplifyPolygon } from "../utils/polygon";
import { distanceToSegment } from "../utils/geom";

type XYR = { x: number; y: number; radius: number };
type Ring = number[][];

/**
 * Tracks polygons acting as live node-containment "regions" and grows their
 * ring to keep enclosing their member nodes.
 *
 * Reshaping is additive, not a from-scratch recompute: each moved member's
 * padded footprint is unioned (`martinez-polygon-clipping`) into the
 * polygon's *existing* ring, so parts of a hand-drawn contour that aren't
 * near the moved node are left completely untouched. If a member ends up
 * disjoint from the current ring (dragged far away in one jump), a thin
 * bridging corridor is unioned in first to weld it back into one shape.
 *
 * Membership is sticky and geometric: a node becomes a member either by
 * being listed in `polygon.properties.region.nodeIds` when tracking starts,
 * or by being dragged into an already-tracked polygon's current boundary
 * (join-on-entry). Once a member, a node stays tracked — moving it away
 * makes the region grow to keep enclosing it — until it's removed from the
 * graph or the polygon stops being tracked. The ring never shrinks on its
 * own: a bulge grown to reach a member stays even if that member later
 * moves back inside.
 *
 * Structurally this mirrors {@link Links}: a serializable field on the
 * feature (`polygon.properties.region`, parallel to `arrow.properties.link`)
 * plus richer in-memory reverse indexes, reacting to Ogma's native node
 * events with a short debounce before recomputing and batch-committing.
 */
export class Regions {
  private membership: Map<Id, Set<Id>> = new Map();
  private nodeToRegions: Map<Id, Set<Id>> = new Map();
  private ogma: Ogma;
  private store: Store;
  private index: Index;
  private updatedItems = new Set<Id>();
  private commitTimeout!: ReturnType<typeof setTimeout>;
  private nodePositionTimeout?: ReturnType<typeof setTimeout>;

  constructor(ogma: Ogma, store: Store, index: Index) {
    this.ogma = ogma;
    this.store = store;
    this.index = index;

    this.store.subscribe((state) => state.features, this.onFeaturesChanged);

    this.ogma.events
      // @ts-expect-error private event, same as Links
      .on("setMultipleAttributes", this.onSetMultipleAttributes)
      .on("removeNodes", this.onRemoveNodes);
  }

  /**
   * Create a new region polygon that grows around the given nodes' current
   * positions, and starts tracking them.
   */
  public createRegion(
    nodeIds: Id[],
    options?: { padding?: number; style?: PolygonStyle }
  ): Polygon {
    if (nodeIds.length === 0)
      throw new Error("createRegion requires at least one node id");

    const padding = options?.padding ?? REGION_DEFAULT_PADDING;
    const region: PolygonRegion = { nodeIds: [...nodeIds], padding };

    // The initial shape has no hand-drawn contour to preserve, so a solid
    // convex hull over the padded seed nodes (rather than folding each in
    // one at a time via union) is what we want here — union-folding widely
    // spaced seeds one by one can weld them with thin corridors instead of
    // filling the area between them. Subsequent single-node moves grow this
    // hull additively, per {@link _growRingForNode}.
    const xyr = this.ogma.getNodes(nodeIds).getAttributes([
      "x",
      "y",
      "radius"
    ]) as XYR[];
    const points = xyr.flatMap(({ x, y, radius }) =>
      this._buildCircle(x, y, (radius || 0) + padding)
    );
    const ring = this._closeRing(this._convexHull(points));
    if (ring.length < 4)
      throw new Error("createRegion: no valid node positions found");

    const polygon = createPolygon([ring as [number, number][]], {
      style: options?.style
    });
    polygon.properties.region = region;

    this.store.getState().addFeature(polygon);
    return polygon;
  }

  /**
   * Turn an existing polygon into a live region. Initial membership is
   * detected geometrically: any node currently inside the polygon's ring.
   * The ring itself is left exactly as drawn.
   */
  public trackRegionNodes(polygonId: Id, options?: { padding?: number }): void {
    const state = this.store.getState();
    const polygon = state.getFeature(polygonId);
    if (!polygon || !isPolygon(polygon)) return;

    const ring = polygon.geometry.coordinates[0];
    const bbox = getBbox(polygon);
    const inside = this.ogma.view.getElementsInside(
      bbox[0],
      bbox[1],
      bbox[2],
      bbox[3]
    );
    const ids = inside.nodes.getId();
    const positions = inside.nodes.getPosition();
    const nodeIds = ids.filter((_, i) => isPointInsidePolygon(positions[i], ring));

    const region: PolygonRegion = {
      nodeIds,
      padding: options?.padding ?? REGION_DEFAULT_PADDING
    };
    state.updateFeature(polygonId, {
      properties: { ...polygon.properties, region }
    } as Partial<Polygon>);
  }

  /** Stop tracking — the polygon becomes an ordinary static polygon again. */
  public untrackRegion(polygonId: Id): void {
    const state = this.store.getState();
    const polygon = state.getFeature(polygonId);
    if (!polygon || !isPolygon(polygon) || !polygon.properties.region) return;
    const { region: _region, ...rest } = polygon.properties;
    state.updateFeature(polygonId, { properties: rest } as Partial<Polygon>);
  }

  public destroy() {
    clearTimeout(this.commitTimeout);
    clearTimeout(this.nodePositionTimeout);
    this.ogma.events.off(this.onSetMultipleAttributes).off(this.onRemoveNodes);
  }

  // --- membership bookkeeping, driven by feature add/remove/edit ---

  private onFeaturesChanged = (
    newFeatures: Record<string, Annotation>,
    prevFeatures: Record<string, Annotation>
  ) => {
    const oldIds = new Set(Object.keys(prevFeatures));
    const newIds = Object.keys(newFeatures).filter((id) => !oldIds.has(id));
    const removedIds = Object.keys(prevFeatures).filter((id) => !newFeatures[id]);

    newIds.forEach((id) => {
      const feature = newFeatures[id];
      if (isPolygon(feature) && feature.properties.region)
        this._registerRegion(feature);
    });

    removedIds.forEach((id) => {
      if (this.membership.has(id)) this._unregisterRegion(id);
    });

    // Detect programmatic region metadata changes on existing polygons
    // (trackRegionNodes / untrackRegion, or a direct properties edit).
    oldIds.forEach((id) => {
      const newFeature = newFeatures[id];
      const prevFeature = prevFeatures[id];
      if (!newFeature || !isPolygon(newFeature) || !isPolygon(prevFeature))
        return;
      if (newFeature.properties.region === prevFeature.properties.region)
        return;
      if (this.membership.has(id)) this._unregisterRegion(id);
      if (newFeature.properties.region) this._registerRegion(newFeature);
    });
  };

  private _registerRegion(polygon: Polygon) {
    const nodeIds = polygon.properties.region!.nodeIds;
    const members = new Set(nodeIds);
    this.membership.set(polygon.id, members);
    members.forEach((nodeId) => {
      if (!this.nodeToRegions.has(nodeId)) this.nodeToRegions.set(nodeId, new Set());
      this.nodeToRegions.get(nodeId)!.add(polygon.id);
    });
  }

  private _unregisterRegion(polygonId: Id) {
    this.membership.get(polygonId)?.forEach((nodeId) => {
      this.nodeToRegions.get(nodeId)?.delete(polygonId);
    });
    this.membership.delete(polygonId);
  }

  // --- reacting to node moves / removals ---

  private onSetMultipleAttributes = ({
    elements,
    updatedAttributes
  }: {
    elements: { isNode: boolean; toList: () => NodeList };
    updatedAttributes: string[];
  }) => {
    const attrs = new Set(updatedAttributes);
    if (
      !elements.isNode ||
      (!attrs.has("x") && !attrs.has("y") && !attrs.has("radius"))
    )
      return;
    this._requestUpdate(elements.toList());
  };

  private onRemoveNodes = (event: NodesEvent<unknown, unknown>) => {
    const ids = event.nodes.getId();
    if (!ids.length) return;
    // Dropping a member never has to shrink the ring — it's a pure
    // membership-list edit, no geometry recompute needed.
    const state = this.store.getState();
    const touchedPolygons = new Set<Id>();

    ids.forEach((nodeId) => {
      const regions = this.nodeToRegions.get(nodeId);
      if (!regions) return;
      regions.forEach((polygonId) => {
        this.membership.get(polygonId)?.delete(nodeId);
        touchedPolygons.add(polygonId);
      });
      this.nodeToRegions.delete(nodeId);
    });

    touchedPolygons.forEach((polygonId) => {
      const polygon = state.getFeature(polygonId);
      if (!polygon || !isPolygon(polygon) || !polygon.properties.region) return;
      const memberIds = Array.from(this.membership.get(polygonId) ?? []);
      state.updateFeature(polygonId, {
        properties: {
          ...polygon.properties,
          region: { ...polygon.properties.region, nodeIds: memberIds }
        }
      } as Partial<Polygon>);
    });
  };

  private _requestUpdate(nodes: NodeList) {
    // debounce to the next tick, same as Links, to let coordinates settle
    // and coalesce a burst of native move events into one recompute.
    clearTimeout(this.nodePositionTimeout);
    this.nodePositionTimeout = setTimeout(
      () => this._handleNodesMoved(nodes),
      REGION_COMMIT_DEBOUNCE_MS
    );
  }

  private _handleNodesMoved(nodes: NodeList) {
    if (!nodes.size || this.membership.size === 0) return;
    const ids = nodes.getId();
    // polygonId -> node ids that need folding into its ring this batch
    // (kept small and specific, not "all members", so each frame only
    // touches the local area around whatever actually moved).
    const affected = new Map<Id, Set<Id>>();
    const addAffected = (polygonId: Id, nodeId: Id) => {
      if (!affected.has(polygonId)) affected.set(polygonId, new Set());
      affected.get(polygonId)!.add(nodeId);
    };

    ids.forEach((nodeId) => {
      const owningRegions = this.nodeToRegions.get(nodeId);
      if (owningRegions && owningRegions.size > 0) {
        // Sticky member: always follow, no containment check needed.
        owningRegions.forEach((polygonId) => addAffected(polygonId, nodeId));
        return;
      }

      // Not a member anywhere yet — check whether it moved inside a
      // tracked region's current boundary (join-on-entry).
      const node = this.ogma.getNode(nodeId);
      if (!node) return;
      const position = node.getPosition();
      const radius = (node.getAttribute("radius") as number) || 0;
      this._findCandidateRegions(position, radius).forEach((polygon) => {
        const ring = polygon.geometry.coordinates[0];
        if (!isPointInsidePolygon(position, ring)) return;
        this._addMember(polygon.id, nodeId);
        addAffected(polygon.id, nodeId);
      });
    });

    if (affected.size > 0) this._reshapeAndCommit(affected);
  }

  private _addMember(polygonId: Id, nodeId: Id) {
    if (!this.membership.has(polygonId)) this.membership.set(polygonId, new Set());
    this.membership.get(polygonId)!.add(nodeId);
    if (!this.nodeToRegions.has(nodeId)) this.nodeToRegions.set(nodeId, new Set());
    this.nodeToRegions.get(nodeId)!.add(polygonId);
  }

  private _findCandidateRegions(position: Point, radius: number): Polygon[] {
    const bbox: BBox = {
      minX: position.x - radius,
      minY: position.y - radius,
      maxX: position.x + radius,
      maxY: position.y + radius
    };
    return this.index
      .query(bbox)
      .filter((f): f is Polygon => isPolygon(f) && !!f.properties.region);
  }

  // --- reshaping: grow, never recompute from scratch ---

  private _reshapeAndCommit(affected: Map<Id, Set<Id>>) {
    const state = this.store.getState();
    const updates: Record<Id, DeepPartial<Annotation>> = {};

    affected.forEach((nodeIds, polygonId) => {
      // Merged (committed + live) so a rapid burst of debounced frames
      // folds onto the *latest* ring rather than restarting from a stale
      // committed base each time.
      const polygon = state.getMergedFeature(polygonId);
      if (!polygon || !isPolygon(polygon) || !polygon.properties.region) return;

      const region = polygon.properties.region;
      const padding = region.padding ?? REGION_DEFAULT_PADDING;

      let ring = polygon.geometry.coordinates[0] as Ring;
      const xyr = this.ogma.getNodes(Array.from(nodeIds)).getAttributes([
        "x",
        "y",
        "radius"
      ]) as XYR[];
      xyr.forEach(({ x, y, radius }) => {
        ring = this._growRingForNode(ring, x, y, (radius || 0) + padding) ?? ring;
      });

      const memberIds = Array.from(this.membership.get(polygonId) ?? []);
      const updated: Polygon = {
        ...polygon,
        properties: {
          ...polygon.properties,
          region: { ...region, nodeIds: memberIds }
        },
        geometry: { type: "Polygon", coordinates: [ring] }
      };
      updatePolygonBbox(updated);

      updates[polygonId] = {
        properties: updated.properties,
        geometry: updated.geometry
      } as Partial<Polygon>;
      this.updatedItems.add(polygonId);
    });

    if (Object.keys(updates).length === 0) return;
    state.applyLiveUpdates(updates);
    this._requestCommit();
  }

  /**
   * Grow `ring` to enclose a padded circle around (x, y), unioning it in.
   * If the circle is already fully contained, the ring is returned
   * untouched (byte-identical) — the common case for most member moves.
   * If the circle is disjoint from the ring, a thin bridging corridor is
   * welded in first so the result stays a single connected shape.
   */
  private _growRingForNode(
    ring: Ring | undefined,
    x: number,
    y: number,
    radius: number
  ): Ring | undefined {
    const circle = this._buildCircle(x, y, radius);
    if (!ring) return circle;
    if (this._isCircleInsideRing(ring, x, y, radius)) return ring;

    const direct = this._unionRings(ring, circle);
    if (direct) return direct;

    // Disjoint: weld a corridor from the ring's closest edge point to the
    // node, then union the circle in — this only ever touches a thin strip
    // plus the local area the node landed in, leaving the rest of the ring
    // alone.
    const closest = this._closestPointOnRing(ring, { x, y });
    const corridor = this._buildCorridor(closest, { x, y });
    const bridged = corridor ? this._unionRings(ring, corridor) : undefined;
    if (!bridged) return ring;
    return this._unionRings(bridged, circle) ?? bridged;
  }

  private _buildCircle(x: number, y: number, radius: number): Ring {
    const points: Ring = [];
    for (let k = 0; k < REGION_CIRCLE_POINTS_PER_NODE; k++) {
      const angle = (k / REGION_CIRCLE_POINTS_PER_NODE) * Math.PI * 2;
      points.push([x + radius * Math.cos(angle), y + radius * Math.sin(angle)]);
    }
    points.push(points[0]);
    return points;
  }

  private _isCircleInsideRing(
    ring: Ring,
    x: number,
    y: number,
    radius: number
  ): boolean {
    if (!isPointInsidePolygon({ x, y }, ring)) return false;
    return this._distanceToRing(ring, { x, y }) >= radius;
  }

  private _distanceToRing(ring: Ring, point: Point): number {
    let min = Infinity;
    for (let i = 0; i < ring.length - 1; i++) {
      const a = { x: ring[i][0], y: ring[i][1] };
      const b = { x: ring[i + 1][0], y: ring[i + 1][1] };
      const d = distanceToSegment(point, a, b);
      if (d < min) min = d;
    }
    return min;
  }

  private _closestPointOnRing(ring: Ring, point: Point): Point {
    let best: Point = { x: ring[0][0], y: ring[0][1] };
    let bestDist = Infinity;
    for (let i = 0; i < ring.length - 1; i++) {
      const ax = ring[i][0];
      const ay = ring[i][1];
      const bx = ring[i + 1][0];
      const by = ring[i + 1][1];
      const dx = bx - ax;
      const dy = by - ay;
      const lenSq = dx * dx + dy * dy;
      let t = lenSq === 0 ? 0 : ((point.x - ax) * dx + (point.y - ay) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
      const px = ax + t * dx;
      const py = ay + t * dy;
      const d = (px - point.x) ** 2 + (py - point.y) ** 2;
      if (d < bestDist) {
        bestDist = d;
        best = { x: px, y: py };
      }
    }
    return best;
  }

  /** Thin quad from `a` to `b`, overshot at both ends so it reliably
   *  overlaps whatever it's unioned with next (avoids exact-tangency gaps). */
  private _buildCorridor(a: Point, b: Point): Ring | undefined {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len === 0) return undefined;
    const ux = dx / len;
    const uy = dy / len;
    const overshoot = REGION_BRIDGE_HALF_WIDTH * 1.5;
    const sx = a.x - ux * overshoot;
    const sy = a.y - uy * overshoot;
    const ex = b.x + ux * overshoot;
    const ey = b.y + uy * overshoot;
    const px = -uy * REGION_BRIDGE_HALF_WIDTH;
    const py = ux * REGION_BRIDGE_HALF_WIDTH;
    return [
      [sx + px, sy + py],
      [ex + px, ey + py],
      [ex - px, ey - py],
      [sx - px, sy - py],
      [sx + px, sy + py]
    ];
  }

  /** Union two closed rings; returns the merged ring only when the result
   *  is a single connected polygon (undefined if it came out disjoint).
   *  Simplified afterwards — repeated near-tangent unions otherwise pile up
   *  near-duplicate/collinear vertices without bound over many moves. */
  private _unionRings(a: Ring, b: Ring): Ring | undefined {
    let result: number[][][][] | null;
    try {
      result = martinez.union(
        [a] as unknown as martinez.Polygon,
        [b] as unknown as martinez.Polygon
      ) as unknown as number[][][][];
    } catch {
      return undefined;
    }
    if (!result || result.length !== 1) return undefined;
    return this._closeRing(
      simplifyPolygon(result[0][0], REGION_SIMPLIFY_TOLERANCE, false) as Ring
    );
  }

  /** Andrew's monotone-chain convex hull. Used only for the initial shape
   *  at {@link createRegion} time — ongoing reshaping never recomputes a
   *  hull, it grows the existing ring additively instead. */
  private _convexHull(points: Ring): Ring {
    const pts = points.slice().sort((p, q) => p[0] - q[0] || p[1] - q[1]);
    if (pts.length < 3) return pts;

    const cross = (o: number[], a: number[], b: number[]) =>
      (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

    const lower: Ring = [];
    for (const p of pts) {
      while (
        lower.length >= 2 &&
        cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
      )
        lower.pop();
      lower.push(p);
    }
    const upper: Ring = [];
    for (let i = pts.length - 1; i >= 0; i--) {
      const p = pts[i];
      while (
        upper.length >= 2 &&
        cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
      )
        upper.pop();
      upper.push(p);
    }
    upper.pop();
    lower.pop();
    return lower.concat(upper);
  }

  private _closeRing(ring: Ring): Ring {
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) ring.push([first[0], first[1]]);
    return ring;
  }

  private _requestCommit() {
    clearTimeout(this.commitTimeout);
    this.commitTimeout = setTimeout(this._commit, REGION_COMMIT_DEBOUNCE_MS);
  }

  private _commit = () => {
    const state = this.store.getState();
    state.batchUpdate(() => state.commitLiveUpdates(this.updatedItems));
    this.updatedItems.clear();
  };
}
