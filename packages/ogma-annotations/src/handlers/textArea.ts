import { Overlay, Ogma } from "@linkurious/ogma";
import { LAYERS } from "../constants";
import { Store } from "../store";
import { Id, Text, defaultTextStyle } from "../types";
import { getBoxPosition, getBoxSize } from "../utils";

export class TextArea {
  private layer: Overlay;
  private textarea: HTMLTextAreaElement;
  public isFocused: boolean;

  constructor(
    private ogma: Ogma,
    private store: Store,
    private annotation: Id
  ) {
    const position = this.getPosition();
    const size = this.getSize();
    this.layer = this.ogma.layers.addOverlay(
      {
        element: `<div class="ogma-annotation-text-editor">
          <textarea wrap="on" spellcheck="false"></textarea>
        </div>`,
        position,
        size
      },
      LAYERS.EDITOR
    );
    this.textarea = this.layer.element.querySelector("textarea")!;
    this.textarea.setAttribute("wrap", "on");
    this.textarea.setAttribute("spellcheck", "false");
    this.textarea.value = this.getAnnotation()!.properties.content || "";

    this.isFocused = false;

    this.textarea.addEventListener("focus", this.onFocus);
    this.textarea.addEventListener("blur", this.onBlur);
    this.textarea.addEventListener("input", this.onInput);
    this.updateStyle();
    this.updatePosition();
  }

  private getAnnotation() {
    const state = this.store.getState();
    const liveAnnotation = state.liveUpdates[this.annotation];
    if (liveAnnotation) return liveAnnotation as Text;
    else throw new Error("Annotation is not being edited");
  }

  private getPosition() {
    const annotation = this.getAnnotation();
    const corner = getBoxPosition(annotation);
    const borderWidth = getBorderWidth(annotation);
    return {
      x: corner.x + borderWidth,
      y: corner.y + borderWidth
    };
  }

  private getSize() {
    const annotation = this.getAnnotation();
    const size = getBoxSize(annotation);
    const borderWidth = getBorderWidth(annotation);
    return {
      width: size.width - borderWidth * 2,
      height: size.height - borderWidth * 2
    };
  }

  private updateStyle() {
    const annotation = this.getAnnotation()!;

    const {
      font,
      fontSize = defaultTextStyle.fontSize,
      color,
      background,
      padding = 0
    } = annotation.properties.style || defaultTextStyle;
    const textArea = this.textarea;
    const scaledFontSize = parseFloat(fontSize!.toString());
    const textAreaStyle = textArea.style;

    textAreaStyle.font = `${scaledFontSize} ${font}`;
    textAreaStyle.fontFamily = font || "sans-serif";
    textAreaStyle.fontSize = `${scaledFontSize}px`;
    textAreaStyle.padding = `${padding}px`;
    textAreaStyle.lineHeight = `${scaledFontSize}px`;

    textAreaStyle.boxSizing = "border-box";
    textAreaStyle.color = color || "black";
    textAreaStyle.background = background || "transparent";
  }

  private updatePosition() {
    this.layer.setPosition(this.getPosition());
  }

  private onFocus = () => {
    this.isFocused = true;
  };

  private onBlur = () => {
    // apply changes
    this.updateContent();
    this.isFocused = false;
  };

  private updateContent() {
    const annotation = this.getAnnotation();
    const update: Text = {
      ...annotation,
      properties: {
        ...annotation.properties,
        content: this.textarea.value
      }
    };
    this.store.getState().applyLiveUpdate(this.annotation, update);
  }

  private onInput = () => {
    this.updateContent();
    this.updateStyle();
  };

  public update() {
    this.updateStyle();
    this.updatePosition();
  }

  destroy() {
    this.layer.destroy();
  }
}

function getBorderWidth(annotation: Text) {
  return annotation.properties.style?.strokeWidth || 0;
}
