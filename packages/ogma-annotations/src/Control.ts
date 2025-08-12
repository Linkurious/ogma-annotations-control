import type Ogma from "@linkurious/ogma";
import type {
  CanvasLayer,
  LayoutEndEvent,
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
import { ArrowsEditor, createArrow } from "./Editor/Arrows";
import type { Editor } from "./Editor/base";
import { BoxesEditor } from "./Editor/Box";
import { TextsEditor } from "./Editor/Texts";
import { Links } from "./links";
import { Snapping } from "./snapping";
import { Storage } from "./storage";
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
  Link,
  isBox,
  Box
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
import { rotateRadians, add, multiply } from "./vec";

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

export class Control extends EventEmitter<FeatureEvents> {
  private arrows: ArrowsEditor;
  private texts: TextsEditor;
  private boxes: BoxesEditor<Box>;
  private links: Links;
  private layer: CanvasLayer;
  private annotations: Editor<Annotation>[];
  private ogma: Ogma;
  private options: ControllerOptions;
  private selected: Annotation | null = null;
  private updateTimeout = 0;
  private snappingManager: Snapping;
  private storage: Storage = new Storage();

  private dragged: Arrow | null = null;
  private textToMagnet: Text | undefined = undefined;
  private activeLinks: Link[] = [];

  constructor(ogma: Ogma, options: Partial<ControllerOptions> = {}) {
    super();
    this.options = this.setOptions({ ...defaultOptions, ...options });
    this.ogma = ogma;

    // editors
    this.arrows = new ArrowsEditor(
      ogma,
      this.storage.createCollection(),
      this.options
    );
    this.texts = new TextsEditor(
      ogma,
      this.storage.createCollection(),
      this.options
    );
    this.boxes = new BoxesEditor(
      ogma,
      this.storage.createCollection(),
      this.options
    );

    this.links = new Links(ogma);

    this.annotations = [this.arrows, this.texts, this.boxes];
    this.snappingManager = new Snapping(
      ogma,
      this.options,
      this.texts,
      this.links
    );

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
      .on(["viewChanged", "rotate"], this.refreshTextLinks);

    this.layer = ogma.layers.addCanvasLayer(this._render);
    this.layer.moveToBottom();
  }

  private _render = (ctx: CanvasRenderingContext2D) => {
    if (!this.dragged || this.textToMagnet === undefined) return;
    ctx.beginPath();
    ctx.fillStyle = "green";
    const z = this.ogma.view.getZoom();
    this.snappingManager.getMagnets().forEach((magnet) => {
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
        const snapped = this.snappingManager.snapToText(a, h as EndType, point);
        return (
          snapped ||
          this.snappingManager.findAndSnapToNode(a, side as EndType, point)
        );
      });
    } else if (isArrow(a) && h !== "line") {
      const point = h === "start" ? getArrowStart(a) : getArrowEnd(a);
      const snapped = this.snappingManager.snapToText(a, h as EndType, point);
      // if no text is detected and option is on, we to snap to node
      if (!snapped)
        this.snappingManager.findAndSnapToNode(a, h as EndType, point);
    } else if (isText(a)) {
      if (this.activeLinks.length > 0) {
        this.links.updateTextLinks(this.activeLinks, a, this.getAnnotation);
        this.arrows.refreshLayer();
      }
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
    if (isText(a) || isArrow(a) || isBox(a)) this.onUpdate(a);

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
    this.links.updateLinksForNodes(nodes, this.getAnnotation, dx, dy);
    this.arrows.refreshLayer();
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

  private refreshTextLinks = () => {
    if (this.links.refreshLinks(this.getAnnotation)) this.arrows.refreshLayer();
  };

  /**
   * @returns the currently selected annotation
   */
  public getSelected() {
    return this.selected;
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
    this.getEditorForAnnotation(annotation)?.select(annotation.id);
    return this;
  }
  /**
   * Unselects the currently selected annotation
   */
  public unselect(): this {
    if (!this.selected) return this;
    this.getEditorForAnnotation(this.selected)?.unselect();
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

  public startBox(x: number, y: number, box?: Box) {
    this.cancelDrawing();
    this.boxes.startDrawing(x, y, box);
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
    this.getEditorForAnnotation(annotation)?.updateStyle(annotation, style);
    this.onUpdate(annotation);
    return this;
  }

  public setScale(id: Id, scale: number, ox: number, oy: number) {
    const annotation = this.getAnnotations().features.find((a) => a.id === id);
    if (!annotation) return this;
    this.getEditorForAnnotation(annotation)?.scale(annotation, scale, ox, oy);
    this.onUpdate(annotation);
    return this;
  }

  private getEditorForAnnotation(
    annotation: Annotation
  ): Editor<Annotation> | undefined {
    if (isArrow(annotation)) return this.arrows;
    if (isText(annotation)) return this.texts;
    if (isBox(annotation)) return this.boxes;
    return undefined;
  }

  /**
   * @returns the annotations in the controller
   */
  public getAnnotations() {
    return this.storage.getCollection();
  }

  /**
   * Retrieve the annotation with the given id
   * @param id the id of the annotation to get
   * @returns The annotation with the given id
   */
  public getAnnotation = (id: Id) => {
    return this.storage.getById(id);
  };

  /**
   * Destroy the controller and its elements
   */
  public destroy() {
    this.annotations.forEach((o) => o.destroy());
    this.layer.destroy();
  }
}
