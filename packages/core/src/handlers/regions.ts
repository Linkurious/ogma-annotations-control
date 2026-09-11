import type { NodeList, Ogma, Point, NodesEvent } from "@linkurious/ogma";
import * as martinez from "martinez-polygon-clipping";
import type { BBox } from "rbush";
import {
  REGION_CIRCLE_POINTS_PER_NODE,
  REGION_COMMIT_DEBOUNCE_MS,
  REGION_DEFAULT_PADDING,
  REGION_METABALL_DEFAULT_REACH,
  REGION_METABALL_HANDLE_SIZE,
  REGION_METABALL_SEGMENTS,
  REGION_METABALL_SPREAD,
  REGION_SIMPLIFY_TOLERANCE
} from "../constants";
import { Index } from "../interaction/spatialIndex";
import { Store } from "../store";
import type { Annotation, DeepPartial, Id, Polygon, PolygonRegion, PolygonStyle } from "../types";
import { createPolygon, isPolygon } from "../types";
import { isPointInsidePolygon } from "./snapping/polygon";
import { getBbox } from "../utils/utils";
import { updatePolygonBbox, simplifyPolygon } from "../utils/polygon";
import { buildMetaballConnector } from "../utils/metaball";
import { distanceToSegment } from "../utils/geom";

type XYR = { x: number; y: number; radius: number };
type Ring = number[][];

/**
 * Tracks polygons acting as live node-containment "regions" and reshapes
 * them to keep enclosing their member nodes.
 *
 * Reshaping is a full recompute from current member positions, not growth
 * onto a stale ring: every member's padded circle plus a
 * {@link buildMetaballConnector metaball connector} for every pair of
 * members close enough to blend are unioned together
 * (`martinez-polygon-clipping`) into one shape. An earlier version grew
 * each moved member's footprint onto the polygon's *existing* ring and
 * welded in a straight corridor when a member landed disjoint from it —
 * cheap for a single dragged node, but a layout re-run scattering several
 * members at once produced a bundle of straight corridors reading as ugly
 * tunnels. A from-scratch metaball recompute has no "existing ring" to
 * weld onto, so it has no tunnels to produce: disjoint members just read
 * as separate blobs until they're close enough to blend again.
 *
 * The one place the *existing* shape still matters is before any member
 * has moved: `createRegion`'s initial hull and a hand-drawn
 * `trackRegionNodes` contour are left exactly as they are until the first
 * move — the metaball model only takes over once nodes actually start
 * moving (drag or layout).
 *
 * Membership is sticky and geometric: a node becomes a member either by
 * being listed in `polygon.properties.region.nodeIds` when tracking starts,
 * or by being dragged into an already-tracked polygon's current boundary
 * (join-on-entry). Once a member, a node stays tracked until it's removed
 * from the graph or the polygon stops being tracked — moving away just
 * means its circle drifts apart from the rest of the blob rather than
 * dropping out.
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

    // The initial shape has no hand-drawn contour to preserve, so a solid
    // convex hull over the padded seed nodes (rather than a metaball blend)
    // is what we want here — a hull fills the area between widely spaced
    // seeds solidly, where a metaball blend would only weld a thin neck
    // between them. Any subsequent move switches to the metaball model,
    // per {@link _computeMetaballRing}.
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

    // Freeze the metaball connect-gap budget from how spread out this
    // initial shape is - see {@link PolygonRegion.reach}.
    const reach = this._averageDistanceToRing(ring, xyr);

    const polygon = createPolygon([ring as [number, number][]], {
      style: options?.style
    });
    polygon.properties.region = { nodeIds: [...nodeIds], padding, reach };

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
    const memberPositions = positions.filter((p) => isPointInsidePolygon(p, ring));
    const nodeIds = ids.filter((_, i) => isPointInsidePolygon(positions[i], ring));

    // Freeze the metaball connect-gap budget from how loosely this
    // contour was drawn around its members - see {@link PolygonRegion.reach}.
    const reach = this._averageDistanceToRing(ring, memberPositions);

    const region: PolygonRegion = {
      nodeIds,
      padding: options?.padding ?? REGION_DEFAULT_PADDING,
      reach
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
    // Which polygons need a reshape this batch. Unlike the old growth
    // model, a full recompute reads *every* current member's position
    // regardless of which one moved, so this only needs to track which
    // polygons are touched, not which specific nodes moved.
    const touched = new Set<Id>();

    ids.forEach((nodeId) => {
      const owningRegions = this.nodeToRegions.get(nodeId);
      if (owningRegions && owningRegions.size > 0) {
        // Sticky member: always follow, no containment check needed.
        owningRegions.forEach((polygonId) => touched.add(polygonId));
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
        touched.add(polygon.id);
      });
    });

    if (touched.size > 0) this._reshapeAndCommit(touched);
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

  // --- reshaping: full metaball recompute from current member positions ---

  private _reshapeAndCommit(polygonIds: Set<Id>) {
    const state = this.store.getState();
    const updates: Record<Id, DeepPartial<Annotation>> = {};

    polygonIds.forEach((polygonId) => {
      // Merged (committed + live) so a rapid burst of debounced frames
      // reads the *latest* metadata rather than a stale committed base.
      const polygon = state.getMergedFeature(polygonId);
      if (!polygon || !isPolygon(polygon) || !polygon.properties.region) return;

      const region = polygon.properties.region;
      const padding = region.padding ?? REGION_DEFAULT_PADDING;
      const reach = region.reach ?? REGION_METABALL_DEFAULT_REACH;
      const memberIds = Array.from(this.membership.get(polygonId) ?? []);
      if (memberIds.length === 0) return;

      const xyr = this.ogma.getNodes(memberIds).getAttributes([
        "x",
        "y",
        "radius"
      ]) as XYR[];
      const ring = this._computeMetaballRing(xyr, padding, reach);
      if (!ring) return;

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
   * Builds a region's ring from scratch: a padded circle per member plus a
   * {@link buildMetaballConnector} for every pair close enough to blend,
   * all unioned together.
   *
   * Every member has to end up enclosed by the *one* ring a `Polygon`
   * feature can hold — sticky membership means "stays visually contained",
   * not "drops out once it's inconvenient" — so a union-find over the
   * in-range connectors tracks which members are still geometrically
   * separate afterwards, and each remaining gap gets exactly one bridging
   * weld to its nearest other cluster (never the full O(n^2) mesh, which
   * would read as spaghetti again). The weld reuses the *same* metaball
   * connector shape with its distance cutoff lifted, rather than falling
   * back to the old rigid straight corridor — so even a member dragged far
   * away gets one smooth tapered neck instead of a straight tunnel.
   */
  private _computeMetaballRing(
    members: XYR[],
    padding: number,
    maxGap: number
  ): Ring | undefined {
    const n = members.length;
    if (n === 0) return undefined;
    const circles = members.map(({ x, y, radius }) => ({
      x,
      y,
      r: (radius || 0) + padding
    }));
    if (n === 1) return this._buildCircle(circles[0].x, circles[0].y, circles[0].r);

    const shapes: Ring[] = circles.map((c) => this._buildCircle(c.x, c.y, c.r));

    const parent = circles.map((_, i) => i);
    const find = (i: number): number =>
      parent[i] === i ? i : (parent[i] = find(parent[i]));
    const union = (a: number, b: number) => {
      const ra = find(a);
      const rb = find(b);
      if (ra !== rb) parent[ra] = rb;
    };

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const connector = buildMetaballConnector(
          circles[i],
          circles[j],
          REGION_METABALL_SPREAD,
          REGION_METABALL_HANDLE_SIZE,
          maxGap,
          REGION_METABALL_SEGMENTS
        );
        if (connector) {
          shapes.push(this._closeRing(connector));
          union(i, j);
        }
      }
    }

    // Weld remaining clusters together, closest gap first, until fully
    // connected — at most n-1 extra welds.
    let rootCount = new Set(circles.map((_, i) => find(i))).size;
    while (rootCount > 1) {
      let closest: { i: number; j: number; d: number } | undefined;
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          if (find(i) === find(j)) continue;
          const d = Math.hypot(circles[i].x - circles[j].x, circles[i].y - circles[j].y);
          if (!closest || d < closest.d) closest = { i, j, d };
        }
      }
      if (!closest) break;
      const weld = buildMetaballConnector(
        circles[closest.i],
        circles[closest.j],
        REGION_METABALL_SPREAD,
        REGION_METABALL_HANDLE_SIZE,
        Infinity, // unbounded: this pair must connect regardless of distance
        REGION_METABALL_SEGMENTS
      );
      if (weld) shapes.push(this._closeRing(weld));
      union(closest.i, closest.j);
      rootCount = new Set(circles.map((_, i) => find(i))).size;
    }

    const components = this._collapseRings(shapes);
    if (components.length === 0) return undefined;
    if (components.length === 1) return components[0];
    // Guaranteed connected by construction above; only reachable if
    // martinez itself failed to union two overlapping shapes (numerical
    // edge case) — fall back to the largest piece rather than throwing.
    return components.reduce((best, ring) =>
      this._ringArea(ring) > this._ringArea(best) ? ring : best
    );
  }

  /** Repeatedly unions overlapping/connected rings together until no pair
   *  merges any further (fixed point) — order-independent, so it doesn't
   *  matter which circle or connector was pushed first. Membership counts
   *  are small, so the worst-case O(n^2) union attempts stay cheap. */
  private _collapseRings(rings: Ring[]): Ring[] {
    let list = rings;
    let merged = true;
    while (merged) {
      merged = false;
      for (let i = 0; i < list.length && !merged; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const union = this._unionRings(list[i], list[j]);
          if (union) {
            list = [union, ...list.filter((_, k) => k !== i && k !== j)];
            merged = true;
            break;
          }
        }
      }
    }
    return list;
  }

  private _ringArea(ring: Ring): number {
    let sum = 0;
    for (let i = 0; i < ring.length - 1; i++)
      sum += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
    return Math.abs(sum) / 2;
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

  /** Average, over `points`, of each point's distance to its nearest point
   *  on `ring` — used once, at `createRegion`/`trackRegionNodes` time, to
   *  freeze {@link PolygonRegion.reach} from how loosely the initial shape
   *  was drawn around its members. */
  private _averageDistanceToRing(ring: Ring, points: Point[]): number {
    if (points.length === 0) return REGION_METABALL_DEFAULT_REACH;
    const total = points.reduce((sum, p) => sum + this._distanceToRing(ring, p), 0);
    return total / points.length;
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

  /** Union two closed rings; returns the merged ring only when the result
   *  is a single connected polygon with no interior hole (undefined if it
   *  came out disjoint). A hole can legitimately appear when members form
   *  a ring shape (each only blending with its neighbors) — same "one
   *  solid boundary, no see-through gap" policy drops it and keeps the
   *  exterior, rather than surfacing a hollow region. Simplified
   *  afterwards — repeated near-tangent unions otherwise pile up
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
   *  at {@link createRegion} time — ongoing reshaping never touches this,
   *  it's a metaball recompute over current member positions instead. */
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
