import type Ogma from "@linkurious/ogma";
import type {
  CanvasLayer,
  LayoutEndEvent,
  Node,
  NodeList,
  NodesDragProgressEvent,
  Point
} from "@linkurious/ogma";
import EventEmitter from "eventemitter3";
import {
  EVT_ADD,
  EVT_CANCEL_DRAWING,
  EVT_DRAG,
  EVT_DRAG_END,
  EVT_DRAG_START,
  EVT_LINK,
  EVT_REMOVE,
  EVT_SELECT,
  EVT_UNSELECT,
  EVT_UPDATE
} from "./constants";
import { Arrows, createArrow } from "./Editor/Arrows";
import type { Editor } from "./Editor/base";
import { Texts } from "./Editor/Texts";
import { Links } from "./links";
import {
  Annotation,
  AnnotationCollection,
  Arrow,
  ControllerOptions,
  FeatureEvents,
  Id,
  Text,
  isAnnotationCollection,
  isArrow,
  isText,
  Link
} from "./types";

import {
  getArrowEnd,
  getArrowStart,
  getArrowSide,
  getTextPosition,
  getTextSize,
  setArrowEndPoint,
  getAttachmentPointOnNode,
  setTextBbox
} from "./utils";
import { subtract, rotateRadians, add, multiply, length } from "./vec";

const defaultOptions: ControllerOptions = {
  magnetColor: "#3e8",
  detectMargin: 20,
  magnetHandleRadius: 5,
  magnetRadius: 10,
  textPlaceholder: "Type here",
  arrowHandleSize: 3.5,
  textHandleSize: 3.5,
  minArrowHeight: 20,
  maxArrowHeight: 30
};

type EndType = "start" | "end";
const ends: EndType[] = ["start", "end"];

// TODO: move to methods
const MAGNETS: Point[] = [
  { x: 0, y: 0 },
  { x: 0.5, y: 0 },
  { x: 1, y: 0 },
  { x: 0, y: 0.5 },
  { x: 1, y: 0.5 },
  { x: 0, y: 1 },
  { x: 0.5, y: 1 },
  { x: 1, y: 1 }
];

type MagnetPoint = {
  point: Point;
  magnet: Point;
};

export class Control extends EventEmitter<FeatureEvents> {
  private arrows: Arrows;
  private texts: Texts;
  private links = new Links();
  private layer: CanvasLayer;
  private annotations: Editor<Annotation>[];
  private ogma: Ogma;
  private options: ControllerOptions;
  private selected: Annotation | null = null;
  private updateTimeout = 0;
  private hoveredNode: Node | null = null;

  private dragged: Arrow | null = null;
  private textToMagnet: Text | undefined = undefined;
  private activeLinks: Link[] = [];

  constructor(ogma: Ogma, options: Partial<ControllerOptions> = {}) {
    super();
    this.options = this.setOptions({ ...defaultOptions, ...options });
    this.ogma = ogma;
    this.arrows = new Arrows(ogma, this.options);
    this.texts = new Texts(ogma, this.options);
    this.annotations = [this.arrows, this.texts];

    this.annotations.forEach((a) => {
      a.on(EVT_DRAG_START, this._onFeatureDragStart)
        .on(EVT_DRAG, this._onFeatureDrag)
        .on(EVT_DRAG_END, this._onFeatureDragEnd)
        .on(EVT_UPDATE, this.onUpdate)
        .on(EVT_UNSELECT, this._onUnselect)
        .on(EVT_SELECT, this._onSelect)
        .on(EVT_ADD, this._onAdded)
        .on(EVT_REMOVE, this._onRemoved);
    });

    this.ogma.events
      .on("nodesDragStart", this._onNodesDragStart)
      .on("nodesDragProgress", this._onNodesDrag)
      .on("layoutEnd", this._onLayoutEnd)
      .on(["viewChanged", "rotate"], () => {
        this.refreshTextLinks();
      });

    this.layer = ogma.layers.addCanvasLayer(this._render);
    this.layer.moveToBottom();
  }

  private _render = (ctx: CanvasRenderingContext2D) => {
    if (!this.dragged || this.textToMagnet === undefined) return;
    ctx.beginPath();
    ctx.fillStyle = "green";
    const z = this.ogma.view.getZoom();
    MAGNETS.forEach((magnet) => {
      if (!this.textToMagnet) return;
      const size = getTextSize(this.textToMagnet);
      const position = getTextPosition(this.textToMagnet);

      const a = multiply(magnet, { x: size.width, y: size.height });
      const r = rotateRadians(a, this.ogma.view.getAngle());
      const { x, y } = add(r, position);

      ctx.moveTo(x, y);
      ctx.arc(x, y, this.options.magnetHandleRadius / z, 0, Math.PI * 2);
    });
    ctx.fill();
    ctx.closePath();
  };

  private _onFeatureDrag = (a: Annotation, key: EndType | "line" | "text") => {
    const h = key;
    if (isArrow(a) && h === "line") {
      ["start", "end"].find((side) => {
        const point = side === "start" ? getArrowStart(a) : getArrowEnd(a);
        const snapped = this._snapToText(a, h as EndType, point);
        return snapped || this._findAndSnapToNode(a, side as EndType, point);
      });
    } else if (isArrow(a) && h !== "line") {
      const point = h === "start" ? getArrowStart(a) : getArrowEnd(a);
      const snapped = this._snapToText(a, h as EndType, point);
      // if no text is detected and option is on, we to snap to node
      if (!snapped) this._findAndSnapToNode(a, h as EndType, point);
    } else if (isText(a)) {
      this.activeLinks.forEach(({ arrow: id, side, connectionPoint }) => {
        const arrow = this.getAnnotation(id) as Arrow;
        const size = getTextSize(a);
        const position = getTextPosition(a);

        const m = multiply(connectionPoint!, { x: size.width, y: size.height });
        const r = rotateRadians(m, this.ogma.view.getAngle());
        const pt = add(r, position);

        arrow.geometry.coordinates[side === "start" ? 0 : 1] = [pt.x, pt.y];
      });
      if (this.activeLinks.length) this.arrows.refreshLayer();
    }
    this.layer.refresh();
    this.emit(EVT_DRAG, a, key);
  };

  private _onFeatureDragEnd = (a: Annotation) => {
    if (this.dragged !== null && isArrow(a) && getArrowStart(this.dragged)) {
      ends.forEach((side) => {
        const link = this.links.getArrowLink(a.id, side);
        if (link) {
          this.emit(EVT_LINK, {
            arrow: a,
            link: this.links.getArrowLink(a.id, side)!
          });
        }
      });
    }
    if (isText(a) || isArrow(a)) this.onUpdate(a);

    this.dragged = null;
    this.activeLinks = [];
    this.textToMagnet = undefined;
    this.annotations.forEach((o) => o.enableDetection());
    this.layer.refresh();
    this.emit(EVT_DRAG_END, a);
  };

  private _onFeatureDragStart = (d: Annotation) => {
    this.textToMagnet = undefined;
    if (isArrow(d)) this.dragged = d as Arrow;
    else if (isText(d))
      this.activeLinks.push(...this.links.getTargetLinks(d.id, "text"));
    this.annotations.forEach((a) => {
      const selected = a.getSelectedFeature();
      if (selected && selected !== d) a.unhover().unselect();
      a.disableDetection();
    });
    this.emit(EVT_DRAG_START, d);
  };

  private _onNodesDragStart = () => {
    this.arrows.unhover().unselect();
    this.texts.unhover().unselect();
  };

  private _onNodesDrag = (evt: NodesDragProgressEvent<unknown, unknown>) => {
    const { dx, dy } = evt;
    this._moveNodes(evt.nodes, dx, dy);
  };

  private _onLayoutEnd = (evt: LayoutEndEvent) => {
    evt.ids.forEach((id, i) => {
      const links = this.links.getTargetLinks(id, "node");
      links.forEach((link) => {
        const arrow = this.getAnnotation(link.arrow) as Arrow;
        const side = link.side;
        const otherSide = getArrowSide(
          arrow,
          side === "start" ? "end" : "start"
        );
        // @ts-expect-error Incomplete types in Ogma
        const point = evt.positions.current[i];
        const radius = this.ogma.getNode(id)!.getAttribute("radius");
        const anchor = getAttachmentPointOnNode(otherSide, point, +radius);
        setArrowEndPoint(arrow, side, anchor.x, anchor.y);
      });
    });
    this.arrows.refreshLayer();
    this.texts.refreshLayer();
  };

  private _moveNodes(nodes: NodeList, dx: number, dy: number) {
    nodes.forEach((node) => {
      const links = this.links.getTargetLinks(node.getId(), "node");
      const pos = node.getPosition();
      links.forEach((link) => {
        const arrow = this.getAnnotation(link.arrow) as Arrow;
        const side = link.side;
        const otherSide = getArrowSide(
          arrow,
          side === "start" ? "end" : "start"
        );

        let anchor = pos; // graph space
        const r = +node.getAttribute("radius");
        const eps = 1e-6;
        if (
          link.connectionPoint.x - (pos.x - dx) > eps ||
          link.connectionPoint.y - (pos.y - dy) > eps
        ) {
          anchor = getAttachmentPointOnNode(otherSide, pos, r);
        }
        setArrowEndPoint(arrow, side, anchor.x, anchor.y);
      });
    });
    this.arrows.refreshLayer();
  }

  private _snapToText(arrow: Arrow, side: EndType, point: Point) {
    const text = this.texts.detect(point, this.options.detectMargin);
    this.links.remove(arrow, side);
    if (!text) return false;
    this.textToMagnet = text;
    const anchor = this.findMagnetPoint(MAGNETS, text, point);
    if (anchor) {
      setArrowEndPoint(arrow, side, anchor.point.x, anchor.point.y);
      this.links.add(arrow, side, text.id, "text", anchor.magnet);
      return true;
    }
    return false;
  }

  private _findAndSnapToNode(arrow: Arrow, side: EndType, point: Point) {
    const screenPoint = this.ogma.view.graphToScreenCoordinates(point);
    const element = this.ogma.view.getElementAt(screenPoint);
    this.links.remove(arrow, side);
    if (element && element.isNode) {
      this.hoveredNode?.setSelected(false);
      this.hoveredNode = element;
      element.setSelected(true);
      // if close to the node border, snap to it
      this._snapToNode(arrow, side, element, screenPoint);
    } else {
      this.hoveredNode?.setSelected(false);
      this.hoveredNode = null;
    }
  }

  private _snapToNode(
    arrow: Arrow,
    side: EndType,
    node: Node,
    screenPoint: Point
  ) {
    const pos = node.getPositionOnScreen();
    const r = +node.getAttribute("radius");
    const rpx = r * this.ogma.view.getZoom();
    const dx = screenPoint.x - pos.x;
    const dy = screenPoint.y - pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const nodeCenter = node.getPosition();

    // clever snapping, center if close to center, otherwise snap
    // to border if close to it. Currently just somple way
    if (dist < rpx + this.options.detectMargin) {
      let anchor = nodeCenter; // graph space
      if (dist > rpx / 2) {
        const otherEnd = getArrowSide(arrow, side === "end" ? "start" : "end");
        anchor = getAttachmentPointOnNode(otherEnd, anchor, r);
      }
      setArrowEndPoint(arrow, side, anchor.x, anchor.y);
      this.links.add(arrow, side, node.getId(), "node", anchor);
    }
    // TODO: handle the other endpoint, if it's connected to a node
  }

  private _onAdded = (annotation: Annotation) => {
    this.emit(EVT_ADD, annotation);
  };

  private _onRemoved = (annotation: Annotation) => {
    this.emit(EVT_REMOVE, annotation);
  };

  private _onUnselect = (annotation: Annotation) => {
    this.selected = null;
    this.emit(EVT_UNSELECT, annotation);
  };

  private _onSelect = (annotation: Annotation) => {
    if (this.selected === annotation) return;
    this.selected = annotation;
    this.emit(EVT_SELECT, this.selected);
  };

  private refreshTextLinks() {
    let shouldRefresh = false;
    this.links.forEach(
      ({ connectionPoint, targetType, target, arrow, side }) => {
        if (targetType !== "text") return;
        shouldRefresh = true;

        const text = this.getAnnotation(target) as Text;
        const a = this.getAnnotation(arrow) as Arrow;
        const size = getTextSize(text);
        const position = getTextPosition(text);

        const m = multiply(connectionPoint!, { x: size.width, y: size.height });
        const r = rotateRadians(m, this.ogma.view.getAngle());
        const point = add(r, position);
        setArrowEndPoint(a, side, point.x, point.y);
      }
    );
    if (!shouldRefresh) return;
    this.arrows.refreshLayer();
  }

  /**
   * @returns the currently selected annotation
   */
  public getSelected() {
    return this.selected;
  }

  private findMagnetPoint(magnets: Point[], textToMagnet: Text, point: Point) {
    let res: MagnetPoint | undefined;
    for (const magnet of magnets) {
      const size = getTextSize(textToMagnet);
      const position = getTextPosition(textToMagnet);
      const m = multiply(magnet, { x: size.width, y: size.height });
      const r = rotateRadians(m, this.ogma.view.getAngle());
      const mPoint = add(r, position);
      const dist = length(subtract(mPoint, point));
      const scaledRadius = Math.min(
        this.options.magnetRadius * this.ogma.view.getZoom(),
        // when really zoomed in: avoid to snap on too far away magnets
        size.width / 2,
        size.height / 2
      );
      if (dist < Math.max(scaledRadius, this.options.magnetHandleRadius)) {
        res = {
          point: mPoint,
          magnet
        };
        break;
      }
    }
    return res;
  }

  /**
   * Set the options for the controller
   * @param options new Options
   * @returns the updated options
   */
  public setOptions(options: Partial<ControllerOptions> = {}) {
    this.options = {
      ...(this.options || {}),
      ...options
    } as ControllerOptions;
    return this.options;
  }
  /**
   * Selects the annotation with the given id
   * @param id the id of the annotation to select
   */
  public select(id: Id): this {
    const annotation = this.getAnnotations().features.find((a) => a.id === id);
    if (!annotation) return this;
    if (isArrow(annotation)) this.arrows.select(annotation.id);
    else if (isText(annotation)) this.texts.select(annotation.id);
    return this;
  }
  /**
   * Unselects the currently selected annotation
   */
  public unselect(): this {
    if (!this.selected) return this;
    if (isArrow(this.selected)) this.arrows.unselect();
    else if (isText(this.selected)) this.texts.unselect();
    return this;
  }
  /**
   * Add an annotation to the controller
   * @param annotation The annotation to add
   */
  public add(annotation: Annotation | AnnotationCollection): this {
    if (isAnnotationCollection(annotation)) {
      const [texts, arrows] = annotation.features.reduce(
        (acc, f) => {
          if (isArrow(f)) acc[1].push(f);
          else if (isText(f)) acc[0].push(f);
          return acc;
        },
        [[], []] as [Text[], Arrow[]]
      );
      // Add texts first to make sure that arrows can snap to them
      texts.forEach((f) => this.add(f as unknown as Annotation));
      arrows.forEach((f) => this.add(f as unknown as Annotation));
      this.arrows.refreshLayer();
      return this;
    }
    switch (annotation.properties.type) {
      case "text":
        this.texts.add(annotation as unknown as Text);
        break;
      // more to follow
      default:
        this.arrows.add(annotation as unknown as Arrow);
        this.loadLink(annotation as unknown as Arrow);
        break;
    }
    return this;
  }
  /**
   * Remove an annotation or an array of annotations from the controller
   * @param annotation The annotation(s) to remove
   */
  public remove(annotation: Annotation | AnnotationCollection): this {
    if (isAnnotationCollection(annotation)) {
      annotation.features.forEach((f) =>
        this.remove(f as unknown as Annotation)
      );
      return this;
    } else if (isArrow(annotation)) {
      this.links.remove(annotation, "start");
      this.links.remove(annotation, "end");
      this.arrows.remove(annotation.id);
    } else {
      this.texts.remove(annotation.id);
    }
    return this;
  }

  private loadLink(arrow: Arrow) {
    if (!arrow.properties.link) return;
    for (const side of ends) {
      const link = arrow.properties.link[side];
      if (!link) continue;
      const targetText = this.getAnnotation(link.id);
      if (link.type === "text" && targetText) {
        this.links.add(arrow, side, link.id, link.type, link.magnet!);
      } else if (link.type === "node") {
        const targetNode = this.ogma.getNode(link.id);
        if (!targetNode) continue;
        this.links.add(arrow, side, link.id, link.type, link.magnet!);
        const point = targetNode.getPosition();
        const radius = targetNode!.getAttribute("radius") || 0;
        const otherSide = getArrowSide(
          arrow,
          side === "start" ? "end" : "start"
        );
        const anchor = getAttachmentPointOnNode(otherSide, point, +radius);
        setArrowEndPoint(arrow, side, anchor.x, anchor.y);
      }
    }
  }

  /**
   * Start adding an arrow (add it, and give control to the user)
   * @param x coord of the first point
   * @param y coord of the first point
   * @param arrow The arrow to add
   */
  public startArrow(x: number, y: number, arrow?: Arrow) {
    this.cancelDrawing();
    this.arrows.startDrawing(x, y, arrow);
  }

  public startComment(px: number, py: number, text?: Text) {
    const zoom = this.ogma.view.getZoom();
    const distance = 120 * zoom;
    // we need to find the best spot for the comment, following the heuristics:
    // 1. it has to be on screen
    // 2. it has to be at least `distance` pixels away from the x,y
    // 3. it should not overlap other texts
    const { width, height } = this.ogma.view.getSize();
    // let's try to find a good position, stepping by distance pixels
    // and checking if the position is free and on screen. Every iteration
    // we will rotate the vector by 45 degrees
    const angleStep = Math.PI / 8; // 22.5 degrees
    let angle = 0;
    let position: Point | undefined;
    const size = getTextSize(text!);

    const { x, y } = this.ogma.view.screenToGraphCoordinates({ x: px, y: py });

    const w = size.width / zoom;
    const h = size.height / zoom;

    const tl = this.ogma.view.screenToGraphCoordinates({ x: 0, y: 0 });
    const br = this.ogma.view.screenToGraphCoordinates({
      x: width,
      y: height
    });
    const box = {
      minX: x,
      minY: y - h / 2,
      maxX: x + w,
      maxY: y + h / 2
    };
    while (angle < Math.PI * 2) {
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;
      const newX = x + dx;
      const newY = y + dy;

      // now let's try to place the text box knowing it's size
      // the distance shoulbe to from the center to the closest edge
      // so we need to move the center by half the width and height

      box.minX = newX;
      box.minY = newY - h / 2;
      box.maxX = newX + w;
      box.maxY = newY + h / 2;

      // if on the opposite side of the point, we need to move the box
      if (dx < 0) {
        box.minX -= w;
        box.maxX -= w;
      }

      // check if the position is on screen and not overlapping other texts
      if (
        box.minX < tl.x ||
        box.minY < tl.y ||
        box.maxX > br.x ||
        box.maxY > br.y ||
        this.texts.detect({ x: newX, y: newY }, this.options.detectMargin)
      ) {
        angle += angleStep;
        continue;
      } else {
        position = { x: newX, y: newY };
        break;
      }
    }
    this.cancelDrawing();
    if (position) {
      const line = createArrow(x, y, position.x, position.y);
      this.arrows.add(line);
      setTextBbox(
        text!,
        box.minX,
        box.minY,
        box.maxX - box.minX,
        box.maxY - box.minY
      );
      this.texts.add(text!);
      //this.texts.startDrawing(position.x, position.y, text);
      this.links.add(line, "end", text!.id, "text", position);
    }
  }

  /**
   * Start adding a text (add it, and give control to the user)
   * @param x coord of the top left point
   * @param y coord of the top left point
   * @param text The text to add
   */
  public startText(x: number, y: number, text?: Text) {
    this.cancelDrawing();
    this.texts.startDrawing(x, y, text);
  }

  /**
   * Cancel drawing on the current frame
   */
  public cancelDrawing() {
    this.annotations.forEach((o) => o.cancelDrawing());
    this.emit(EVT_CANCEL_DRAWING);
  }

  /**
   * Triggers the update event on the annotation
   * @param annotation The annotation updated
   */
  public onUpdate = (annotation: Annotation) => {
    cancelAnimationFrame(this.updateTimeout);
    this.updateTimeout = requestAnimationFrame(() =>
      this._onUpdate(annotation)
    );
  };

  private _onUpdate = (annotation: Annotation) => {
    this.emit(EVT_UPDATE, annotation);
  };

  /**
   * Update the style of the annotation with the given id
   * @param id The id of the annotation to update
   * @param style The new style
   */
  public updateStyle<A extends Annotation>(
    id: Id,
    style: A["properties"]["style"]
  ): this {
    const annotation = this.getAnnotations().features.find((a) => a.id === id);
    if (!annotation) return this;
    if (isArrow(annotation)) this.arrows.updateStyle(annotation, style);
    else if (isText(annotation)) this.texts.updateStyle(annotation, style);
    this.onUpdate(annotation);
    return this;
  }

  public setScale(id: Id, scale: number, ox: number, oy: number) {
    const annotation = this.getAnnotations().features.find((a) => a.id === id);
    if (!annotation) return this;
    if (isArrow(annotation)) this.arrows.scale(annotation, scale, ox, oy);
    else if (isText(annotation)) this.texts.scale(annotation, scale, ox, oy);
    this.onUpdate(annotation);
    return this;
  }

  /**
   * @returns the annotations in the controller
   */
  public getAnnotations() {
    const collection: AnnotationCollection = {
      type: "FeatureCollection",
      features: []
    };
    this.annotations.forEach((editor) => {
      collection.features = [...collection.features, ...editor.getElements()];
    });
    return collection;
  }

  /**
   * Retrieve the annotation with the given id
   * @param id the id of the annotation to get
   * @returns The annotation with the given id
   */
  public getAnnotation(id: Id) {
    return this.getAnnotations().features.find((a) => a.id === id);
  }

  /**
   * Destroy the controller and its elements
   */
  public destroy() {
    this.annotations.forEach((o) => o.destroy());
    this.layer.destroy();
  }
}
