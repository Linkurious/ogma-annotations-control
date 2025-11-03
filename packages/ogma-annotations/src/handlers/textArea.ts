import { Overlay, Ogma } from "@linkurious/ogma";
import { LAYERS } from "../constants";
import { Store } from "../store";
import { Id, Text, defaultTextStyle } from "../types";
import { getBoxPosition, getBoxSize } from "../utils";

export class TextArea {
  private layer: Overlay;
  private textarea: HTMLTextAreaElement;
  public isFocused: boolean;
  private unsubscribe: () => void;

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
          <textarea wrap="on" name="annotation-text--input" spellcheck="false"></textarea>
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

    this.unsubscribe = this.store.subscribe(
      (state) => ({
        rotation: state.rotation,
        zoom: state.zoom
      }),
      this.update,
      { equalityFn: (a, b) => a.rotation === b.rotation && a.zoom === b.zoom }
    );
  }

  private getAnnotation() {
    const state = this.store.getState();
    if (!state.liveUpdates[this.annotation]) {
      state.startLiveUpdate([this.annotation]);
    }
    return state.liveUpdates[this.annotation] as Text;
  }

  private getPosition() {
    const annotation = this.getAnnotation();
    const corner = getBoxPosition(
      annotation,
      annotation.properties.style?.fixedSize,
      this.store.getState().zoom
    );
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
    //const padding = annotation.properties.style?.padding || 0;
    const fixedSize = annotation.properties.style?.fixedSize || false;
    const zoom = this.store.getState().zoom;

    // Scale size inversely with zoom for fixed-size text
    const effectiveScale = fixedSize ? 1 / zoom : 1;

    return {
      width: (size.width - borderWidth * 2) * effectiveScale,
      height: (size.height - borderWidth * 2) * effectiveScale
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
    const zoom = this.store.getState().zoom;

    // Scale font size inversely with zoom for fixed-size text
    const effectiveScale = fixedSize ? 1 / zoom : 1;
    const scaledFontSize = parseFloat(fontSize!.toString()) * effectiveScale;
    const scaledPadding = padding * effectiveScale;

    const textAreaStyle = textArea.style;

    textAreaStyle.font = `${scaledFontSize} ${font}`;
    textAreaStyle.fontFamily = font || "sans-serif";
    textAreaStyle.fontSize = `${scaledFontSize}px`;
    textAreaStyle.padding = `${scaledPadding}px`;
    textAreaStyle.lineHeight = `${scaledFontSize}px`;

    textAreaStyle.boxSizing = "border-box";
    textAreaStyle.color = color || "black";
    textAreaStyle.background = background || "transparent";
    textAreaStyle.borderRadius = `${borderRadius}px`;

    // Enable auto-growing for fixed-size text
    if (fixedSize) {
      textAreaStyle.overflow = "hidden"; // Hide scrollbars
      textAreaStyle.resize = "none"; // Disable manual resize
    }

    // transform origin at center
    textAreaStyle.transformOrigin = "center";
    textAreaStyle.transform = `rotate(${this.store.getState().rotation}rad)`;
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

  private updateContent() {
    const annotation = this.getAnnotation();

    // Calculate new height if this is a fixed-size text box (auto-grow)
    let newHeight = annotation.properties.height;
    let newCoordinates = annotation.geometry.coordinates;
    const isFixedSize = annotation.properties.style?.fixedSize;

    if (isFixedSize) {
      const textareaScrollHeight = this.textarea.scrollHeight;
      const borderWidth = getBorderWidth(annotation);
      const zoom = this.store.getState().zoom;

      // scrollHeight is in screen pixels (already scaled by 1/zoom for fixed-size)
      // We need to convert back to graph coordinates by multiplying by zoom
      // and then add back the border width (which was subtracted in getSize())
      const requiredHeight =
        (textareaScrollHeight + (borderWidth * 2) / zoom) * zoom;

      // Get minimum height (default to 50px if not specified)
      const minHeight = 50;
      newHeight = Math.max(minHeight, requiredHeight);

      // Adjust center position to grow downward only (keep top edge fixed)
      const heightDelta = newHeight - annotation.properties.height;
      if (Math.abs(heightDelta) > 1) {
        const [cx, cy] = annotation.geometry.coordinates as [number, number];
        // Move center down by half the height increase to keep top edge fixed
        newCoordinates = [cx, cy + heightDelta / 2];
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
  };

  public update = () => {
    this.updateStyle();
    this.updatePosition();
    this.layer.setSize(this.getSize());
  };

  destroy() {
    this.store.getState().commitLiveUpdates(new Set([this.annotation]));
    this.unsubscribe();
    this.layer.destroy();
  }
}

function getBorderWidth(annotation: Text) {
  return annotation.properties.style?.strokeWidth || 0;
}
