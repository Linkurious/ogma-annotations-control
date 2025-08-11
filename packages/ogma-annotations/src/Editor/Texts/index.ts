import Ogma from "@linkurious/ogma";
import {
  createText,
  defaultControllerOptions,
  defaultOptions,
  defaultStyle
} from "./defaults";
import drawText from "./render";
import { EVT_DRAG_END, EVT_UPDATE, NONE } from "../../constants";
import { Id, Text } from "../../types";
import { createSVGElement, getTextSize } from "../../utils";
import { BoxEditor, BoxEditorOptions } from "../Box";

/**
 * @class Texts
 * Draw, update, edit texts
 */
export class Texts extends BoxEditor<Text> {
  private textArea: HTMLTextAreaElement;
  private placeholder = "Type your text here...";

  constructor(
    ogma: Ogma,
    options: BoxEditorOptions<Text> = {
      drawContent: drawText,
      addOns: `<textarea wrap="on"></textarea>`
    }
  ) {
    super(ogma, {
      ...options,
      addOns: options.addOns || `<textarea wrap="on"></textarea>`,
      drawContent: options.drawContent || drawText
    });
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
  }

  protected onMouseUpInternal(): void {
    this.textArea.classList.remove("noevents");
    this.textArea.removeAttribute("disabled");
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

  protected startDragging = (text: Text, clientX: number, clientY: number) => {
    super.startDragging(text, clientX, clientY);
    this.textArea.classList.add("noevents");
    this.textArea.setAttribute("disabled", "disabled");
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

  public draw(svg: SVGSVGElement): void {
    svg.innerHTML = "";
    const styleContent = "";
    const { angle, zoom } = this.ogma.view.get();
    for (let i = 0; i < this.elements.length; i++) {
      const annotation = this.elements[i];
      const className = `class${i}`;
      const size = getTextSize(annotation);
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
      this.drawContent(annotation, g);
      g.setAttribute(
        "transform",
        this.getTransformMatrix(annotation, zoom, angle)
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

  protected _refreshEditorInternal(t: Text, zoom: number) {
    this.textArea.value = t.properties.content;
    const {
      font,
      fontSize,
      color,
      background,
      padding = 0
    } = t.properties.style || defaultStyle;
    // @ts-expect-error font size type casting
    const scaledFontSize = (fontSize || 1) * zoom;
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
  }

  select(id: Id): void {
    super.select(id);
    this.textArea.classList.add("noevents");
  }
}

export {
  defaultOptions as defaultTextOptions,
  defaultStyle as defaultTextStyle,
  defaultControllerOptions,
  createText
};
