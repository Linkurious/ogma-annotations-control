import type { NodeList, Ogma, Point, NodesEvent } from "@linkurious/ogma";
import concaveman from "concaveman";
import type { BBox } from "rbush";
import {
  REGION_COMMIT_DEBOUNCE_MS,
  REGION_DEFAULT_CONCAVITY,
  REGION_DEFAULT_PADDING,
  REGION_HULL_POINTS_PER_NODE
} from "../constants";
import { Index } from "../interaction/spatialIndex";
import { Store } from "../store";
import type { Annotation, DeepPartial, Id, Polygon, PolygonRegion, PolygonStyle } from "../types";
import { createPolygon, isPolygon } from "../types";
import { isPointInsidePolygon } from "./snapping/polygon";
import { getBbox } from "../utils/utils";
import { updatePolygonBbox } from "../utils/polygon";

type XYR = { x: number; y: number; radius: number };

/**
 * Tracks polygons acting as live node-containment "regions" and keeps their
 * ring reshaped (a padded concave hull) around their member nodes.
 *
 * Membership is sticky and geometric: a node becomes a member either by
 * being listed in `polygon.properties.region.nodeIds` when tracking starts,
 * or by being dragged into an already-tracked polygon's current boundary
 * (join-on-entry). Once a member, a node stays tracked — moving it away
 * makes the region follow/reshape to keep enclosing it — until it's removed
 * from the graph or the polygon stops being tracked.
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
   * Create a new region polygon that hulls around the given nodes' current
   * positions, and starts tracking them.
   */
  public createRegion(
    nodeIds: Id[],
    options?: { padding?: number; concavity?: number; style?: PolygonStyle }
  ): Polygon {
    if (nodeIds.length === 0)
      throw new Error("createRegion requires at least one node id");

    const padding = options?.padding ?? REGION_DEFAULT_PADDING;
    const concavity = options?.concavity ?? REGION_DEFAULT_CONCAVITY;
    const region: PolygonRegion = { nodeIds: [...nodeIds], padding, concavity };
    const ring = this._computeRing(nodeIds, region)!;

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
   */
  public trackRegionNodes(
    polygonId: Id,
    options?: { padding?: number; concavity?: number }
  ): void {
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
      padding: options?.padding ?? REGION_DEFAULT_PADDING,
      concavity: options?.concavity ?? REGION_DEFAULT_CONCAVITY
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
    const regionsToReshape = new Set<Id>();
    ids.forEach((nodeId) => {
      const regions = this.nodeToRegions.get(nodeId);
      if (!regions) return;
      regions.forEach((polygonId) => {
        this.membership.get(polygonId)?.delete(nodeId);
        regionsToReshape.add(polygonId);
      });
      this.nodeToRegions.delete(nodeId);
    });
    if (regionsToReshape.size) this._reshapeAndCommit(regionsToReshape);
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
    const regionsToReshape = new Set<Id>();

    ids.forEach((nodeId) => {
      const owningRegions = this.nodeToRegions.get(nodeId);
      if (owningRegions && owningRegions.size > 0) {
        // Sticky member: always follow, no containment check needed.
        owningRegions.forEach((polygonId) => regionsToReshape.add(polygonId));
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
        regionsToReshape.add(polygon.id);
      });
    });

    if (regionsToReshape.size > 0) this._reshapeAndCommit(regionsToReshape);
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

  // --- reshaping ---

  private _reshapeAndCommit(polygonIds: Set<Id>) {
    const state = this.store.getState();
    const updates: Record<Id, DeepPartial<Annotation>> = {};

    polygonIds.forEach((polygonId) => {
      const polygon = state.getFeature(polygonId);
      if (!polygon || !isPolygon(polygon) || !polygon.properties.region) return;

      const region = polygon.properties.region;
      const memberIds = Array.from(this.membership.get(polygonId) ?? []);
      if (memberIds.length === 0) return;

      const ring = this._computeRing(memberIds, region);
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

  /** Concave hull ring around padded circles for each member node. */
  private _computeRing(
    nodeIds: Id[],
    region: Pick<PolygonRegion, "padding" | "concavity">
  ): number[][] | undefined {
    const points = this._collectHullInputPoints(nodeIds, region);
    if (points.length < 3) return undefined;
    const concavity = region.concavity ?? REGION_DEFAULT_CONCAVITY;
    return concaveman(points, concavity);
  }

  private _collectHullInputPoints(
    nodeIds: Id[],
    region: Pick<PolygonRegion, "padding">
  ): number[][] {
    const nodes = this.ogma.getNodes(nodeIds);
    const xyr = nodes.getAttributes(["x", "y", "radius"]) as XYR[];
    const padding = region.padding ?? REGION_DEFAULT_PADDING;
    const points: number[][] = [];
    xyr.forEach(({ x, y, radius }) => {
      const r = (radius || 0) + padding;
      for (let k = 0; k < REGION_HULL_POINTS_PER_NODE; k++) {
        const angle = (k / REGION_HULL_POINTS_PER_NODE) * Math.PI * 2;
        points.push([x + r * Math.cos(angle), y + r * Math.sin(angle)]);
      }
    });
    return points;
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
