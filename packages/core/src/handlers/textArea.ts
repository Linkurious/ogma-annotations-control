import { Overlay, Ogma } from "@linkurious/ogma";
import { LAYERS, TEXT_LINE_HEIGHT } from "../constants";
import { Store } from "../store";
import { Id, Text, defaultTextStyle, CommentStyle } from "../types";
import { getBoxSize } from "../utils/utils";

export class TextArea {
  private layer: Overlay;
  private textarea: HTMLTextAreaElement;
  private sendButton: HTMLButtonElement | null = null;
  public isFocused: boolean;
  private unsubscribe: () => void;

  constructor(
    private ogma: Ogma,
    private store: Store,
    private annotation: Id,
    private onSendHandler: () => void = () => {}
  ) {
    const position = this.getPosition();
    const size = this.getSize();
    const annotationData = this.getAnnotation()!;
    const state = this.store.getState();
    const showSendButton = state.options?.showSendButton ?? true;
    const sendButtonIcon = state.options?.sendButtonIcon || "";
    const placeholderText = state.options?.textPlaceholder || "Enter text";

    this.layer = this.ogma.layers.addOverlay(
      {
        element: `<div class="ogma-annotation-text-editor">
          <textarea wrap="on" name="annotation-text--input" spellcheck="false" placeholder="${placeholderText}"></textarea>
          ${
            showSendButton
              ? `<button class="ogma-send-button" type="button" title="Send">
            <span class="ogma-send-button-icon">${sendButtonIcon}</span>
          </button>`
              : ""
          }
        </div>`,
        position,
        size
      },
      LAYERS.EDITOR
    );
    this.textarea = this.layer.element.querySelector("textarea")!;
    this.textarea.setAttribute("wrap", "on");
    this.textarea.setAttribute("spellcheck", "false");
    this.textarea.value = annotationData.properties.content || "";

    if (showSendButton) {
      this.sendButton = this.layer.element.querySelector(".ogma-send-button")!;
      this.sendButton.addEventListener("click", this.onSendClick);
      this.updateSendButtonState();
    }

    this.isFocused = false;

    this.textarea.addEventListener("focus", this.onFocus);
    this.textarea.addEventListener("blur", this.onBlur);
    this.textarea.addEventListener("input", this.onInput);
    this.textarea.addEventListener("keyup", this.onKeyup);
    this.textarea.addEventListener("keydown", this.onKeydown);
    this.textarea.addEventListener("wheel", this.onMouseEvent);
    this.textarea.addEventListener("mouseup", this.onMouseEvent);
    this.textarea.addEventListener("mousedown", this.onMouseEvent);
    this.textarea.addEventListener("click", this.onMouseEvent);
    this.textarea.addEventListener("drag", this.onMouseEvent);
    this.updateStyle();
    this.updatePosition();
    this.textarea.focus();

    this.unsubscribe = this.store.subscribe(
      (state) => ({
        rotation: state.rotation,
        zoom: state.zoom,
        annotation: state.features[this.annotation]
      }),
      this.update,
      {
        equalityFn: (a, b) =>
          a.rotation === b.rotation &&
          a.zoom === b.zoom &&
          a.annotation === b.annotation
      }
    );
  }

  private getAnnotation() {
    const state = this.store.getState();
    if (!state.liveUpdates[this.annotation]) {
      state.startLiveUpdate([this.annotation]);
    }
    return {
      ...this.store.getState().getFeature(this.annotation) as Text,
      ...state.liveUpdates[this.annotation] as Text
    };
  }

  private getPosition() {
    const annotation = this.getAnnotation();
    if (!annotation) return { x: 0, y: 0 };

    const style = annotation.properties.style as CommentStyle | undefined;
    const fixedSize = style?.fixedSize || false;
    const maxHeight = style?.maxHeight;
    const zoom = this.store.getState().zoom;
    const borderWidth = getBorderWidth(annotation);

    // Get center coordinates (in graph space)
    const [cx, cy] = annotation.geometry.coordinates as [number, number];

    const width = annotation.properties.width;
    let height = annotation.properties.height;

    // Cap height at maxHeight for position calculation (in graph space)
    if (maxHeight) {
      height = Math.min(height, maxHeight);
    }

    // For fixed-size, scale position to screen space
    const scale = fixedSize ? 1 / zoom : 1;

    // Calculate top-left corner from center
    return {
      x: cx - (width * scale) / 2 + borderWidth * scale,
      y: cy - (height * scale) / 2 + borderWidth * scale
    };
  }

  private getSize() {
    const annotation = this.getAnnotation();
    const size = getBoxSize(annotation);
    const borderWidth = getBorderWidth(annotation);
    const style = annotation.properties.style as CommentStyle | undefined;
    const fixedSize = style?.fixedSize || false;
    const maxHeight = style?.maxHeight;
    const zoom = this.store.getState().zoom;
    const state = this.store.getState();
    const showSendButton = state.options?.showSendButton ?? true;

    // Scale size inversely with zoom for fixed-size text
    const effectiveScale = fixedSize ? 1 / zoom : 1;

    let height = (size.height - borderWidth * 2) * effectiveScale;

    // Cap height at maxHeight if set (scaled for fixed-size)
    if (maxHeight) {
      const scaledMaxHeight = (maxHeight - borderWidth * 2) * effectiveScale;
      height = Math.min(height, scaledMaxHeight);
    }
    // Button is sized via width/height at 24*effectiveScale, plus 4px gap
    const buttonHeight = showSendButton ? 28 * effectiveScale : 0;
    return {
      width: (size.width - borderWidth * 2) * effectiveScale,
      height: height + buttonHeight
    };
  }

  private updateStyle() {
    const annotation = this.getAnnotation();
    if (!annotation) return;

    const {
      font,
      fontSize = defaultTextStyle.fontSize,
      borderRadius,
      color,
      background,
      padding = 0,
      fixedSize = defaultTextStyle.fixedSize
    } = annotation.properties.style || defaultTextStyle;
    const textArea = this.textarea;
    const editorEl = this.layer.element as HTMLElement;
    const zoom = this.store.getState().zoom;

    // Scale font size inversely with zoom for fixed-size text
    const effectiveScale = fixedSize ? 1 / zoom : 1;
    const scaledFontSize = parseFloat(fontSize!.toString()) * effectiveScale;
    const scaledPadding = padding * effectiveScale;

    // Style the parent container
    const editorStyle = editorEl.style;
    editorStyle.display = "grid";
    editorStyle.gridTemplateRows = "1fr auto";
    editorStyle.boxSizing = "border-box";
    editorStyle.background = background || "transparent";
    editorStyle.borderRadius = `${(borderRadius || 0) * effectiveScale}px`;
    editorStyle.padding = `${scaledPadding}px`;
    editorStyle.transformOrigin = "center";
    editorStyle.transform = `rotate(${this.store.getState().rotation}rad)`;

    // Style the textarea
    const textAreaStyle = textArea.style;
    textAreaStyle.font = `${scaledFontSize} ${font}`;
    textAreaStyle.fontFamily = font || "sans-serif";
    textAreaStyle.fontSize = `${scaledFontSize}px`;
    textAreaStyle.lineHeight = `${scaledFontSize * TEXT_LINE_HEIGHT}px`;
    textAreaStyle.padding = "0";
    textAreaStyle.border = "none";
    textAreaStyle.outline = "none";
    textAreaStyle.boxSizing = "border-box";
    textAreaStyle.color = color || "black";
    textAreaStyle.background = "transparent";
    textAreaStyle.flex = "1";
    textAreaStyle.minHeight = "0";
    textAreaStyle.resize = "none";

    // Scale button via width/height to maintain same screen size regardless of zoom
    // (transform: scale() doesn't affect layout, causing a gap in the grid)
    if (this.sendButton) {
      const buttonSize = 24 * effectiveScale;
      const buttonPadding = 4 * effectiveScale;
      this.sendButton.style.width = `${buttonSize}px`;
      this.sendButton.style.height = `${buttonSize}px`;
      this.sendButton.style.padding = `${buttonPadding}px`;
      this.sendButton.style.transform = "";
      const icon = this.sendButton.querySelector(
        ".ogma-send-button-icon"
      ) as HTMLElement;
      if (icon) {
        const iconSize = 16 * effectiveScale;
        icon.style.width = `${iconSize}px`;
        icon.style.height = `${iconSize}px`;
      }
    }

    // Enable auto-growing for fixed-size text
    if (fixedSize) {
      const maxHeight = (annotation.properties.style as CommentStyle | undefined)?.maxHeight;
      // Enable scrolling only when content has reached maxHeight
      const needsScroll = maxHeight && annotation.properties.height >= maxHeight;
      textAreaStyle.overflowY = needsScroll ? "auto" : "hidden";
      textAreaStyle.overflowX = "hidden";
    }
  }

  private updatePosition() {
    this.layer.setPosition(this.getPosition());
  }

  private onFocus = () => {
    this.isFocused = true;
  };

  private onBlur = () => {
    // apply changes
    if (this.getAnnotation()) this.updateContent();
    this.isFocused = false;
  };
  private onKeyup = (evt: KeyboardEvent) => {
    if (evt.key === "Escape") {
      this.textarea.blur();
    }
    evt.stopPropagation();
  };
  private onKeydown = (evt: KeyboardEvent) => {
    evt.stopPropagation();
  };

  private onMouseEvent = (evt: WheelEvent| MouseEvent) => {
    // Stop mouse events from propagating to Ogma (prevents zoom while scrolling for instance)
    evt.stopPropagation();
  };

  private updateContent() {
    const annotation = this.getAnnotation();

    // Calculate new height if this is a fixed-size text box (auto-grow)
    let newHeight = annotation.properties.height;
    let newCoordinates = annotation.geometry.coordinates;
    const isFixedSize = annotation.properties.style?.fixedSize;

    if (isFixedSize) {
      // Temporarily collapse height so scrollHeight reflects actual content
      const prevHeight = this.textarea.style.height;
      this.textarea.style.height = '0px';
      const textareaScrollHeight = this.textarea.scrollHeight;
      this.textarea.style.height = prevHeight;
      const borderWidth = getBorderWidth(annotation);
      const zoom = this.store.getState().zoom;

      // scrollHeight is in screen pixels (already scaled by 1/zoom for fixed-size)
      // We need to convert back to graph coordinates by multiplying by zoom
      // and then add back the border width (which was subtracted in getSize())
      const requiredHeight =
        (textareaScrollHeight + (borderWidth * 2) / zoom) * zoom;

      // Get minimum height from style (default to 50px if not specified)
      const minHeight =
        (annotation.properties.style as { minHeight?: number })?.minHeight ||
        50;
      newHeight = Math.max(minHeight, requiredHeight);

      // Adjust center position to grow downward only (keep top edge fixed)
      // But stop moving once maxHeight is reached
      const maxHeight = (annotation.properties.style as CommentStyle | undefined)?.maxHeight;
      const oldHeight = annotation.properties.height;
      const heightDelta = newHeight - oldHeight;

      if (Math.abs(heightDelta) > 1) {
        const [cx, cy] = annotation.geometry.coordinates as [number, number];

        if (maxHeight && newHeight > maxHeight) {
          // Clamp to maxHeight, only adjust center for the portion up to maxHeight
          const effectiveDelta = maxHeight - oldHeight;
          newHeight = maxHeight;
          if (Math.abs(effectiveDelta) > 1) {
            newCoordinates = [cx, cy + effectiveDelta / 2];
          }
        } else {
          // Normal growth or shrink (below maxHeight)
          newCoordinates = [cx, cy + heightDelta / 2];
        }
      }
    }

    // Update content, height, and position (if changed)
    const update: Text = {
      ...annotation,
      properties: {
        ...annotation.properties,
        content: this.textarea.value,
        height: newHeight
      },
      geometry: {
        ...annotation.geometry,
        coordinates: newCoordinates
      }
    };

    // If height changed, update the layer size and position
    if (isFixedSize && Math.abs(annotation.properties.height - newHeight) > 1) {
      this.layer.setSize(this.getSize());
      this.layer.setPosition(this.getPosition());
    }

    this.store.getState().applyLiveUpdate(this.annotation, update);
  }

  private onInput = () => {
    this.updateContent();
    this.updateStyle();
    this.updatePosition();
    this.layer.setSize(this.getSize());
    this.updateSendButtonState();
  };

  private onSendClick = (evt: MouseEvent) => {
    evt.preventDefault();
    evt.stopPropagation();
    if (!this.sendButton || this.sendButton.disabled) return;

    this.updateContent();
    // Commit changes and close editor
    this.textarea.blur();
    this.onSendHandler();
  };

  private updateSendButtonState() {
    if (!this.sendButton) return;

    const isEmpty = this.textarea.value.trim().length === 0;
    this.sendButton.disabled = isEmpty;
  }

  public update = () => {
    if (!this.getAnnotation()) return;
    this.updateStyle();
    this.updatePosition();
    this.layer.setSize(this.getSize());
  };

  destroy() {
    this.store.getState().commitLiveUpdates(new Set([this.annotation]));
    this.unsubscribe();
    if (this.sendButton) {
      this.sendButton.removeEventListener("click", this.onSendClick);
    }
    this.layer.destroy();
  }
}

function getBorderWidth(annotation: Text) {
  return annotation.properties.style?.strokeWidth || 0;
}
