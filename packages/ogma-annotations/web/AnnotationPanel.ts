import { RgbaColor, RgbaColorPicker } from "vanilla-colorful/rgba-color-picker.js";
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

// Configuration constants
const BACKGROUNDS = [
  { value: "#f5f5f5", style: "--circle-color: #f5f5f5;" },
  { value: "#EDE6FF", style: "--circle-color: #EDE6FF;" },
  { value: "transparent", style: "--circle-color: white; border: 2px dashed #ccc;" }
];

const FONTS = [
  { value: "sans-serif", label: "Sans Serif", icon: "icon-type" },
  { value: "serif", label: "Serif", icon: "icon-italic" },
  { value: "monospace", label: "Monospace", icon: "icon-code" }
];

const EXTREMITY_OPTIONS = [
  { value: "none", label: "None", icon: "icon-x" },
  { value: "arrow", label: "Open Arrow", icon: "icon-arrow-left" },
  { value: "arrow-plain", label: "Filled Arrow", icon: "icon-play" },
  { value: "halo-dot", label: "Halo Dot", icon: "icon-circle-dot" },
  { value: "dot", label: "Dot", icon: "icon-dot" }
];

const LINE_TYPES = [
  { value: "plain", icon: "icon-circle" },
  { value: "dashed", icon: "icon-circle-dashed" }
];

export class AnnotationPanel {
  private control: Control;
  private panel: HTMLElement;
  private panelBody: HTMLElement;
  private mode: AnnotationMode = null;
  private currentAnnotation: Annotation | null = null;
  private currentColor = "#0099FF";
  private recentColors = ["#0099FF", "#FF7523", "#44AA99"];
  private activeColorIndex = 0;
  private colorCircles: HTMLButtonElement[] = [];
  private colorPickerOverlay: HTMLElement | null = null;
  private colorPicker: RgbaColorPicker | null = null;

  constructor(options: AnnotationPanelOptions) {
    this.control = options.control;
    this.panel = document.getElementById("annotation-panel")!;
    this.panelBody = this.panel.querySelector(".panel-body")!;

    this.control.on("select", (sel) => {
      if (sel.ids.length === 1) {
        const ann = this.control.getAnnotation(sel.ids[0]);
        if (ann) {
          this.setAnnotation(ann);
          this.show();
        }
      } else this.hide();
    });

    this.control.on("unselect", this.hide);

    ["click", "mousedown", "mousemove"].forEach((evt) =>
      this.panel.addEventListener(evt, (e) => e.stopPropagation())
    );

    document.addEventListener("click", (e) => {
      if (
        this.colorPickerOverlay &&
        !this.colorPickerOverlay.contains(e.target as Node) &&
        !this.colorCircles.some((c) => c.contains(e.target as Node))
      ) {
        this.closeColorPicker();
      }
      this.panelBody.querySelectorAll(".custom-select").forEach((s) => s.classList.remove("open"));
    });
  }

  private setAnnotation(annotation: Annotation) {
    this.currentAnnotation = annotation;

    if (isArrow(annotation)) {
      this.mode = "arrow";
      this.renderArrow(annotation);
    } else if (isText(annotation) || isBox(annotation)) {
      this.mode = "text";
      this.renderText(annotation as Text);
    } else if (isPolygon(annotation)) {
      this.mode = "polygon";
      this.renderPolygon(annotation);
    }
  }

  private renderArrow(arrow: Arrow) {
    const s = arrow.properties.style || {};
    this.updateColorFromAnnotation(s.strokeColor || defaultArrowStyle.strokeColor!);

    this.panelBody.innerHTML = `
      ${this.section("Color", this.colorSelector())}
      ${this.section("Extremities", `<div class="custom-select-section">
        ${this.extremitySelector("head", arrow)}
        ${this.extremitySelector("tail", arrow)}
      </div>`)}
      ${this.slider("Stroke width", "line-width", s.strokeWidth || defaultArrowStyle.strokeWidth!, 1, 20)}
      ${this.lineTypeButtons(s.strokeType || "plain")}
    `;

    this.bind();
  }

  private renderText(text: Text) {
    const s = text.properties.style || {};
    this.updateColorFromAnnotation(s.color || defaultTextStyle.color!);

    const fontSize = typeof s.fontSize === "number" ? s.fontSize :
                     typeof defaultTextStyle.fontSize === "number" ? defaultTextStyle.fontSize : 18;

    this.panelBody.innerHTML = `
      ${this.section("Color", this.colorSelector())}
      ${this.section("Background", this.backgroundSelector(s.background || defaultTextStyle.background!))}
      ${this.section("Font", `<div class="custom-select-section">${this.fontSelector(s.font || defaultTextStyle.font!)}</div>`)}
      ${this.slider("Font size", "font-size", fontSize, 8, 72)}
      ${this.slider("Stroke width", "line-width", s.strokeWidth || defaultTextStyle.strokeWidth!, 1, 20)}
      ${this.lineTypeButtons(s.strokeType || "plain")}
    `;

    this.bind();
  }

  private renderPolygon(polygon: Polygon) {
    const s = polygon.properties.style || {};
    this.updateColorFromAnnotation(s.strokeColor || "#000000");

    this.panelBody.innerHTML = `
      ${this.section("Color", this.colorSelector())}
      ${this.section("Fill", this.backgroundSelector(s.background || "transparent"))}
      ${this.slider("Stroke width", "line-width", s.strokeWidth || 2, 1, 20)}
      ${this.lineTypeButtons(s.strokeType || "plain")}
    `;

    this.bind();
  }

  // Rendering helpers
  private section(title: string, content: string) {
    return `<div class="section-header"><h3>${title}</h3></div>${content}`;
  }

  private colorSelector() {
    return `<div class="color-selector">${this.recentColors.map((c, i) => `
      <button class="color-circle ${i === 0 ? "color-circle-primary" : ""}" data-index="${i}" data-color="${c}">
        <div class="color-inner"></div>
      </button>
    `).join("")}</div>`;
  }

  private backgroundSelector(current: string) {
    return `<div class="color-selector">${BACKGROUNDS.map(({ value, style }) => `
      <button class="color-circle ${value === current ? "color-circle-primary" : ""}" data-background-color="${value}">
        <div class="color-inner" style="${style}"></div>
      </button>
    `).join("")}</div>`;
  }

  private fontSelector(current: string) {
    const selected = FONTS.find((f) => f.value === current) || FONTS[0];
    return this.dropdown("font", selected, FONTS.map((f) => ({ ...f, selected: f.value === current })));
  }

  private extremitySelector(side: "head" | "tail", arrow: Arrow) {
    const ext = arrow.properties.style?.[side] || "none";
    const opts = EXTREMITY_OPTIONS.map((o) => ({
      ...o,
      icon: o.value === "arrow" && side === "tail" ? "icon-arrow-left" : o.value === "arrow" ? "icon-arrow-right" : o.icon,
      selected: o.value === ext,
      rotate: o.value === "arrow-plain" && side === "tail"
    }));
    const selected = opts.find((o) => o.selected) || opts[0];
    return `<div class="extremity-wrapper"><label>${side}</label>${this.dropdown(side, selected, opts, `data-end="${side}"`)}</div>`;
  }

  private dropdown(
    type: string,
    selected: { icon: string; label: string; rotate?: boolean },
    options: Array<{ value: string; label: string; icon: string; selected?: boolean; rotate?: boolean }>,
    extra = ""
  ) {
    return `<div class="custom-select" data-type="${type}" ${extra}>
      <div class="custom-select-trigger">
        <i class="${selected.icon}" ${selected.rotate ? 'style="transform: rotate(180deg)"' : ""}></i>
        <span>${selected.label}</span>
        <i class="icon-chevron-down custom-select-arrow"></i>
      </div>
      <div class="custom-select-options">${options.map((o) => `
        <div class="custom-select-option ${o.selected ? "selected" : ""}" data-value="${o.value}" title="${o.label}">
          <i class="${o.icon}" ${o.rotate ? 'style="transform: rotate(180deg)"' : ""}></i>
          <span>${o.label}</span>
        </div>
      `).join("")}</div>
    </div>`;
  }

  private slider(title: string, id: string, value: number, min: number, max: number) {
    return `${this.section(title, `<div class="slider-section">
      <input type="range" id="${id}-slider" class="slider" min="${min}" max="${max}" value="${value}">
      <div class="slider-value"><span id="${id}-value">${value}</span></div>
    </div>`)}`;
  }

  private lineTypeButtons(current: string) {
    return `${this.section("Line type", `<div class="linetype-section">${LINE_TYPES.map(({ value, icon }) => `
      <button class="linetype-button ${current === value ? "active" : ""}" data-linetype="${value}" title="${value}">
        <i class="${icon}"></i>
      </button>
    `).join("")}</div>`)}`;
  }

  // Event binding - unified for all modes
  private bind() {
    // Color circles
    this.colorCircles = Array.from(this.panelBody.querySelectorAll<HTMLButtonElement>("[data-index]"));
    this.colorCircles.forEach((circle, i) => {
      circle.addEventListener("click", (e) => {
        e.stopPropagation();
        const wasActive = this.activeColorIndex === i && circle.classList.contains("color-circle-primary");
        this.activeColorIndex = i;
        this.currentColor = this.recentColors[i];
        this.updateColorCircles();

        if (wasActive) this.toggleColorPicker(circle);
        else if (this.mode === "arrow") this.updateStyle({ strokeColor: this.currentColor });
        else if (this.mode === "text") this.updateStyle({ strokeColor: this.currentColor });
      });
    });
    this.updateColorCircles();

    // Background circles
    this.panelBody.querySelectorAll<HTMLButtonElement>("[data-background-color]").forEach((c) => {
      c.addEventListener("click", () => this.updateStyle({ background: c.dataset.backgroundColor! }));
    });

    // Dropdowns (font & extremities)
    this.panelBody.querySelectorAll<HTMLElement>(".custom-select").forEach((sel) => {
      const trigger = sel.querySelector<HTMLElement>(".custom-select-trigger")!;
      const options = sel.querySelectorAll<HTMLElement>(".custom-select-option");

      trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        this.panelBody.querySelectorAll(".custom-select").forEach((s) => {
          if (s !== sel) s.classList.remove("open");
        });
        sel.classList.toggle("open");
      });

      options.forEach((opt) => {
        opt.addEventListener("click", (e) => {
          e.stopPropagation();
          const value = opt.dataset.value!;

          options.forEach((o) => o.classList.remove("selected"));
          opt.classList.add("selected");

          const icon = opt.querySelector("i")!.className;
          const label = opt.querySelector("span")!.textContent;
          trigger.querySelector("i")!.className = icon;
          trigger.querySelector("span")!.textContent = label;
          sel.classList.remove("open");

          const type = sel.dataset.type;
          const end = sel.dataset.end;

          if (type === "font") this.updateStyle({ font: value });
          else if (end === "head") this.updateStyle({ head: value as Extremity });
          else if (end === "tail") this.updateStyle({ tail: value as Extremity });
        });
      });
    });

    // Sliders
    ["line-width", "font-size"].forEach((id) => {
      const slider = this.panelBody.querySelector<HTMLInputElement>(`#${id}-slider`);
      const display = this.panelBody.querySelector(`#${id}-value`);
      if (slider && display) {
        slider.addEventListener("input", () => {
          const val = parseInt(slider.value, 10);
          display.textContent = val.toString();

          if (id === "line-width") {
            this.updateStyle(
              this.mode === "text"
                ? { strokeWidth: val, strokeColor: this.currentColor }
                : { strokeWidth: val }
            );
          } else if (id === "font-size") {
            this.updateStyle({ fontSize: val });
          }
        });
      }
    });

    // Line type buttons
    this.panelBody.querySelectorAll<HTMLButtonElement>(".linetype-button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const type = btn.dataset.linetype as "plain" | "dashed";
        this.panelBody.querySelectorAll(".linetype-button").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.updateStyle({ strokeType: type });
      });
    });
  }

  // Color management
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
    this.colorCircles.forEach((circle, i) => {
      circle.setAttribute("data-color", this.recentColors[i]);
      circle.style.setProperty("--circle-color", this.recentColors[i]);
      circle.classList.toggle("color-circle-primary", i === this.activeColorIndex);
    });
  }

  private toggleColorPicker(button: HTMLButtonElement) {
    if (this.colorPickerOverlay) {
      this.closeColorPicker();
      return;
    }

    this.colorPickerOverlay = document.createElement("div");
    this.colorPickerOverlay.className = "color-picker-overlay";
    document.body.appendChild(this.colorPickerOverlay);

    this.colorPicker = new RgbaColorPicker();
    this.colorPicker.color = parseColor(this.currentColor);
    this.colorPickerOverlay.appendChild(this.colorPicker);

    const rect = button.getBoundingClientRect();
    this.colorPickerOverlay.style.right = `${window.innerWidth - rect.right}px`;
    this.colorPickerOverlay.style.top = `${rect.bottom + 10}px`;

    this.colorPicker.addEventListener("color-changed", (event) => {
      this.currentColor = rgbaToString(event.detail.value);
      this.recentColors[this.activeColorIndex] = this.currentColor;
      this.updateColorCircles();

      if (this.mode === "arrow") this.updateStyle({ strokeColor: this.currentColor });
      else if (this.mode === "text") this.updateStyle({ color: this.currentColor });
      else if (this.mode === "polygon") this.updateStyle({ strokeColor: this.currentColor });
    });
  }

  private closeColorPicker() {
    if (this.colorPickerOverlay) {
      this.colorPickerOverlay.remove();
      this.colorPickerOverlay = null;
      this.colorPicker = null;
    }
  }

  // Unified update method
  private updateStyle(
    updates:
      | Partial<Arrow["properties"]["style"]>
      | Partial<Text["properties"]["style"]>
      | Partial<Polygon["properties"]["style"]>
  ) {
    if (!this.currentAnnotation) return;

    if (isArrow(this.currentAnnotation)) {
      this.control.updateStyle<Arrow>(this.currentAnnotation.id, updates);
    } else if (isPolygon(this.currentAnnotation)) {
      this.control.updateStyle<Polygon>(this.currentAnnotation.id, updates);
    } else {
      this.control.updateStyle<Text>(this.currentAnnotation.id, updates);
    }
  }

  // Visibility
  public show() {
    setTimeout(() => (this.panel.style.display = "block"), 200);
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
