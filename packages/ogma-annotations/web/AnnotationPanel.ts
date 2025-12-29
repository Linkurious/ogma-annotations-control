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
  defaultArrowStyle,
  defaultTextStyle,
  isBox
} from "../src";
import "./AnnotationPanel.css";

type AnnotationMode = "arrow" | "text" | "polygon" | null;

interface AnnotationPanelOptions {
  control: Control;
}

export class AnnotationPanel {
  // Core dependencies
  private control: Control;
  private panel: HTMLElement;
  private panelBody: HTMLElement;

  // State
  private mode: AnnotationMode = null;
  private currentAnnotation: Annotation | null = null;
  private currentColor = "#0099FF";
  private recentColors = ["#0099FF", "#FF7523", "#44AA99"];
  private activeColorIndex = 0;

  // UI Elements
  private colorCircles: HTMLButtonElement[] = [];
  private colorPickerOverlay: HTMLElement | null = null;
  private colorPicker: RgbaColorPicker | null = null;

  constructor(options: AnnotationPanelOptions) {
    this.control = options.control;
    this.panel = document.getElementById("annotation-panel")!;
    this.panelBody = this.panel.querySelector(".panel-body")!;

    this.setupControlListeners();
    this.setupGlobalClickHandler();
  }

  // ============================================================================
  // INITIALIZATION & EVENT SETUP
  // ============================================================================

  private setupControlListeners() {
    this.control.on("select", (selection) => {
      if (selection.ids.length === 1) {
        const annotation = this.control.getAnnotation(selection.ids[0]);
        if (annotation) {
          this.setAnnotation(annotation);
          this.show();
        }
      } else {
        this.hide();
      }
    });

    this.control.on("unselect", this.hide);

    this.panel.addEventListener("click", this.stopEventPropagation);
    this.panel.addEventListener("mousedown", this.stopEventPropagation);
    this.panel.addEventListener("mousemove", this.stopEventPropagation);
  }

  private setupGlobalClickHandler() {
    document.addEventListener("click", (e) => {
      // Close color picker when clicking outside
      if (
        this.colorPickerOverlay &&
        !this.colorPickerOverlay.contains(e.target as Node) &&
        !this.colorCircles.some((circle) => circle.contains(e.target as Node))
      ) {
        this.closeColorPicker();
      }

      // Close dropdowns when clicking outside
      this.panelBody.querySelectorAll(".custom-select").forEach((s) => {
        s.classList.remove("open");
      });
    });
  }

  private stopEventPropagation = (e: Event) => {
    e.stopPropagation();
  };

  // ============================================================================
  // RENDERING - MAIN MODE RENDERERS
  // ============================================================================

  private setAnnotation(annotation: Annotation) {
    this.currentAnnotation = annotation;

    if (isArrow(annotation)) {
      this.mode = "arrow";
      this.renderArrowMode(annotation);
    } else if (isText(annotation) || isBox(annotation)) {
      this.mode = "text";
      this.renderTextMode(annotation as Text);
    } else if (isPolygon(annotation)) {
      this.mode = "polygon";
      this.renderPolygonMode(annotation);
    }
  }

  private renderArrowMode(arrow: Arrow) {
    const style = arrow.properties.style || {};
    const strokeColor = style.strokeColor || defaultArrowStyle.strokeColor;
    const strokeWidth = style.strokeWidth || defaultArrowStyle.strokeWidth;
    const strokeType = style.strokeType || defaultArrowStyle.strokeType;

    this.updateColorFromAnnotation(strokeColor!);

    this.panelBody.innerHTML = `
      ${this.renderColorSelector()}
      ${this.renderExtremitiesSection(arrow)}
      ${this.renderStrokeWidthSection(strokeWidth!)}
      ${this.renderLineTypeSection(strokeType || "plain")}
    `;

    this.bindArrowEvents();
  }

  private renderTextMode(text: Text) {
    const style = text.properties.style || {};
    const color = style.color || defaultTextStyle.color;
    const fontSize = style.fontSize || defaultTextStyle.fontSize;
    const strokeWidth = style.strokeWidth || defaultTextStyle.strokeWidth;
    const strokeType = style.strokeType || defaultTextStyle.strokeType;
    const background = style.background || defaultTextStyle.background;
    const font = style.font || defaultTextStyle.font;

    this.updateColorFromAnnotation(color!);

    this.panelBody.innerHTML = `
      ${this.renderColorSelector()}
      ${this.renderSection("Background", this.renderBackgroundSelector(background!))}
      ${this.renderSection("Font", `<div class="custom-select-section">${this.renderFontSelector(font!)}</div>`)}
      ${this.renderFontSizeSection(fontSize as number)}
      ${this.renderStrokeWidthSection(strokeWidth!)}
      ${this.renderLineTypeSection(strokeType || "plain")}
    `;

    this.bindTextEvents();
  }

  private renderPolygonMode(polygon: Polygon) {
    const style = polygon.properties.style || {};
    const strokeColor = style.strokeColor || "#000000";
    const strokeWidth = style.strokeWidth || 2;
    const background = style.background || "transparent";
    const strokeType = style.strokeType || "plain";

    this.updateColorFromAnnotation(strokeColor);

    this.panelBody.innerHTML = `
      ${this.renderColorSelector()}
      ${this.renderSection("Fill", this.renderBackgroundSelector(background))}
      ${this.renderStrokeWidthSection(strokeWidth!)}
      ${this.renderLineTypeSection(strokeType)}
    `;

    this.bindPolygonEvents();
  }

  // ============================================================================
  // RENDERING - COMPONENT HELPERS
  // ============================================================================

  private renderSection(title: string, content: string): string {
    return `
      <div class="section-header">
        <h3>${title}</h3>
      </div>
      ${content}
    `;
  }

  private renderColorSelector(): string {
    const circles = this.recentColors.map((color, index) => {
      const isPrimary = index === 0 ? "color-circle-primary" : "";
      return `
        <button class="color-circle ${isPrimary}" data-index="${index}" data-color="${color}">
          <div class="color-inner"></div>
        </button>
      `;
    }).join("");

    return `
      <div class="section-header">
        <h3>Color</h3>
      </div>
      <div class="color-selector">${circles}</div>
    `;
  }

  private renderBackgroundSelector(currentBackground: string): string {
    const backgrounds = [
      { value: "#f5f5f5", style: "--circle-color: #f5f5f5;" },
      { value: "#EDE6FF", style: "--circle-color: #EDE6FF;" },
      { value: "transparent", style: "--circle-color: white; border: 2px dashed #ccc;" }
    ];

    const circles = backgrounds.map(({ value, style }) => {
      const isActive = value === currentBackground ? "color-circle-primary" : "";
      return `
        <button class="color-circle ${isActive}" data-background-color="${value}">
          <div class="color-inner" style="${style}"></div>
        </button>
      `;
    }).join("");

    return `<div class="color-selector">${circles}</div>`;
  }

  private renderFontSelector(currentFont: string): string {
    const fonts = [
      { value: "sans-serif", label: "Sans Serif", icon: "icon-type" },
      { value: "serif", label: "Serif", icon: "icon-italic" },
      { value: "monospace", label: "Monospace", icon: "icon-code" }
    ];

    const selectedFont = fonts.find((f) => f.value === currentFont) || fonts[0];

    const options = fonts.map((font) => {
      const isSelected = font.value === currentFont ? "selected" : "";
      return `
        <div class="custom-select-option ${isSelected}" data-value="${font.value}" title="${font.label}">
          <i class="${font.icon}"></i>
          <span>${font.label}</span>
        </div>
      `;
    }).join("");

    return `
      <div class="extremity-wrapper" style="flex: none; width: 100%;">
        <label>Font</label>
        <div class="custom-select" data-type="font">
          <div class="custom-select-trigger">
            <i class="${selectedFont.icon}"></i>
            <span>${selectedFont.label}</span>
            <i class="icon-chevron-down custom-select-arrow"></i>
          </div>
          <div class="custom-select-options">${options}</div>
        </div>
      </div>
    `;
  }

  private renderExtremitiesSection(arrow: Arrow): string {
    return `
      <div class="section-header">
        <h3>Extremities</h3>
      </div>
      <div class="custom-select-section">
        ${this.renderExtremitySelector("head", arrow)}
        ${this.renderExtremitySelector("tail", arrow)}
      </div>
    `;
  }

  private renderExtremitySelector(side: "head" | "tail", arrow: Arrow): string {
    const extremity = arrow.properties.style?.[side] || "none";
    const options = [
      { value: "none", label: "None", icon: "icon-x" },
      {
        value: "arrow",
        label: "Open Arrow",
        icon: side === "tail" ? "icon-arrow-left" : "icon-arrow-right"
      },
      { value: "arrow-plain", label: "Filled Arrow", icon: "icon-play" },
      { value: "halo-dot", label: "Halo Dot", icon: "icon-circle-dot" },
      { value: "dot", label: "Dot", icon: "icon-dot" }
    ];

    const selected = options.find((opt) => opt.value === extremity) || options[0];
    const rotation = selected.value === "arrow-plain" && side === "tail"
      ? 'style="transform: rotate(180deg)"'
      : "";

    const optionsHtml = options.map((opt) => {
      const isSelected = opt.value === extremity ? "selected" : "";
      const optRotation = opt.value === "arrow-plain" && side === "tail"
        ? 'style="transform: rotate(180deg)"'
        : "";
      return `
        <div class="custom-select-option ${isSelected}" data-value="${opt.value}" title="${opt.label}">
          <i class="${opt.icon}" ${optRotation}></i>
          <span>${opt.label}</span>
        </div>
      `;
    }).join("");

    return `
      <div class="extremity-wrapper">
        <label>${side}</label>
        <div class="custom-select" data-end="${side}">
          <div class="custom-select-trigger">
            <i class="${selected.icon}" ${rotation}></i>
            <span>${selected.label}</span>
            <i class="icon-chevron-down custom-select-arrow"></i>
          </div>
          <div class="custom-select-options">${optionsHtml}</div>
        </div>
      </div>
    `;
  }

  private renderStrokeWidthSection(strokeWidth: number): string {
    return `
      <div class="section-header">
        <h3>Stroke width</h3>
      </div>
      <div class="slider-section">
        <input type="range" id="line-width-slider" class="slider" min="1" max="20" value="${strokeWidth}">
        <div class="slider-value">
          <span id="line-width-value">${strokeWidth}</span>
        </div>
      </div>
    `;
  }

  private renderFontSizeSection(fontSize: number): string {
    return `
      <div class="section-header">
        <h3>Font size</h3>
      </div>
      <div class="slider-section">
        <input type="range" id="font-size-slider" class="slider" min="8" max="72" value="${fontSize}">
        <div class="slider-value">
          <span id="font-size-value">${fontSize}</span>
        </div>
      </div>
    `;
  }

  private renderLineTypeSection(currentType: string): string {
    const types = [
      { value: "plain", icon: "icon-circle" },
      { value: "dashed", icon: "icon-circle-dashed" }
    ];

    const buttons = types.map((type) => {
      const isActive = currentType === type.value ? "active" : "";
      return `
        <button class="linetype-button ${isActive}" data-linetype="${type.value}" title="${type.value}">
          <i class="${type.icon}"></i>
        </button>
      `;
    }).join("");

    return `
      <div class="section-header">
        <h3>Line type</h3>
      </div>
      <div class="linetype-section">${buttons}</div>
    `;
  }

  // ============================================================================
  // EVENT BINDING
  // ============================================================================

  private bindArrowEvents() {
    this.rebindColorCircles();
    this.setupCustomSelects();
    this.setupSlider("#line-width-slider", "#line-width-value", (value) => {
      this.updateArrow({ strokeWidth: value });
    });
    this.setupLineTypeButtons();
  }

  private bindTextEvents() {
    this.rebindColorCircles();
    this.setupBackgroundColorCircles();
    this.setupCustomSelects();
    this.setupSlider("#font-size-slider", "#font-size-value", (value) => {
      this.updateText({ fontSize: value });
    });
    this.setupSlider("#line-width-slider", "#line-width-value", (value) => {
      this.updateText({ strokeWidth: value, strokeColor: this.currentColor });
    });
    this.setupLineTypeButtons();
  }

  private bindPolygonEvents() {
    this.rebindColorCircles();
    this.setupBackgroundColorCircles();
    this.setupSlider("#line-width-slider", "#line-width-value", (value) => {
      this.updatePolygon({ strokeWidth: value });
    });
    this.setupLineTypeButtons();
  }

  // ============================================================================
  // EVENT SETUP HELPERS
  // ============================================================================

  private rebindColorCircles() {
    this.colorCircles = Array.from(
      this.panelBody.querySelectorAll<HTMLButtonElement>("[data-index]")
    );
    this.setupColorCircles();
  }

  private setupColorCircles() {
    this.colorCircles.forEach((circle, index) => {
      circle.addEventListener("click", (e) => {
        e.stopPropagation();
        const color = this.recentColors[index];
        const wasActive = this.activeColorIndex === index &&
                         circle.classList.contains("color-circle-primary");

        this.activeColorIndex = index;
        this.currentColor = color;
        this.updateColorCircles();

        if (wasActive) {
          this.toggleColorPicker(circle);
        } else {
          if (this.mode === "arrow") {
            this.updateArrow({ strokeColor: this.currentColor });
          } else if (this.mode === "text") {
            this.updateText({ strokeColor: this.currentColor });
          }
        }
      });
    });

    this.updateColorCircles();
  }

  private setupBackgroundColorCircles() {
    const circles = this.panelBody.querySelectorAll<HTMLButtonElement>(
      "[data-background-color]"
    );
    circles.forEach((circle) => {
      circle.addEventListener("click", () => {
        const bgColor = circle.dataset.backgroundColor!;
        if (this.mode === "text") {
          this.updateText({ background: bgColor });
        } else if (this.mode === "polygon") {
          this.updatePolygon({ background: bgColor });
        }
      });
    });
  }

  private setupCustomSelects() {
    const selects = this.panelBody.querySelectorAll<HTMLElement>(".custom-select");

    selects.forEach((select) => {
      const trigger = select.querySelector<HTMLElement>(".custom-select-trigger")!;
      const options = select.querySelectorAll<HTMLElement>(".custom-select-option");
      const end = select.dataset.end as "head" | "tail";
      const type = select.dataset.type;

      // Toggle dropdown on click
      trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        this.panelBody.querySelectorAll(".custom-select").forEach((s) => {
          if (s !== select) s.classList.remove("open");
        });
        select.classList.toggle("open");
      });

      // Handle option selection
      options.forEach((option) => {
        option.addEventListener("click", (e) => {
          e.stopPropagation();
          const value = option.dataset.value!;

          // Update UI state
          options.forEach((opt) => opt.classList.remove("selected"));
          option.classList.add("selected");

          const icon = option.querySelector("i")!.className;
          const label = option.querySelector("span")!.textContent;
          trigger.querySelector("i")!.className = icon;
          trigger.querySelector("span")!.textContent = label;

          select.classList.remove("open");

          // Update annotation
          if (type === "font") {
            this.updateText({ font: value });
          } else if (end === "head") {
            this.updateArrow({ head: value as Extremity });
          } else if (end === "tail") {
            this.updateArrow({ tail: value as Extremity });
          }
        });
      });
    });
  }

  private setupSlider(
    sliderId: string,
    valueId: string,
    onUpdate: (value: number) => void
  ) {
    const slider = this.panelBody.querySelector<HTMLInputElement>(sliderId);
    const valueDisplay = this.panelBody.querySelector(valueId);

    if (slider && valueDisplay) {
      slider.addEventListener("input", () => {
        const value = parseInt(slider.value, 10);
        valueDisplay.textContent = value.toString();
        onUpdate(value);
      });
    }
  }

  private setupLineTypeButtons() {
    const buttons = this.panelBody.querySelectorAll<HTMLButtonElement>(".linetype-button");

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const lineType = btn.dataset.linetype as "plain" | "dashed";
        buttons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        if (this.currentAnnotation) {
          this.control.updateStyle(this.currentAnnotation.id, { strokeType: lineType });
        }
      });
    });
  }

  // ============================================================================
  // COLOR MANAGEMENT
  // ============================================================================

  private updateColorFromAnnotation(color: string) {
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

    // Position next to button
    const rect = button.getBoundingClientRect();
    this.colorPickerOverlay.style.right = `${window.innerWidth - rect.right}px`;
    this.colorPickerOverlay.style.top = `${rect.bottom + 10}px`;

    // Handle color changes
    this.colorPicker.addEventListener("color-changed", (event) => {
      this.currentColor = rgbaToString(event.detail.value);
      this.recentColors[this.activeColorIndex] = this.currentColor;
      this.updateColorCircles();

      if (this.mode === "arrow") {
        this.updateArrow({ strokeColor: this.currentColor });
      } else if (this.mode === "text") {
        this.updateText({ color: this.currentColor });
      } else if (this.mode === "polygon") {
        this.updatePolygon({ strokeColor: this.currentColor });
      }
    });
  }

  private closeColorPicker() {
    if (this.colorPickerOverlay) {
      this.colorPickerOverlay.remove();
      this.colorPickerOverlay = null;
      this.colorPicker = null;
    }
  }

  // ============================================================================
  // ANNOTATION UPDATES
  // ============================================================================

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

  // ============================================================================
  // VISIBILITY
  // ============================================================================

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

// ============================================================================
// UTILITIES
// ============================================================================

function rgbaToString(color: RgbaColor): string {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
}
