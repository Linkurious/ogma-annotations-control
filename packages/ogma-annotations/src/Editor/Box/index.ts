import Ogma, { Point } from "@linkurious/ogma";
import {
  createBox,
  defaultOptions,
  defaultStyle,
  defaultControllerOptions,
  getEditorTemplate
} from "./defaults";
import { EVT_DRAG, EVT_DRAG_END, EVT_DRAG_START, NONE } from "../../constants";
import { Box, ControllerOptions, Rect, Text } from "../../types";
import {
  clientToContainerPosition,
  createSVGElement,
  getBoxPosition,
  getBoxSize,
  getHandleId,
  setBbox
} from "../../utils";
import { rotateRadians, subtract } from "../../vec";
import { Editor } from "../base";

const minSize = 20;

type DrawContent<T> = (annotation: T, g: SVGGElement) => void;

const defaultDrawContent = () => {};

export type BoxEditorOptions<T> = Pick<
  Partial<ControllerOptions>,
  "textHandleSize" | "textPlaceholder"
> & { drawContent?: DrawContent<T>; addOns?: string };

export class BoxEditor<T extends Box | Text> extends Editor<T> {
  protected handleSize: number;
  protected rect: Rect = { x: 0, y: 0, width: 0, height: 0 };
  protected annotation = { ...defaultOptions } as T;
  protected startX = 0;
  protected startY = 0;
  protected handles: HTMLDivElement[] = [];
  protected draggedHandle = NONE;
  protected isFocused = false;
  protected isScaled = true;

  protected drawContent: DrawContent<T>;

  constructor(ogma: Ogma, options: BoxEditorOptions<T> = {}) {
    super(ogma, getEditorTemplate(options.addOns));
    this.drawContent = options.drawContent || defaultDrawContent;
    this.showeditorOnHover = false;
    this.handleSize = (defaultControllerOptions.handleSize ||
      options.textHandleSize) as number;

    this.handles = Array.prototype.slice.call(
      this.editor.element.querySelectorAll(".annotation-text-handle > .handle")
    );
    this.handles.push(this.editor.element as HTMLDivElement);

    // events to move/resize
    this.handles.forEach((handle: HTMLDivElement) =>
      handle.addEventListener("mousedown", this.onHandleMouseDown)
    );

    document.addEventListener("mouseup", this.onMouseUp);
    document.addEventListener("mousemove", this.onMouseMove, true);
    // update the width of the controls depending on zoom
    ogma.events.on(["viewChanged", "zoom"], this.onViewChanged);
  }

  public startDrawing(
    x: number,
    y: number,
    box = createBox(x, y, 0, 0, defaultStyle) as T
  ) {
    this.add(box);
    const pos = this.ogma.view.graphToScreenCoordinates({ x, y });
    this.select(box.id);
    this.startDragging(this.getById(box.id), pos.x, pos.y);
    this.draggedHandle = 6;
  }

  public cancelDrawing() {
    if (!this.isDragging) return;
    this.remove(this.annotation.id);
    this.annotation = { ...defaultOptions } as T;
    this.draggedHandle = NONE;
    this.isDragging = false;
    this.emit(EVT_DRAG_END, this.annotation);
  }

  protected startDragging(box: T, clientX: number, clientY: number) {
    this.annotation = box;
    const position = getBoxPosition(this.annotation);
    const size = getBoxSize(this.annotation);

    this.rect.x = position.x;
    this.rect.y = position.y;
    this.rect.width = size.width;
    this.rect.height = size.height;

    this.startX = clientX;
    this.startY = clientY;
    this.disableDragging();
    // this.textArea.classList.add("noevents");
    // this.textArea.setAttribute("disabled", "disabled");
    this.emit(EVT_DRAG_START, this.annotation);
    this.isDragging = true;
  }

  private onHandleMouseDown = (evt: MouseEvent) => {
    const res = this.getById(this.selectedId) || this.getById(this.hoveredId);
    if (!res) return;
    if (this.selectedId !== res.id) this.select(this.hoveredId);

    const { x, y } = clientToContainerPosition(evt, this.ogma.getContainer());
    this.startDragging(res, x, y);
    this.draggedHandle = getHandleId(evt.target as HTMLDivElement);
  };

  private onMouseMove = (evt: MouseEvent) => {
    requestAnimationFrame(() => this._onMouseMove(evt));
  };

  private _onMouseMove = (evt: MouseEvent) => {
    if (!this.isDragging) return;

    evt.stopPropagation();
    evt.preventDefault();

    const handle = this.handles[this.draggedHandle];

    let isTop = handle.classList.contains("top");
    const isLeft = handle.classList.contains("left");
    const isRight = handle.classList.contains("right");
    const isBottom = handle.classList.contains("bottom");
    let isDrag = handle.classList.contains("line-handle");

    if (!isDrag && !isTop && !isBottom && !isLeft && !isRight) {
      isTop = true;
      isDrag = true;
    }

    const { x: clientX, y: clientY } = clientToContainerPosition(
      evt,
      this.ogma.getContainer()
    );

    let x = this.rect.x;
    let y = this.rect.y;
    let width = Math.max(this.rect.width, minSize);
    let height = Math.max(this.rect.height, minSize);

    const zoom = this.ogma.view.getZoom();
    const dx = (clientX - this.startX) / zoom;
    const dy = (clientY - this.startY) / zoom;
    const angle = this.ogma.view.getAngle();
    const delta = rotateRadians({ x: dx, y: dy }, angle);
    const localDelta = rotateRadians({ x: dx, y: dy }, -angle);

    if (isDrag) {
      x = this.rect.x + delta.x;
      y = this.rect.y + delta.y;
    } else {
      // Resizing the box by dragging one of the corners
      if (isLeft && isTop) {
        x += delta.x;
        y += delta.y;
        width -= dx;
        height -= dy;
      } else if (isRight && isBottom) {
        width += dx;
        height += dy;
      } else if (isLeft && isBottom) {
        x += localDelta.x;
        width -= localDelta.x;
        height += localDelta.y;
      } else if (isRight && isTop) {
        y += localDelta.y;
        width += localDelta.x;
        height -= localDelta.y;
      }
    }

    setBbox(this.annotation, x, y, width, height);
    this.emit(EVT_DRAG, this.annotation, "text");

    this.refreshEditor();
    this.layer.refresh();
  };

  private onMouseUp = () => {
    if (!this.isDragging || this.draggedHandle === NONE) return;

    this.restoreDragging();
    this.onMouseUpInternal();
    this.emit(EVT_DRAG_END, this.annotation);
    this.isDragging = false;
    this.draggedHandle = NONE;
  };

  protected onMouseUpInternal() {
    // Placeholder for child classes to implement additional logic on mouse up
  }

  protected _onMousedown = (evt: MouseEvent) => {
    evt.stopPropagation();
  };

  private onViewChanged = () => {
    const w = Math.max(2, this.handleSize / this.ogma.view.getZoom());
    document.documentElement.style.setProperty("--handle-scale", `${1 / w}`);
    const angle = this.ogma.view.getAngle();
    if (angle === 0) this.editor.element.classList.remove("rotated");
    else this.editor.element.classList.add("rotated");
  };

  public detect({ x, y }: Point, margin = 0): T | undefined {
    // check if the pointer is within the bounding box of one of the texts
    const p = { x, y };
    const angle = this.ogma.view.getAngle();
    return this.elements.find((a) => {
      const { x: tx, y: ty } = getBoxPosition(a);
      const { width, height } = getBoxSize(a);
      const origin = { x: tx, y: ty };
      const { x: dx, y: dy } = rotateRadians(subtract(p, origin), -angle);

      return (
        dx > -margin &&
        dx < width + margin &&
        dy > -margin &&
        dy < height + margin
      );
    });
  }

  public draw(svg: SVGSVGElement): void {
    svg.innerHTML = "";
    const styleContent = "";
    const { angle } = this.ogma.view.get();
    for (let i = 0; i < this.elements.length; i++) {
      const annotation = this.elements[i];
      const className = `class${i}`;
      const size = getBoxSize(annotation);
      const id = annotation.id;

      // edited element is rendered in DOM
      if (id === this.selectedId) continue;

      const { strokeColor, strokeWidth, strokeType, background, borderRadius } =
        annotation.properties.style || defaultStyle;
      const g = createSVGElement<SVGGElement>("g");
      g.classList.add("annotation-box");
      g.setAttribute("fill", `${background || "transparent"}`);

      // rect is used for background and stroke
      const rect = createSVGElement<SVGRectElement>("rect");

      if (borderRadius) {
        rect.setAttribute("rx", `${borderRadius}`);
        rect.setAttribute("ry", `${borderRadius}`);
      }
      let addRect = false;
      if (strokeType && strokeType !== "none") {
        addRect = true;
        rect.setAttribute("stroke", strokeColor || "black");
        rect.setAttribute("stroke-width", `${strokeWidth}`);
        if (strokeType === "dashed") {
          rect.setAttribute("stroke-dasharray", `5,5`);
        }
      }
      if ((background && background.length) || addRect) {
        addRect = true;
        rect.setAttribute("fill", background || "transparent");
      }
      if (addRect) {
        rect.setAttribute("width", `${size.width}`);
        rect.setAttribute("height", `${size.height}`);
      }
      g.appendChild(rect);
      this.drawContent(annotation, g);

      g.setAttribute(
        "transform",
        this.getTransformMatrix(annotation, this.ogma.view.getZoom(), angle)
      );
      g.classList.add(className);
      g.setAttribute("data-annotation", `${annotation.id}`);
      g.setAttribute("data-annotation-type", annotation.properties.type);
      svg.appendChild(g);
    }
    const style = createSVGElement<SVGStyleElement>("style");
    style.innerHTML = styleContent;
    if (!svg.firstChild) return;
    svg.insertBefore(style, svg.firstChild);
  }

  public refreshDrawing(): void {
    const { zoom, angle } = this.ogma.view.get();
    const groups = this.layer.element.children;
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i] as SVGGElement;
      if (!g.hasAttribute("data-annotation")) continue;
      const id = g.getAttribute("data-annotation")!;
      g.setAttribute(
        "transform",
        this.getTransformMatrix(this.getById(id), zoom, angle)
      );
    }
  }

  protected getTransformMatrix(box: T, _zoom: number, angle: number) {
    const position = getBoxPosition(box);
    const { x, y } = rotateRadians(position, -angle);
    // scale it around its center
    const size = getBoxSize(box);
    const scale = 1;

    const offsetX = x + (size.width / 2) * (1 - scale);
    const offsetY = y + (size.height / 2) * (1 - scale);
    return `matrix(${scale}, 0, 0, ${scale}, ${offsetX}, ${offsetY})`;
  }

  public getDefaultOptions() {
    return defaultOptions as T;
  }

  public refreshEditor() {
    if (+this.selectedId < 0 && +this.hoveredId < 0) return;
    const t = this.getById(this.selectedId) || this.getById(this.hoveredId);
    const size = getBoxSize(t);
    const position = this.ogma.view.graphToScreenCoordinates(getBoxPosition(t));
    const zoom = this.ogma.view.getZoom();
    const elementStyle = this.editor.element.style;
    elementStyle.transform =
      `translate(${position.x}px, ${position.y}px)` +
      `translate(-50%, -50%)` +
      `translate(${(size.width / 2) * zoom}px, ${(size.height / 2) * zoom}px)`;
    elementStyle.width = `${size.width * zoom}px`;
    elementStyle.height = `${size.height * zoom}px`;
    this._refreshEditorInternal(t, zoom);
    this.layer.refresh();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected _refreshEditorInternal(_t: T, _zoom: number) {}

  public destroy(): void {
    super.destroy();
    document.removeEventListener("mouseup", this.onMouseUp);
    document.removeEventListener("mousemove", this.onMouseMove, true);
    // update the width of the controls depending on zoom
    this.ogma.events.off(this.onViewChanged);
  }
}

export {
  defaultOptions as defaultBoxOptions,
  defaultStyle as defaultBoxStyle,
  defaultControllerOptions as defaultBoxControllerOptions,
  createBox
};
