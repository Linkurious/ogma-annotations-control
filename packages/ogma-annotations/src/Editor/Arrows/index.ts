import Ogma, { Point } from "@linkurious/ogma";
import Vector2 from "vector2js";
import { createArrow, defaultOptions, defaultStyle } from "./defaults";
import drawArrow, { getArrowHeight } from "./render";
import { EVT_DRAG, EVT_DRAG_END, EVT_DRAG_START, NONE } from "../../constants";
import { Arrow, ControllerOptions } from "../../types";
import {
  clientToContainerPosition,
  createSVGElement,
  getArrowEnd,
  getArrowEndPoints,
  getArrowStart,
  getHandleId,
  setArrowEnd,
  setArrowStart,
} from "../../utils";
import { Editor } from "../base";

const HANDLE_LINE = "handle-line";
const HANDLE_START = "handle-start";
const HANDLE_END = "handle-end";

/**
 * @class Arrows
 * Draw and edit arrows
 */
export class Arrows extends Editor<Arrow> {
  // active handle id
  private draggedHandle = NONE;
  private start: Point = { x: 0, y: 0 };
  private end: Point = { x: 0, y: 0 };
  private arrow: Arrow = { ...defaultOptions };
  private startX = 0;
  private startY = 0;
  private minArrowHeight = 0;
  private maxArrowHeight = 0;
  private handles: HTMLDivElement[] = [];

  constructor(
    ogma: Ogma,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options: Pick<
      Partial<ControllerOptions>,
      "arrowHandleSize" | "maxArrowHeight" | "minArrowHeight"
    > = {}
  ) {
    super(
      ogma,
      `
    <div class="arrow-handle">
      <div id="${HANDLE_LINE}" data-handle-id="0" class="handle line"></div>
      <div id="${HANDLE_START}" data-handle-id="1" class="handle point"></div>
      <div id="${HANDLE_END}" data-handle-id="2" class="handle point"></div>
    </div>
  `
    );

    this.minArrowHeight = options.minArrowHeight || 0;
    this.maxArrowHeight = options.maxArrowHeight || 1e6;

    this.handles = Array.prototype.slice.call(
      this.editor.element.querySelectorAll(".arrow-handle>.handle")
    );

    // events to move/resize
    this.handles.forEach((handle: HTMLDivElement) =>
      handle.addEventListener("mousedown", this.onHandleMouseDown)
    );
    document.addEventListener("mousemove", this.onMouseMove, true);
    document.addEventListener("mouseup", this.onMouseUp);
  }

  private onHandleMouseDown = (evt: MouseEvent) => {
    const res = this.getById(this.selectedId) || this.getById(this.hoveredId);
    if (!res) return;

    const { x, y } = clientToContainerPosition(evt, this.ogma.getContainer());
    this.startDragging(res, x, y);
    this.draggedHandle = getHandleId(evt.target as HTMLDivElement);
  };

  /**
   * Start drawing a new arrow, it will also be added as a new annotation
   * @param x
   * @param y
   * @param arrow
   */
  public startDrawing(
    x: number,
    y: number,
    arrow: Arrow = createArrow(x, y, x, y, defaultStyle)
  ) {
    this.disableDragging();
    this.add(arrow);
    this.hoveredId = arrow.id;
    const pos = this.ogma.view.graphToScreenCoordinates({ x, y });
    const bb = this.ogma.getContainer()?.getBoundingClientRect() || {
      left: 0,
      top: 0,
    };
    this.startDragging(
      this.getById(arrow.id),
      pos.x + bb?.left,
      pos.y + bb.top
    );
    this.draggedHandle = 2;
  }

  public cancelDrawing(): void {
    if (!this.isDragging) return;
    this.remove(this.arrow.id);
    this.emit(EVT_DRAG_END, this.arrow);
    this.restoreDragging();
    this.isDragging = false;
    this.draggedHandle = NONE;
  }

  private startDragging(arrow: Arrow, x: number, y: number) {
    // element could be just hovered at that point, select it
    if (this.selectedId !== arrow.id) this.select(this.hoveredId);
    this.arrow = arrow;
    // remember drag start point and arrow ends poisitions
    this.startX = x;
    this.startY = y;

    this.start = getArrowStart(this.arrow);
    this.end = getArrowEnd(this.arrow);

    this.disableDragging();
    this.emit(EVT_DRAG_START, this.arrow);
    this.isDragging = true;
  }

  private onMouseUp = () => {
    if (this.draggedHandle === -1) return;
    this.restoreDragging();
    this.isDragging = false;
    this.draggedHandle = NONE;
    this.emit(EVT_DRAG_END, this.arrow);
  };

  private onMouseMove = (evt: MouseEvent) => {
    if (!this.isDragging || this.draggedHandle === NONE) return;

    const handle = this.handles[this.draggedHandle];
    const angle = this.ogma.view.getAngle();
    const { x: dx, y: dy } = new Vector2(
      evt.clientX - this.startX,
      evt.clientY - this.startY
    )
      .divScalar(this.ogma.view.getZoom())
      .rotateRadians(angle);
    const isLine = handle.id === HANDLE_LINE;
    const isStart = handle.id === HANDLE_START;
    const isEnd = handle.id === HANDLE_END;

    if (isLine || isStart)
      setArrowStart(this.arrow, this.start.x + dx, this.start.y + dy);
    if (isLine || isEnd)
      setArrowEnd(this.arrow, this.end.x + dx, this.end.y + dy);

    this.emit(
      EVT_DRAG,
      this.arrow,
      isLine ? "line" : isStart ? "start" : "end"
    );
    this.refreshEditor();
    this.layer.refresh();
  };

  public detect(point: Point, margin = 0): Arrow | undefined {
    return this.elements.find((a) => {
      const { start, end } = getArrowEndPoints(a);
      // p is the vector from mouse pointer to the center of the arrow
      const p = new Vector2(point.x, point.y).sub(
        new Vector2((start.x + end.x) / 2, (start.y + end.y) / 2)
      );
      const vec = new Vector2(end.x, end.y).sub(new Vector2(start.x, start.y));
      const width = vec.length();
      const vecN = vec.normalize();
      const height = getArrowHeight(a);
      // check if the cursor is within the bounds of the bounding rectangle
      // of the arrow extended by margin
      return (
        Math.abs(vecN.dot(p)) < width / 2 + margin &&
        Math.abs(vecN.rotateRadians(Math.PI / 2).dot(p)) < height / 2 + margin
      );
    });
  }

  public refreshEditor() {
    if (+this.selectedId < 0 && +this.hoveredId < 0) return;
    const arrow =
      this.selectedId !== NONE
        ? this.getById(this.selectedId)
        : this.getById(this.hoveredId);
    const extremities = getArrowEndPoints(arrow);
    const start = this.ogma.view.graphToScreenCoordinates(extremities.start);
    const end = this.ogma.view.graphToScreenCoordinates(extremities.end);
    const [lineH, startH, endH] = Array.prototype.slice.call(
      this.editor.element.querySelectorAll(".handle")
    ) as HTMLDivElement[];

    startH.style.transform = `translate(${start.x}px, ${start.y}px) translate(-50%, -50%)`;
    endH.style.transform = `translate(${end.x}px, ${end.y}px) translate(-50%, -50%)`;

    const middle = {
      x: (end.x + start.x) / 2,
      y: (end.y + start.y) / 2,
    };

    const v = new Vector2(end.x - start.x, end.y - start.y);
    const vn = v.mul(1 / v.length());
    const angle = Math.atan2(vn.y, vn.x);

    lineH.style.width = `${v.length()}px`;
    lineH.style.left = `${middle.x}px`;
    lineH.style.top = `${middle.y}px`;
    lineH.style.transform = `translate(-50%, -50%) rotate(${angle}rad)`;
  }
  public getDefaultOptions(): Arrow {
    return defaultOptions;
  }
  public draw(svg: SVGSVGElement): void {
    svg.innerHTML = "";
    const g = createSVGElement<SVGGElement>("g");
    const angle = this.ogma.view.getAngle();
    g.setAttribute("transform", `rotate(${-angle * (180 / Math.PI)})`);
    this.elements.forEach((a) =>
      drawArrow(a, g, defaultStyle, this.minArrowHeight, this.maxArrowHeight)
    );
    svg.appendChild(g);
  }
  public refreshDrawing(): void {
    const angle = this.ogma.view.getAngle();
    this.layer.element.children[0].setAttribute(
      "transform",
      `rotate(${-angle * (180 / Math.PI)})`
    );
  }
  public destroy(): void {
    super.destroy();
    document.removeEventListener("mousemove", this.onMouseMove, true);
    document.removeEventListener("mouseup", this.onMouseUp);
  }
}

export {
  defaultOptions as defaultArrowOptions,
  defaultStyle as defaultArrowStyle,
  createArrow,
};
