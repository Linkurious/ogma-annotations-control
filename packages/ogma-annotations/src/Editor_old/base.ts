import Ogma, {
  MouseButtonEvent,
  MouseMoveEvent,
  Options,
  Overlay,
  Point,
  SVGLayer
} from "@linkurious/ogma";
import eventEmmitter from "eventemitter3";
import { nanoid as getId } from "nanoid";
import {
  EVT_ADD,
  EVT_HOVER,
  EVT_REMOVE,
  EVT_SELECT,
  EVT_UNHOVER,
  EVT_UNSELECT,
  NONE
} from "../constants";
import { SubCollection } from "../storage";
import { Annotation, Events, Id } from "../types";
import { scaleGeometry } from "../utils";

/**
 * @class Annotations
 * Abstract class to display Texts and Arrows, provide add/remove/update and mouse events
 * Modifying annotation is handled by the child classes, it is too specific
 */
export abstract class Editor<T extends Annotation> extends eventEmmitter<
  Events<T>
> {
  // layer to draw elements
  protected layer: SVGLayer;
  protected editor: Overlay;
  protected selectedId: Id = NONE;
  protected hoveredId: Id = NONE;
  // used to remember ogma options before we change them
  protected ogmaOptions: Options;
  protected shouldDetect: boolean;
  protected isDragging: boolean;
  protected showeditorOnHover: boolean;

  constructor(
    protected ogma: Ogma,
    protected elements: SubCollection<T>,
    editorHtml: string
  ) {
    super();
    this.elements = elements;
    this.shouldDetect = true;
    this.isDragging = false;
    this.showeditorOnHover = true;
    this.ogmaOptions = ogma.getOptions();
    //handle select/unselect on click
    ogma.events
      .on(["click", "mousemove"], this._onClickMouseMove)
      .on("keyup", this._onKeyUp)
      .on("frame", () => {
        this.refreshEditor();
        this.refreshDrawing();
      });

    // Layer to draw all the annotations
    this.layer = ogma.layers.addSVGLayer({
      draw: (svg) => this.draw(svg)
    });
    this.layer.moveToTop();
    // UI to move/resize the element
    this.editor = ogma.layers.addLayer(editorHtml);
    this.editor.hide();
  }

  private _onKeyUp = (evt: { code: number }) => {
    if (evt.code === 27 && this.selectedId !== NONE) this.unselect();
    else if (
      (evt.code === 46 || evt.code === 8) &&
      this.selectedId !== NONE &&
      this._canRemove()
    ) {
      this.remove(this.selectedId);
    }
  };

  protected _canRemove() {
    return true;
  }

  private _onClickMouseMove = (
    evt: MouseButtonEvent<unknown, unknown> & MouseMoveEvent
  ) => {
    if (!evt.domEvent || this.isDragging || !this.shouldDetect) return;
    if (
      evt.domEvent.type !== "mousemove" &&
      evt.domEvent.target &&
      (evt.domEvent.target as HTMLElement).tagName === "a"
    )
      return;
    const point = this.ogma.view.screenToGraphCoordinates(evt);

    // try to detect annotation
    const element =
      this.shouldDetect || (!this.shouldDetect && +this.selectedId > -1)
        ? this.detect(point, 0)
        : undefined;
    // hover/unhover on mousemove
    if (evt.domEvent.type === "mousemove") {
      if (element) this.hover(element.id);
      else if (this.hoveredId !== NONE) this.unhover();
    } else {
      // select/unselect on click
      if (element) {
        this.select(element.id);
      } else if (this.selectedId !== NONE) {
        this.unselect();
      }
    }
  };

  /**
   * @method add
   * @param options Params for the annotation (merged with default)
   * @returns the added annotation
   */
  add(options: T) {
    const def = this.getDefaultOptions();
    const o = Object.assign(options, {
      id: options.id === undefined ? getId() : options.id,
      type: options.type,
      properties: {
        ...def.properties,
        ...(options.properties || {}),
        // styles need to be merged
        style: { ...def.properties.style, ...(options.properties.style || {}) }
      },
      geometry: {
        ...def.geometry,
        ...options.geometry
      }
    } as T);
    this.elements.push(o);
    this.layer.refresh();
    this.emit(EVT_ADD, o);
    return o;
  }

  public updateStyle(annotation: T, style: Partial<T["properties"]["style"]>) {
    this.updateAnnotation(annotation, {
      properties: {
        style
      }
    } as Partial<T>);
  }

  public updateGeometry(annotation: T, geometry: Partial<T["geometry"]>) {
    this.updateAnnotation(annotation, {
      geometry
    } as Partial<T>);
  }

  public scale(annotation: T, scale: number, ox: number, oy: number) {
    this.updateGeometry(
      annotation,
      scaleGeometry(annotation.geometry, scale, ox, oy)
    );
  }

  /**
   * @method update
   * Updates an annotation (position, color etc)
   * @param id Id of the annotation to update
   * @param element params of the annotation
   */
  update(id: Id, element: Partial<T>) {
    const target = this.getById(id);
    this.updateAnnotation(target, element);
  }

  updateAnnotation(target: T, element: Partial<T>) {
    if (!target) return;
    const id = target.id;
    Object.keys(element).forEach((key) => {
      if (key === "id") return;
      if (key === "properties") {
        const properties = element.properties || { style: {} };
        target.properties = {
          ...(target.properties || {}),
          ...(properties || {}),
          style: {
            ...(target.properties.style || {}),
            ...(properties.style || {})
          }
        };
      } else if (key === "geometry") {
        target.geometry = {
          ...target.geometry,
          ...element.geometry
        };
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
      } else target[key] = element[key];
    });
    if (id === this.selectedId) this.refreshEditor();
    this.layer.refresh();
  }

  getById(id: Id): T {
    return this.elements.getById(id) as T;
  }

  /**
   * @method select
   * @param id id of the element to select
   * Select element, show editor, disable Ogma dragging and fire event
   */
  select(id: Id) {
    const element = this.getById(id);
    if (!element) return;
    this.editor.show();
    this.selectedId = id;
    this.refreshEditor();
    this.layer.refresh();
    this.emit(EVT_SELECT, element);
  }

  hover(id: Id) {
    const element = this.getById(id);
    if (!element) return;
    if (this.showeditorOnHover) {
      this.editor.show();
    }
    this.hoveredId = id;
    this.refreshEditor();
    this.layer.refresh();
    this.emit(EVT_HOVER, element);
  }

  getSelectedFeature() {
    if (this.selectedId === NONE) return null;
    return this.getById(this.selectedId);
  }

  unselect() {
    const current = this.getById(this.selectedId);
    if (current) this.emit(EVT_UNSELECT, current);
    this.selectedId = NONE;
    // do not hide editor if there is something hovered
    if (this.hoveredId === NONE) this.editor.hide();
    this.layer.refresh();
    return this;
  }

  unhover() {
    const current = this.getById(this.hoveredId);
    this.emit(EVT_UNHOVER, current);
    this.hoveredId = NONE;
    // do not hide editor if there is something selected
    if (this.selectedId === NONE) this.editor.hide();
    this.layer.refresh();
    return this;
  }

  /**
   * @method remove
   * @param id Id of the annotation to remove
   * Removes annotation with the given id
   */
  remove(id: Id) {
    const element = this.getById(id);
    if (id === this.hoveredId) this.unhover();
    if (id === this.selectedId) this.unselect();
    this.elements.remove(id);
    if (element) this.emit(EVT_REMOVE, element);
    this.layer.refresh();
  }

  /**
   * @method disableDragging
   * Prevents Ogma from dragging elements or moving the view while dragging an annotation
   */
  public disableDragging() {
    this.ogma.setOptions({
      interactions: {
        drag: { enabled: false },
        pan: { enabled: false }
      },
      detect: {
        nodes: false,
        edges: false,
        nodeTexts: false,
        edgeTexts: false
      }
    });
  }

  /**
   * @method restoreDragging
   * restore ogma options as they were before we start dragging an annotation
   */
  public restoreDragging() {
    this.ogma.setOptions(this.ogmaOptions);
  }

  public enableDetection() {
    this.shouldDetect = true;
  }
  /**
   * @method disableDetection
   * Disables the hover behaviour, used by controller to avoid hovering
   * arrows while dragging texts and vice versa
   */
  public disableDetection() {
    this.shouldDetect = false;
  }

  public refreshLayer() {
    this.layer.refresh();
  }
  public refreshDrawing() {}

  public getElements() {
    return [...this.elements];
  }
  public abstract refreshEditor(): void;
  public abstract draw(svg: SVGSVGElement): void;
  public abstract cancelDrawing(): void;

  public abstract getDefaultOptions(): T;
  public abstract detect(point: Point, margin: number): T | undefined;
  public destroy() {
    this.ogma.events.off(this._onClickMouseMove).off(this._onKeyUp);
    this.layer.destroy();
  }
}
