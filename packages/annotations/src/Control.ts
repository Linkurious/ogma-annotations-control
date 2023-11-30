import Ogma, {
  CanvasLayer,
  Node,
  NodeList,
  NodesDragProgressEvent,
  Point
} from '@linkurious/ogma';
import EventEmitter from 'eventemitter3';
import Vector2 from 'vector2js';
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
} from './constants';
import { Arrows } from './Editor/Arrows';
import Editor from './Editor/base';
import { Texts } from './Editor/Texts';
import { Links } from './links';
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
} from './types';

import {
  getArrowEnd,
  getArrowStart,
  getArrowSide,
  getTextPosition,
  getTextSize,
  setArrowEndPoint,
  getAttachmentPointOnNode
} from './utils';

const defaultOptions: ControllerOptions = {
  magnetColor: '#3e8',
  detectMargin: 20,
  magnetHandleRadius: 5,
  magnetRadius: 10,
  textPlaceholder: 'Type here',
  arrowHandleSize: 3.5,
  textHandleSize: 3.5,
  minArrowHeight: 20,
  maxArrowHeight: 30
};

type EndType = 'start' | 'end';
const ends: EndType[] = ['start', 'end'];

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
  private annotations: Editor<Arrow | Text>[];
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
      .on('nodesDragStart', this._onNodesDragStart)
      .on('nodesDragProgress', this._onNodesDrag);

    this.layer = ogma.layers.addCanvasLayer(this._render);
    this.layer.moveToBottom();
  }

  private _render = (ctx: CanvasRenderingContext2D) => {
    if (!this.dragged || this.textToMagnet === undefined) return;
    ctx.beginPath();
    ctx.fillStyle = 'green';
    const z = this.ogma.view.getZoom();
    MAGNETS.forEach((magnet) => {
      if (!this.textToMagnet) return;
      const size = getTextSize(this.textToMagnet);
      const position = getTextPosition(this.textToMagnet);
      const { x, y } = new Vector2(magnet.x, magnet.y)
        .mul({ x: size.width, y: size.height })
        .add(position);
      ctx.moveTo(x, y);
      ctx.arc(x, y, this.options.magnetHandleRadius / z, 0, Math.PI * 2);
    });
    ctx.fill();
    ctx.closePath();
  };

  private _onFeatureDrag = (
    a: Text | Arrow,
    key: EndType | 'line' | 'text'
  ) => {
    const h = key;
    if (isArrow(a) && h === 'line') {
      ['start', 'end']
        .find((side) => {
          const point = side === 'start' ? getArrowStart(a) : getArrowEnd(a);
          const snapped = this._snapToText(a, h as EndType, point);
          return snapped || this._findAndSnapToNode(a, side as EndType, point);
        });
    } else if (isArrow(a) && h !== 'line') {
      const point = h === 'start' ? getArrowStart(a) : getArrowEnd(a);
      const snapped = this._snapToText(a, h as EndType, point);
      // if no text is detected and option is on, we to snap to node
      if (!snapped) this._findAndSnapToNode(a, h as EndType, point);
    } else if (isText(a)) {
      this.activeLinks.forEach(({ arrow: id, side, connectionPoint }) => {
        const arrow = this.getAnnotation(id) as Arrow;
        const size = getTextSize(a);
        const position = getTextPosition(a);
        const pt = new Vector2(connectionPoint!.x, connectionPoint!.y)
          .mul({ x: size.width, y: size.height })
          .add(position);
        arrow.geometry.coordinates[side === 'start' ? 0 : 1] = [pt.x, pt.y];
      });
      if (this.activeLinks.length) this.arrows.refreshLayer();
    }
    this.layer.refresh();
  };

  private _onFeatureDragEnd = (a: Text | Arrow) => {
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
  };

  private _onFeatureDragStart = (d: Arrow | Text) => {
    this.textToMagnet = undefined;
    if (isArrow(d)) this.dragged = d as Arrow;
    else if (isText(d))
      this.activeLinks.push(...this.links.getTargetLinks(d.id));
    this.annotations.forEach((a) => {
      const selected = a.getSelectedFeature();
      if (selected && selected !== d) a.unhover().unselect();
      a.disableDetection();
    });
  };

  private _onNodesDragStart = () => {
    this.arrows.unhover().unselect();
    this.texts.unhover().unselect();
  };

  private _onNodesDrag = (evt: NodesDragProgressEvent<unknown, unknown>) => {
    const { dx, dy } = evt;
    this._moveNodes(evt.nodes, dx, dy);
  };

  private _moveNodes(nodes: NodeList, dx: number, dy: number) {
    nodes.forEach((node) => {
      const links = this.links.getTargetLinks(node.getId());
      const pos = node.getPosition();
      links.forEach((link) => {
        const arrow = this.getAnnotation(link.arrow) as Arrow;
        const side = link.side;
        const otherSide = getArrowSide(
          arrow,
          side === 'start' ? 'end' : 'start'
        );

        let anchor = pos; // graph space
        const r = +node.getAttribute('radius');
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
      this.links.add(arrow, side, text.id, 'text', anchor.magnet);
      return true;
    }
    return false;
  }

  private _findAndSnapToNode(arrow: Arrow, side: EndType, point: Point) {
    const screenPoint = this.ogma.view.graphToScreenCoordinates(point);
    const element = this.ogma.view.getElementAt(screenPoint);
    this.links.remove(arrow, side);
    if (element && element.isNode) {
      this.hoveredNode = element;
      this.hoveredNode.setSelected(true);
      // if close to the node border, snap to it
      this._snapToNode(arrow, side, element, screenPoint);
    } else {
      if (this.hoveredNode) this.hoveredNode.setSelected(false);
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
    const r = +node.getAttribute('radius');
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
        const otherEnd = getArrowSide(arrow, side === 'end' ? 'start' : 'end');
        anchor = getAttachmentPointOnNode(otherEnd, anchor, r);
      }
      setArrowEndPoint(arrow, side, anchor.x, anchor.y);
      this.links.add(arrow, side, node.getId(), 'node', anchor);
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

  public getSelected() {
    return this.selected;
  }

  private findMagnetPoint(magnets: Point[], textToMagnet: Text, point: Point) {
    let res: MagnetPoint | undefined;
    for (const magnet of magnets) {
      const size = getTextSize(textToMagnet);
      const position = getTextPosition(textToMagnet);
      const mPoint = new Vector2(magnet.x, magnet.y)
        .mul({ x: size.width, y: size.height })
        .add(position);
      const dist = mPoint.sub(point).length();
      const scaledRadius = this.options.magnetRadius * this.ogma.view.getZoom();
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

  public setOptions(options: Partial<ControllerOptions> = {}) {
    this.options = {
      ...(this.options || {}),
      ...options
    } as ControllerOptions;
    return this.options;
  }

  public select(id: Id): this {
    const annotation = this.getAnnotations().features.find((a) => a.id === id);
    if (!annotation) return this;
    if (isArrow(annotation)) this.arrows.select(annotation.id);
    else if (isText(annotation)) this.texts.select(annotation.id);
    return this;
  }

  public unselect(): this {
    if (!this.selected) return this;
    if (isArrow(this.selected)) this.arrows.unselect();
    else if (isText(this.selected)) this.texts.unselect();
    return this;
  }

  public add(annotation: Arrow | Text | AnnotationCollection): this {
    if (isAnnotationCollection(annotation)) {
      annotation.features.forEach((f) =>
        this.add(f as unknown as Arrow | Text)
      );
      return this;
    }
    switch (annotation.properties.type) {
      case 'text':
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

  private loadLink(arrow: Arrow) {
    if (!arrow.properties.link) return;
    for (const side of ends) {
      const link = arrow.properties.link[side];
      if (!link) continue;
      const targetText = this.getAnnotation(link.id);
      if (targetText) {
        this.links.add(arrow, side, link.id, link.type, link.magnet!);
      } else {
        const targetNode = this.ogma.getNode(link.id);
        if (!targetNode) continue;
        this.links.add(arrow, side, link.id, link.type, link.magnet!);
      }
    }
  }

  public startArrow(x: number, y: number, arrow?: Arrow) {
    this.cancelDrawing();
    this.arrows.startDrawing(x, y, arrow);
  }

  public startText(x: number, y: number, text?: Text) {
    this.cancelDrawing();
    this.texts.startDrawing(x, y, text);
  }

  public cancelDrawing() {
    this.annotations.forEach((o) => o.cancelDrawing());
    this.emit(EVT_CANCEL_DRAWING);
  }

  public onUpdate = (annotation: Annotation) => {
    cancelAnimationFrame(this.updateTimeout);
    this.updateTimeout = requestAnimationFrame(() =>
      this._onUpdate(annotation)
    );
  };

  private _onUpdate = (annotation: Annotation) => {
    this.emit(EVT_UPDATE, annotation);
  };

  public updateStyle<A extends Annotation>(
    id: Id,
    style: A['properties']['style']
  ): this {
    const annotation = this.getAnnotations().features.find((a) => a.id === id);
    if (!annotation) return this;
    if (isArrow(annotation)) this.arrows.updateStyle(annotation, style);
    else if (isText(annotation)) this.texts.updateStyle(annotation, style);
    this.onUpdate(annotation);
    return this;
  }

  public getAnnotations() {
    const collection: AnnotationCollection = {
      type: 'FeatureCollection',
      features: []
    };
    this.annotations.forEach((editor) => {
      collection.features = [...collection.features, ...editor.getElements()];
    });
    return collection;
  }

  public getAnnotation(id: Id) {
    return this.getAnnotations().features.find((a) => a.id === id);
  }

  public destroy() {
    this.annotations.forEach((o) => o.destroy());
    this.layer.destroy();
  }
}
