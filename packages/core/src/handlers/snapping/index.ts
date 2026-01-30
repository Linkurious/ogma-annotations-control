import type { Ogma, Node, Point } from "@linkurious/ogma";
import { snapToEdges, EdgeSnap } from "./edge";
import { snapToNodes, NodeSnap } from "./node";
import { snapToPolygon, PolygonSnap } from "./polygon";
import { snapToText, TextSnap, MAGNETS } from "./text";

import { Index } from "../../interaction/spatialIndex";
import { Store } from "../../store";
import { Text, Polygon, isBox, isText, isPolygon } from "../../types";


export type { TextSnap } from "./text";
export type { PolygonSnap } from "./polygon";
export type { NodeSnap } from "./node";
export type { EdgeSnap } from "./edge";

export type Snap = TextSnap | PolygonSnap | NodeSnap | EdgeSnap;

type SnappingOptions = {
  /**
   * The radius in which arrows are attracted
   */
  magnetRadius: number;
  /**
   * The margin in which the Texts are detected when looking for magnet points
   */
  detectMargin: number;
  /**
   * Display size of the magnet point
   */
};

export class Snapping extends EventTarget {
  private ogma: Ogma;
  private options: SnappingOptions;
  private spatialIndex: Index;
  private hoveredNode: Node | null = null;
  private store: Store;

  constructor(
    ogma: Ogma,
    options: SnappingOptions,
    spatialIndex: Index,
    store: Store
  ) {
    super();
    this.ogma = ogma;
    this.options = options;
    this.spatialIndex = spatialIndex;
    this.store = store;
  }

  public snap(position: Point) {
    const snapping = this.findMagnet(position);
    if (!snapping) return null;
    return snapping;
  }

  private findMagnet(point: Point) {
    const detectMargin = this.options.detectMargin;
    const snapWindow = {
      minX: point.x - detectMargin,
      minY: point.y - detectMargin,
      maxX: point.x + detectMargin,
      maxY: point.y + detectMargin
    };
    const features = this.spatialIndex.search(snapWindow);
    const texts = features.filter((a) => isText(a) || isBox(a)) as Text[];
    const polygons = features.filter((a) => isPolygon(a)) as Polygon[];

    const { nodes, edges } = this.ogma.view.getElementsInside(
      snapWindow.minX,
      snapWindow.minY,
      snapWindow.maxX,
      snapWindow.maxY
    );

    const snapToNodeResult = this.snapToNodes(point, nodes);
    if (snapToNodeResult) return snapToNodeResult;

    const snapToEdgeResult = this.snapToEdges(point, edges);
    if (snapToEdgeResult) return snapToEdgeResult;

    const snapToTextResult = this.snapToText(point, texts);
    if (snapToTextResult) return snapToTextResult;

    const snapToPolygonResult = this.snapToPolygon(point, polygons);
    if (snapToPolygonResult) return snapToPolygonResult;

    return null;
  }

  public snapToText(point: Point, texts: Text[]): TextSnap | null {
    const { zoom } = this.store.getState();
    return snapToText(point, texts, zoom, this.options.magnetRadius, this.store);
  }

  public snapToPolygon(point: Point, polygons: Polygon[]): PolygonSnap | null {
    return snapToPolygon(point, polygons, this.options.magnetRadius);
  }

  public snapToNodes(point: Point, nodes: Parameters<typeof snapToNodes>[1]): NodeSnap | null {
    return snapToNodes(point, nodes, this.options.detectMargin);
  }

  public snapToEdges(
    point: Point,
    edges: Parameters<typeof snapToEdges>[1],
  ): EdgeSnap | null {
    return snapToEdges(point, edges, this.options.magnetRadius);
  }

  public getHoveredNode(): Node | null {
    return this.hoveredNode;
  }

  public clearHoveredNode(): void {
    this.hoveredNode?.setSelected(false);
    this.hoveredNode = null;
  }

  public getMagnets(): Point[] {
    return MAGNETS;
  }
}
