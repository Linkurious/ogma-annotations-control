import {
  RgbaColor,
  RgbaColorPicker
} from "vanilla-colorful/rgba-color-picker.js";
import {
  Control,
  Annotation,
  Arrow,
  Text,
  Polygon,
  isArrow,
  isText,
  isPolygon,
  parseColor,
  Extremity,
  defaultArrowStyle
} from "../src";
import "./AnnotationPanel.css";

type AnnotationMode = "arrow" | "text" | "polygon" | null;

interface AnnotationPanelOptions {
  control: Control;
}

export class AnnotationPanel {
  private panel: HTMLElement;
  private control: Control;
  private mode: AnnotationMode = null;
  private currentAnnotation: Annotation | null = null;

  // UI Elements
  private panelBody: HTMLElement;
  private colorCircles: HTMLButtonElement[];
  private colorPickerOverlay: HTMLElement | null = null;
  private colorPicker: RgbaColorPicker | null = null;

  // State
  private currentColor = "#0099FF";
  private recentColors = ["#0099FF", "#FF7523", "#44AA99"];
  private activeColorIndex = 0;

  constructor(options: AnnotationPanelOptions) {
    this.control = options.control;

    this.panel = document.getElementById("annotation-panel")!;
    this.panelBody = this.panel.querySelector(".panel-body")!;
    this.colorCircles = [
      document.getElementById("color-1")! as HTMLButtonElement,
      document.getElementById("color-2")! as HTMLButtonElement,
      document.getElementById("color-3")! as HTMLButtonElement
    ];

    this.setupControlListeners();
    this.setupColorCircles();
    this.setupGlobalClickHandler();
  }

  private setupControlListeners() {
    // Show/hide panel based on selection
    this.control.on("select", (selection) => {
      if (selection.ids.length === 1) {
        const annotation = this.control.getAnnotation(selection.ids[0]);
        if (annotation) {
          this.setAnnotation(annotation);
          this.show();
        }
      } else this.hide();
    });
    this.panel.addEventListener("click", this.stopEventPropagation);
    this.panel.addEventListener("mousedown", this.stopEventPropagation);
    this.panel.addEventListener("mousemove", this.stopEventPropagation);

    this.control.on("unselect", this.hide);
  }

  private stopEventPropagation = (e: Event) => {
    e.stopPropagation();
  };

  private setupColorCircles() {
    this.colorCircles.forEach((circle, index) => {
      circle.addEventListener("click", (e) => {
        e.stopPropagation();
        const color = this.recentColors[index];

        // Check if this circle is already active (has :active pseudo-class state)
        const wasActive =
          this.activeColorIndex === index &&
          circle.classList.contains("color-circle-primary");

        // Update active state
        this.activeColorIndex = index;
        this.currentColor = color;
        this.updateColorCircles();

        // If it was already active, open color picker
        if (wasActive) this.toggleColorPicker(circle);
        else {
          if (this.mode === "arrow") {
            this.updateArrow({ strokeColor: this.currentColor });
          }
        }
      });
    });

    this.updateColorCircles();
  }

  private setupGlobalClickHandler() {
    document.addEventListener("click", (e) => {
      if (
        this.colorPickerOverlay &&
        !this.colorPickerOverlay.contains(e.target as Node) &&
        !this.colorCircles.some((circle) => circle.contains(e.target as Node))
      ) {
        this.closeColorPicker();
      }
    });
  }

  private setAnnotation(annotation: Annotation) {
    this.currentAnnotation = annotation;

    if (isArrow(annotation)) {
      this.mode = "arrow";
      this.renderArrowMode(annotation);
    } else if (isText(annotation)) {
      this.mode = "text";
      this.renderTextMode(annotation);
    } else if (isPolygon(annotation)) {
      this.mode = "polygon";
      this.renderPolygonMode(annotation);
    }
  }

  private renderArrowExtremity(arrow: Arrow, side: "tail" | "head") {
    const ext = arrow.properties.style?.[side] || "none";
    return `<div class="section-header">
        <h3>${side}</h3>
      </div>
      <div class="direction-section">
        <button class="direction-button ${ext === "none" ? "active" : ""}" data-end="${side}" data-style="none">
          <i class="icon-x"></i>
        </button>
        <button class="direction-button ${ext === "arrow" ? "active" : ""}" data-end="${side}" data-style="arrow">
          <i class="icon-arrow-${side === "tail" ? "left" : "right"}"></i>
        </button>
        <button class="direction-button ${ext === "arrow-plain" ? "active" : ""}" data-end="${side}" data-style="arrow-plain" style="transform: rotate(${side === "tail" ? "180deg" : "0deg"})">
          <i class="icon-play"></i>
        </button>
        <button class="direction-button ${ext === "halo-dot" ? "active" : ""}" data-end="${side}" data-style="halo-dot">
          <i class="icon-circle-dot"></i>
        </button>
        <button class="direction-button ${ext === "dot" ? "active" : ""}" data-end="${side}" data-style="dot">
          <i class="icon-dot"></i>
        </button>
      </div>`;
  }

  private renderArrowMode(arrow: Arrow) {
    const style = arrow.properties.style || {};
    const strokeColor = style.strokeColor || defaultArrowStyle.strokeColor;
    const strokeWidth = style.strokeWidth || defaultArrowStyle.strokeWidth;
    const strokeType = style.strokeType || defaultArrowStyle.strokeType;

    this.updateColorFromAnnotation(strokeColor!);

    this.panelBody.innerHTML = `
      <!-- Color circles -->
      <div class="color-selector">
        <button class="color-circle color-circle-primary" data-index="0" data-color="${this.recentColors[0]}">
          <div class="color-inner"></div>
        </button>
        <button class="color-circle" data-index="1" data-color="${this.recentColors[1]}">
          <div class="color-inner"></div>
        </button>
        <button class="color-circle" data-index="2" data-color="${this.recentColors[2]}">
          <div class="color-inner"></div>
        </button>
      </div>

      <!-- Arrow Head -->
      ${this.renderArrowExtremity(arrow, "head")}

      <!-- Arrow Tail -->
      ${this.renderArrowExtremity(arrow, "tail")}

      <!-- Line Width -->
      <div class="section-header">
        <h3>SIZE</h3>
      </div>
      <div class="slider-section">
        <input type="range" id="line-width-slider" class="slider" min="1" max="20" value="${strokeWidth}">
        <div class="slider-value">
          <span id="line-width-value">${strokeWidth}</span>
        </div>
      </div>

      <!-- Line Type -->
      <div class="section-header">
        <h3>LINE TYPE</h3>
      </div>
      <div class="linetype-section">
        <button class="linetype-button ${strokeType === "plain" ? "active" : ""}" data-linetype="plain">
          <i class="icon-minus"></i>
        </button>
        <button class="linetype-button ${strokeType === "dashed" ? "active" : ""}" data-linetype="dashed">
          <i class="icon-separator-horizontal"></i>
        </button>
      </div>
    `;

    this.bindArrowEvents();
  }

  private renderTextMode(text: Text) {
    const color = text.properties.style?.color || "#505050";
    const fontSize = text.properties.style?.fontSize || 18;

    this.updateColorFromAnnotation(color);

    this.panelBody.innerHTML = `
      <!-- Color circles -->
      <div class="color-selector">
        <button class="color-circle color-circle-primary" data-index="0" data-color="${this.recentColors[0]}">
          <div class="color-inner"></div>
        </button>
        <button class="color-circle" data-index="1" data-color="${this.recentColors[1]}">
          <div class="color-inner"></div>
        </button>
        <button class="color-circle" data-index="2" data-color="${this.recentColors[2]}">
          <div class="color-inner"></div>
        </button>
      </div>

      <!-- Background Color -->
      <div class="section-header">
        <h3>BACKGROUND</h3>
      </div>
      <div class="color-selector">
        <button class="color-circle" data-background-color="#f5f5f5">
          <div class="color-inner" style="--circle-color: #f5f5f5;"></div>
        </button>
        <button class="color-circle" data-background-color="#EDE6FF">
          <div class="color-inner" style="--circle-color: #EDE6FF;"></div>
        </button>
        <button class="color-circle" data-background-color="transparent">
          <div class="color-inner" style="--circle-color: white; border: 2px dashed #ccc;"></div>
        </button>
      </div>

      <!-- Font Size -->
      <div class="section-header">
        <h3>FONT SIZE</h3>
      </div>
      <div class="slider-section">
        <input type="range" id="font-size-slider" class="slider" min="8" max="72" value="${fontSize}">
        <div class="slider-value">
          <span id="font-size-value">${fontSize}</span>
        </div>
      </div>
    `;

    this.bindTextEvents();
  }

  private renderPolygonMode(polygon: Polygon) {
    const strokeColor = polygon.properties.style?.strokeColor || "#000000";
    const strokeWidth = polygon.properties.style?.strokeWidth || 2;
    const background = polygon.properties.style?.background || "transparent";
    const strokeType = polygon.properties.style?.strokeType || "plain";

    this.updateColorFromAnnotation(strokeColor);

    this.panelBody.innerHTML = `
      <!-- Color circles -->
      <div class="color-selector">
        <button class="color-circle color-circle-primary" data-index="0" data-color="${this.recentColors[0]}">
          <div class="color-inner"></div>
        </button>
        <button class="color-circle" data-index="1" data-color="${this.recentColors[1]}">
          <div class="color-inner"></div>
        </button>
        <button class="color-circle" data-index="2" data-color="${this.recentColors[2]}">
          <div class="color-inner"></div>
        </button>
      </div>

      <!-- Fill Toggle -->
      <div class="toggle-section">
        <i class="icon-paint-bucket"></i>
        <label class="toggle-switch">
          <input type="checkbox" id="fill-toggle" ${background !== "transparent" ? "checked" : ""}>
          <span class="toggle-slider"></span>
        </label>
      </div>

      <!-- Line Width -->
      <div class="section-header">
        <h3>SIZE</h3>
      </div>
      <div class="slider-section">
        <input type="range" id="line-width-slider" class="slider" min="1" max="20" value="${strokeWidth}">
        <div class="slider-value">
          <span id="line-width-value">${strokeWidth}</span>
        </div>
      </div>

      <!-- Line Type -->
      <div class="section-header">
        <h3>LINE TYPE</h3>
      </div>
      <div class="linetype-section">
        <button class="linetype-button ${strokeType === "plain" ? "active" : ""}" data-linetype="plain">
          <i class="icon-minus"></i>
        </button>
        <button class="linetype-button ${strokeType === "dashed" ? "active" : ""}" data-linetype="dashed">
          <i class="icon-separator-horizontal"></i>
        </button>
      </div>
    `;

    this.bindPolygonEvents();
  }

  private bindArrowEvents() {
    this.rebindColorCircles();

    // Head and Tail style buttons
    const directionButtons =
      this.panelBody.querySelectorAll<HTMLButtonElement>(".direction-button");
    directionButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const end = btn.dataset.end as "head" | "tail";
        const style = btn.dataset.style as Extremity;

        // Only toggle active state within the same section (head or tail)
        const sameEndButtons =
          this.panelBody.querySelectorAll<HTMLButtonElement>(
            `.direction-button[data-end="${end}"]`
          );
        sameEndButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        // Update the appropriate end
        if (end === "head") this.updateArrow({ head: style });
        else this.updateArrow({ tail: style });
      });
    });

    // Line width slider
    const lineWidthSlider =
      this.panelBody.querySelector<HTMLInputElement>("#line-width-slider")!;
    const lineWidthValue = this.panelBody.querySelector("#line-width-value")!;
    lineWidthSlider.addEventListener("input", () => {
      const value = parseInt(lineWidthSlider.value, 10);
      lineWidthValue.textContent = value.toString();
      this.updateArrow({ strokeWidth: value });
    });

    // Line type buttons
    const linetypeButtons =
      this.panelBody.querySelectorAll<HTMLButtonElement>(".linetype-button");
    linetypeButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const linetype = btn.dataset.linetype as "plain" | "dashed";
        linetypeButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.updateArrow({ strokeType: linetype });
      });
    });
  }

  private bindTextEvents() {
    this.rebindColorCircles();

    // Background color circles
    const bgColorCircles = this.panelBody.querySelectorAll<HTMLButtonElement>(
      "[data-background-color]"
    );
    bgColorCircles.forEach((circle) => {
      circle.addEventListener("click", () => {
        const bgColor = circle.dataset.backgroundColor!;
        this.updateText({ background: bgColor });
      });
    });

    // Font size slider
    const fontSizeSlider =
      this.panelBody.querySelector<HTMLInputElement>("#font-size-slider")!;
    const fontSizeValue = this.panelBody.querySelector("#font-size-value")!;
    fontSizeSlider.addEventListener("input", () => {
      const value = parseInt(fontSizeSlider.value, 10);
      fontSizeValue.textContent = value.toString();
      this.updateText({ fontSize: value });
    });
  }

  private bindPolygonEvents() {
    this.rebindColorCircles();

    // Fill toggle
    const fillToggle =
      this.panelBody.querySelector<HTMLInputElement>("#fill-toggle")!;
    fillToggle.addEventListener("change", () => {
      const isFilled = fillToggle.checked;
      const background = isFilled ? this.currentColor : "transparent";
      this.updatePolygon({ background });
    });

    // Line width slider
    const lineWidthSlider =
      this.panelBody.querySelector<HTMLInputElement>("#line-width-slider")!;
    const lineWidthValue = this.panelBody.querySelector("#line-width-value")!;
    lineWidthSlider.addEventListener("input", () => {
      const value = parseInt(lineWidthSlider.value, 10);
      lineWidthValue.textContent = value.toString();
      this.updatePolygon({ strokeWidth: value });
    });

    // Line type buttons
    const linetypeButtons =
      this.panelBody.querySelectorAll<HTMLButtonElement>(".linetype-button");
    linetypeButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const linetype = btn.dataset.linetype as "plain" | "dashed";
        linetypeButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.updatePolygon({ strokeType: linetype });
      });
    });
  }

  private rebindColorCircles() {
    this.colorCircles = Array.from(
      this.panelBody.querySelectorAll<HTMLButtonElement>("[data-index]")
    );
    this.setupColorCircles();
  }

  private updateColorFromAnnotation(color: string) {
    // Update recent colors if this color is not already present
    if (!this.recentColors.includes(color)) {
      this.recentColors.unshift(color);
      this.recentColors = this.recentColors.slice(0, 3);
      this.activeColorIndex = 0;
    } else {
      this.activeColorIndex = this.recentColors.indexOf(color);
    }
    this.currentColor = color;
  }

  private updateColorCircles() {
    this.colorCircles.forEach((circle, index) => {
      const color = this.recentColors[index];
      circle.setAttribute("data-color", color);
      circle.style.setProperty("--circle-color", color);

      if (index === this.activeColorIndex) {
        circle.classList.add("color-circle-primary");
      } else {
        circle.classList.remove("color-circle-primary");
      }
    });
  }

  private toggleColorPicker(button: HTMLButtonElement) {
    if (this.colorPickerOverlay) {
      this.closeColorPicker();
      return;
    }

    // Create overlay
    this.colorPickerOverlay = document.createElement("div");
    this.colorPickerOverlay.className = "color-picker-overlay";
    document.body.appendChild(this.colorPickerOverlay);

    // Create color picker
    this.colorPicker = new RgbaColorPicker();
    this.colorPicker.color = parseColor(this.currentColor);
    this.colorPickerOverlay.appendChild(this.colorPicker);

    // Position next to the button
    const rect = button.getBoundingClientRect();
    this.colorPickerOverlay.style.right = `${window.innerWidth - rect.right}px`;
    this.colorPickerOverlay.style.top = `${rect.bottom + 10}px`;

    // Handle color changes
    this.colorPicker.addEventListener("color-changed", (event) => {
      this.currentColor = rgbaToString(event.detail.value);
      this.recentColors[this.activeColorIndex] = this.currentColor;
      this.updateColorCircles();

      // Update annotation based on mode
      if (this.mode === "arrow")
        this.updateArrow({ strokeColor: this.currentColor });
      else if (this.mode === "text")
        this.updateText({ color: this.currentColor });
      else if (this.mode === "polygon")
        this.updatePolygon({ strokeColor: this.currentColor });
    });
  }

  private closeColorPicker() {
    if (this.colorPickerOverlay) {
      this.colorPickerOverlay.remove();
      this.colorPickerOverlay = null;
      this.colorPicker = null;
    }
  }

  private updateArrow(styleUpdates: Partial<Arrow["properties"]["style"]>) {
    if (!this.currentAnnotation || !isArrow(this.currentAnnotation)) return;
    this.control.updateStyle<Arrow>(this.currentAnnotation.id, styleUpdates);
  }

  private updateText(styleUpdates: Partial<Text["properties"]["style"]>) {
    if (!this.currentAnnotation) return;
    this.control.updateStyle<Text>(this.currentAnnotation.id, styleUpdates);
  }

  private updatePolygon(styleUpdates: Partial<Polygon["properties"]["style"]>) {
    if (!this.currentAnnotation || !isPolygon(this.currentAnnotation)) return;
    this.control.updateStyle(this.currentAnnotation.id, styleUpdates);
  }

  public show() {
    setTimeout(() => {
      this.panel.style.display = "block";
    }, 200);
  }

  public hide = () => {
    this.panel.style.display = "none";
    this.closeColorPicker();
    this.currentAnnotation = null;
    this.mode = null;
  };

  public destroy() {
    this.closeColorPicker();
  }
}

function rgbaToString(color: RgbaColor): string {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
}
