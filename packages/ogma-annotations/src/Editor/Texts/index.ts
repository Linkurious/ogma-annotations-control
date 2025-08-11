import Ogma, { Point } from "@linkurious/ogma";
import {
  createText,
  defaultControllerOptions,
  defaultOptions,
  defaultStyle
} from "./defaults";
import drawText from "./render";
import {
  EVT_DRAG,
  EVT_DRAG_END,
  EVT_DRAG_START,
  EVT_UPDATE,
  NONE
} from "../../constants";
import { ControllerOptions, Id, Text } from "../../types";
import {
  clientToContainerPosition,
  createSVGElement,
  getHandleId,
  getTextPosition,
  getTextSize,
  setTextBbox
} from "../../utils";
import { rotateRadians, subtract } from "../../vec";
import { Editor } from "../base";

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const minSize = 20;

/**
 * @class Texts
 * Draw, update, edit texts
 */
export class Texts extends Editor<Text> {
  private textArea: HTMLTextAreaElement;
  private handleSize: number;
  private rect: Rect = { x: 0, y: 0, width: 0, height: 0 };
  private annotation: Text = { ...defaultOptions };
  private startX = 0;
  private startY = 0;
  private handles: HTMLDivElement[] = [];
  private draggedHandle = NONE;
  private isFocused = false;
  private placeholder = "Type your text here...";

  constructor(
    ogma: Ogma,
    options: Pick<
      Partial<ControllerOptions>,
      "textHandleSize" | "textPlaceholder"
    > = {}
  ) {
    super(
      ogma,
      `
    <div class="annotation-text-handle" data-handle-id="8">
      <span class="handle line-handle top" data-handle-id="0"></span>
      <span class="handle line-handle bottom" data-handle-id="1"></span>
      <span class="handle line-handle left" data-handle-id="2"></span>
      <span class="handle line-handle right" data-handle-id="3"></span>
      <span class="handle top right point-handle top-right" data-handle-id="4"></span>
      <span class="handle left top point-handle top-left" data-handle-id="5"></span>
      <span class="handle bottom right point-handle bottom-right" data-handle-id="6"></span>
      <span class="handle left bottom left-handle point-handle bottom-left" data-handle-id="7"></span>
      <textarea wrap="on"></textarea>
    </div>
  `
    );
    this.showeditorOnHover = false;
    this.handleSize = (defaultControllerOptions.handleSize ||
      options.textHandleSize) as number;
    this.placeholder =
      defaultControllerOptions.placeholder || options.textPlaceholder || "";

    // hidden text input to edit the text, we swap it with SVG when selected or hovered
    const textArea = (this.textArea =
      this.editor.element.querySelector<HTMLTextAreaElement>("textarea")!);
    textArea.addEventListener("input", this._onInput);
    textArea.addEventListener("focus", this._onFocus);
    textArea.addEventListener("blur", this._onBlur);
    textArea.addEventListener("mousedown", this._onMousedown);
    textArea.spellcheck = false;

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

  private _onFocus = () => {
    if (this.textArea.value === this.placeholder) this.textArea.value = "";
    this.isFocused = true;
  };

  private _onBlur = () => {
    this.isFocused = false;
  };

  protected _canRemove() {
    return !this.isFocused;
  }

  public startDrawing = (
    x: number,
    y: number,
    text = createText(x, y, 0, 0, "", defaultStyle)
  ) => {
    this.add(text);
    const pos = this.ogma.view.graphToScreenCoordinates({ x, y });
    this.select(text.id);
    this.startDragging(this.getById(text.id), pos.x, pos.y);
    this.draggedHandle = 6;
  };

  public cancelDrawing = () => {
    if (!this.isDragging) return;
    this.remove(this.annotation.id);
    this.annotation = { ...defaultOptions };
    this.draggedHandle = NONE;
    this.isDragging = false;
    this.emit(EVT_DRAG_END, this.annotation);
  };

  private startDragging = (text: Text, clientX: number, clientY: number) => {
    this.annotation = text;
    const position = getTextPosition(this.annotation);
    const size = getTextSize(this.annotation);

    this.rect.x = position.x;
    this.rect.y = position.y;
    this.rect.width = size.width;
    this.rect.height = size.height;

    this.startX = clientX;
    this.startY = clientY;
    this.disableDragging();
    this.textArea.classList.add("noevents");
    this.textArea.setAttribute("disabled", "disabled");
    this.emit(EVT_DRAG_START, this.annotation);
    this.isDragging = true;
  };

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

    setTextBbox(this.annotation, x, y, width, height);
    this.emit(EVT_DRAG, this.annotation, "text");

    this.refreshEditor();
    this.layer.refresh();
  };

  private onMouseUp = () => {
    if (!this.isDragging || this.draggedHandle === NONE) return;

    this.restoreDragging();
    this.textArea.classList.remove("noevents");
    this.textArea.removeAttribute("disabled");
    this.emit(EVT_DRAG_END, this.annotation);
    this.isDragging = false;
    this.draggedHandle = NONE;
  };

  private _onMousedown = (evt: MouseEvent) => {
    evt.stopPropagation();
  };

  private onViewChanged = () => {
    const w = Math.max(2, this.handleSize / this.ogma.view.getZoom());
    document.documentElement.style.setProperty("--handle-scale", `${1 / w}`);
    const angle = this.ogma.view.getAngle();
    if (angle === 0) this.editor.element.classList.remove("rotated");
    else this.editor.element.classList.add("rotated");
  };

  private _onInput = () => {
    const annotation = this.getById(this.selectedId);
    if (!annotation) return;
    // prevent double spaces as it is not handled by the align algo.
    //const selectionCursor = this.textArea.selectionEnd;
    this.textArea.value = this.textArea.value.replace(/ +(?= )/g, "");
    this.textArea.focus();
    //this.textArea.selectionEnd = Math.max(0, selectionCursor - 1);
    annotation.properties.content = this.textArea.value;
    this.emit(EVT_UPDATE, annotation);
    this.layer.refresh();
  };

  public detect({ x, y }: Point, margin = 0): Text | undefined {
    // check if the pointer is within the bounding box of one of the texts
    const p = { x, y };
    const angle = this.ogma.view.getAngle();
    return this.elements.find((a) => {
      const { x: tx, y: ty } = getTextPosition(a);
      const { width, height } = getTextSize(a);
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
    const { angle, zoom } = this.ogma.view.get();
    for (let i = 0; i < this.elements.length; i++) {
      const annotation = this.elements[i];
      const className = `class${i}`;
      const size = getTextSize(annotation);
      const position = getTextPosition(annotation);
      const id = annotation.id;

      // edited element is rendered in DOM
      if (id === this.selectedId) continue;

      const {
        color,
        fontSize,
        font,
        strokeColor,
        strokeWidth,
        strokeType,
        background,
        borderRadius
      } = annotation.properties.style || defaultStyle;
      const g = createSVGElement<SVGGElement>("g");
      g.classList.add("annotation-text");
      g.setAttribute("fill", `${color}`);
      g.setAttribute("font-size", `${fontSize}px`);
      g.setAttribute("font-family", `${font}`);

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
      drawText(annotation, g);
      const { x, y } = rotateRadians(position, -angle);
      g.setAttribute(
        "transform",
        `translate(${x},${y}) scale(${zoom}, ${zoom})`
      );
      g.classList.add(className);
      g.setAttribute("data-annotation", `${annotation.id}`);
      g.setAttribute("data-annotation-type", "text");
      svg.appendChild(g);
    }
    const style = createSVGElement<SVGStyleElement>("style");
    style.innerHTML = styleContent;
    if (!svg.firstChild) return;
    svg.insertBefore(style, svg.firstChild);
  }

  public refreshDrawing(): void {
    const angle = this.ogma.view.getAngle();
    const groups = this.layer.element.children;
    const scale = 1; // / this.ogma.view.getZoom();
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i] as SVGGElement;
      if (!g.hasAttribute("data-annotation")) continue;
      const id = g.getAttribute("data-annotation")!;
      const position = getTextPosition(this.getById(id));
      const { x, y } = rotateRadians(position, -angle);
      g.setAttribute("transform", `translate(${x},${y})`);
      // scale it around its center
      const size = getTextSize(this.getById(id));

      const offsetX = x + (size.width / 2) * (1 - scale);
      const offsetY = y + (size.height / 2) * (1 - scale);

      const transform = `matrix(${scale}, 0, 0, ${scale}, ${offsetX}, ${offsetY})`;
      g.setAttribute("transform", transform);
    }
  }

  public getDefaultOptions(): Text {
    return defaultOptions;
  }

  public refreshEditor() {
    if (+this.selectedId < 0 && +this.hoveredId < 0) return;
    const t = this.getById(this.selectedId) || this.getById(this.hoveredId);
    const size = getTextSize(t);
    const position = this.ogma.view.graphToScreenCoordinates(
      getTextPosition(t)
    );
    const zoom = this.ogma.view.getZoom();
    const {
      font,
      fontSize,
      color,
      background,
      padding = 0
    } = t.properties.style || defaultStyle;
    // @ts-expect-error font size type casting
    const scaledFontSize = (fontSize || 1) * zoom;
    this.textArea.value = t.properties.content;
    const elementStyle = this.editor.element.style;
    elementStyle.transform =
      `translate(${position.x}px, ${position.y}px)` +
      `translate(-50%, -50%)` +
      `translate(${(size.width / 2) * zoom}px, ${(size.height / 2) * zoom}px)`;
    elementStyle.width = `${size.width * zoom}px`;
    elementStyle.height = `${size.height * zoom}px`;

    const textAreaStyle = this.textArea.style;
    textAreaStyle.font = `${scaledFontSize} ${font}`;
    textAreaStyle.fontFamily = font || "sans-serif";
    textAreaStyle.fontSize = `${scaledFontSize}px`;
    textAreaStyle.padding = `${zoom * padding}px`;
    textAreaStyle.lineHeight = `${scaledFontSize}px`;

    textAreaStyle.boxSizing = "border-box";
    textAreaStyle.color = color || "black";
    textAreaStyle.background = background || "transparent";

    this.textArea.placeholder = this.placeholder;

    this.layer.refresh();
  }

  select(id: Id): void {
    super.select(id);
    this.textArea.classList.add("noevents");
  }

  public destroy(): void {
    super.destroy();
    document.removeEventListener("mouseup", this.onMouseUp);
    document.removeEventListener("mousemove", this.onMouseMove, true);
    // update the width of the controls depending on zoom
    this.ogma.events.off(this.onViewChanged);
  }
}

export {
  defaultOptions as defaultTextOptions,
  defaultStyle as defaultTextStyle,
  defaultControllerOptions,
  createText
};
