import { RgbaColorPicker } from "vanilla-colorful/rgba-color-picker.js";
import { Control } from "../Control";
import {
  Annotation,
  Arrow,
  Text,
  Polygon,
  Extremity,
  isArrow,
  isText,
  isPolygon,
  isBox,
  isComment,
  defaultArrowStyle,
  defaultTextStyle
} from "../types";
import { parseColor } from "../utils/utils";
import {
  BACKGROUNDS,
  FONTS,
  EXTREMITY_OPTIONS,
  LINE_TYPES
} from "./config";
import {
  rgbaToString,
  initialRecentColors,
  withColorFromAnnotation,
  type RecentColorsState
} from "./color";
import { svgIcon, type IconName } from "./icons";
import { attachPanelVisibility } from "./panelVisibility";

type AnnotationMode = "arrow" | "text" | "polygon" | null;

export interface AnnotationPanelOptions {
  control: Control;
  /**
   * Element the panel mounts into. The panel creates and manages its own root
   * `<div class="annotation-panel">` inside it. Defaults to `document.body`.
   */
  container?: HTMLElement;
}

export class AnnotationPanel {
  private control: Control;
  private panel: HTMLElement;
  private panelBody: HTMLElement;
  private mode: AnnotationMode = null;
  private currentAnnotation: Annotation | null = null;
  private currentColor = "#0099FF";
  private recent: RecentColorsState = initialRecentColors();
  private colorCircles: HTMLButtonElement[] = [];
  private colorPickerOverlay: HTMLElement | null = null;
  private colorPicker: RgbaColorPicker | null = null;
  private detachVisibility: () => void;
  private documentClickHandler: (e: MouseEvent) => void;

  constructor(options: AnnotationPanelOptions) {
    this.control = options.control;

    // Build our own root inside the container, rather than relying on a
    // pre-existing #annotation-panel element in the host page.
    const container = options.container ?? document.body;
    this.panel = document.createElement("div");
    this.panel.className = "annotation-panel";
    this.panel.style.display = "none";
    this.panelBody = document.createElement("div");
    this.panelBody.className = "panel-body";
    this.panel.appendChild(this.panelBody);
    container.appendChild(this.panel);

    this.detachVisibility = attachPanelVisibility(this.control, {
      onShow: (ann) => {
        this.setAnnotation(ann);
        this.show();
      },
      onHide: this.hide
    });

    ["click", "mousedown", "mousemove"].forEach((evt) =>
      this.panel.addEventListener(evt, (e) => e.stopPropagation())
    );

    this.documentClickHandler = (e: MouseEvent) => {
      if (
        this.colorPickerOverlay &&
        !this.colorPickerOverlay.contains(e.target as Node) &&
        !this.colorCircles.some((c) => c.contains(e.target as Node))
      ) {
        this.closeColorPicker();
      }
      this.panelBody
        .querySelectorAll(".custom-select")
        .forEach((s) => s.classList.remove("open"));
    };
    document.addEventListener("click", this.documentClickHandler);
  }

  private setAnnotation(annotation: Annotation) {
    this.currentAnnotation = annotation;

    if (isArrow(annotation)) {
      this.mode = "arrow";
      this.renderArrow(annotation);
    } else if (
      isText(annotation) ||
      isBox(annotation) ||
      isComment(annotation)
    ) {
      this.mode = "text";
      this.renderText(annotation as Text);
    } else if (isPolygon(annotation)) {
      this.mode = "polygon";
      this.renderPolygon(annotation);
    }
  }

  private renderArrow(arrow: Arrow) {
    const s = arrow.properties.style || {};
    this.updateColorFromAnnotation(
      s.strokeColor || defaultArrowStyle.strokeColor!
    );

    this.panelBody.innerHTML = `
      ${this.section("Color", this.colorSelector())}
      ${this.section(
        "Extremities",
        `<div class="custom-select-section">
        ${this.extremitySelector("head", arrow)}
        ${this.extremitySelector("tail", arrow)}
      </div>`
      )}
      ${this.slider("Stroke width", "line-width", s.strokeWidth || defaultArrowStyle.strokeWidth!, 1, 20)}
      ${this.lineTypeButtons(s.strokeType || "plain")}
    `;

    this.bind();
  }

  private renderText(text: Text) {
    const s = text.properties.style || {};
    this.updateColorFromAnnotation(s.color || defaultTextStyle.color!);

    const fontSize =
      typeof s.fontSize === "number"
        ? s.fontSize
        : typeof defaultTextStyle.fontSize === "number"
          ? defaultTextStyle.fontSize
          : 18;

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

  private icon(name: IconName, rotate = false) {
    return rotate
      ? `<span style="display:inline-flex;transform:rotate(180deg)">${svgIcon(name)}</span>`
      : svgIcon(name);
  }

  private colorSelector() {
    return `<div class="color-selector">${this.recent.colors
      .map(
        (c, i) => `
      <button class="color-circle ${i === 0 ? "color-circle-primary" : ""}" data-index="${i}" data-color="${c}">
        <div class="color-inner"></div>
      </button>
    `
      )
      .join("")}</div>`;
  }

  private backgroundSelector(current: string) {
    return `<div class="color-selector">${BACKGROUNDS.map(
      ({ value, style }) => `
      <button class="color-circle ${value === current ? "color-circle-primary" : ""}" data-background-color="${value}">
        <div class="color-inner" style="${style}"></div>
      </button>
    `
    ).join("")}</div>`;
  }

  private fontSelector(current: string) {
    const selected = FONTS.find((f) => f.value === current) || FONTS[0];
    return this.dropdown(
      "font",
      selected,
      FONTS.map((f) => ({ ...f, selected: f.value === current }))
    );
  }

  private extremitySelector(side: "head" | "tail", arrow: Arrow) {
    const ext = arrow.properties.style?.[side] || "none";
    const opts = EXTREMITY_OPTIONS.map((o) => ({
      ...o,
      icon:
        o.value === "arrow" && side === "tail"
          ? "arrow-left"
          : o.value === "arrow"
            ? "arrow-right"
            : o.icon,
      selected: o.value === ext,
      rotate: o.value === "arrow-plain" && side === "tail"
    }));
    const selected = opts.find((o) => o.selected) || opts[0];
    return `<div class="extremity-wrapper"><label>${side}</label>${this.dropdown(side, selected, opts, `data-end="${side}"`)}</div>`;
  }

  private dropdown(
    type: string,
    selected: { icon: string; label: string; rotate?: boolean },
    options: Array<{
      value: string;
      label: string;
      icon: string;
      selected?: boolean;
      rotate?: boolean;
    }>,
    extra = ""
  ) {
    return `<div class="custom-select" data-type="${type}" ${extra}>
      <div class="custom-select-trigger">
        ${this.icon(selected.icon as IconName, selected.rotate)}
        <span>${selected.label}</span>
        ${this.icon("chevron-down")}
      </div>
      <div class="custom-select-options">${options
        .map(
          (o) => `
        <div class="custom-select-option ${o.selected ? "selected" : ""}" data-value="${o.value}" data-icon="${o.icon}" data-rotate="${o.rotate ? "1" : ""}" title="${o.label}">
          ${this.icon(o.icon as IconName, o.rotate)}
          <span>${o.label}</span>
        </div>
      `
        )
        .join("")}</div>
    </div>`;
  }

  private slider(
    title: string,
    id: string,
    value: number,
    min: number,
    max: number
  ) {
    return `${this.section(
      title,
      `<div class="slider-section">
      <input type="range" id="${id}-slider" class="slider" min="${min}" max="${max}" value="${value}">
      <div class="slider-value"><span id="${id}-value">${value}</span></div>
    </div>`
    )}`;
  }

  private lineTypeButtons(current: string) {
    return `${this.section(
      "Line type",
      `<div class="linetype-section">${LINE_TYPES.map(
        ({ value, icon }) => `
      <button class="linetype-button ${current === value ? "active" : ""}" data-linetype="${value}" title="${value}">
        ${this.icon(icon as IconName)}
      </button>
    `
      ).join("")}</div>`
    )}`;
  }

  // Event binding - unified for all modes
  private bind() {
    // Color circles
    this.colorCircles = Array.from(
      this.panelBody.querySelectorAll<HTMLButtonElement>("[data-index]")
    );
    this.colorCircles.forEach((circle, i) => {
      circle.addEventListener("click", (e) => {
        e.stopPropagation();
        const wasActive =
          this.recent.activeIndex === i &&
          circle.classList.contains("color-circle-primary");
        this.recent = { ...this.recent, activeIndex: i };
        this.currentColor = this.recent.colors[i];
        this.updateColorCircles();

        if (wasActive) this.toggleColorPicker(circle);
        else if (this.mode === "arrow")
          this.updateStyle({ strokeColor: this.currentColor });
        else if (this.mode === "text")
          this.updateStyle({ strokeColor: this.currentColor });
      });
    });
    this.updateColorCircles();

    // Background circles
    this.panelBody
      .querySelectorAll<HTMLButtonElement>("[data-background-color]")
      .forEach((c) => {
        c.addEventListener("click", () =>
          this.updateStyle({ background: c.dataset.backgroundColor! })
        );
      });

    // Dropdowns (font & extremities)
    this.panelBody
      .querySelectorAll<HTMLElement>(".custom-select")
      .forEach((sel) => {
        const trigger = sel.querySelector<HTMLElement>(
          ".custom-select-trigger"
        )!;
        const options = sel.querySelectorAll<HTMLElement>(
          ".custom-select-option"
        );

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

            // Reflect the chosen option's icon/label in the trigger.
            const iconName = opt.dataset.icon as IconName;
            const rotate = opt.dataset.rotate === "1";
            const label = opt.querySelector("span")!.textContent || "";
            const triggerIcon = trigger.querySelector("svg, span[style]");
            if (triggerIcon)
              triggerIcon.outerHTML = this.icon(iconName, rotate);
            trigger.querySelector("span")!.textContent = label;
            sel.classList.remove("open");

            const type = sel.dataset.type;
            const end = sel.dataset.end;

            if (type === "font") this.updateStyle({ font: value });
            else if (end === "head")
              this.updateStyle({ head: value as Extremity });
            else if (end === "tail")
              this.updateStyle({ tail: value as Extremity });
          });
        });
      });

    // Sliders
    ["line-width", "font-size"].forEach((id) => {
      const slider = this.panelBody.querySelector<HTMLInputElement>(
        `#${id}-slider`
      );
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
    this.panelBody
      .querySelectorAll<HTMLButtonElement>(".linetype-button")
      .forEach((btn) => {
        btn.addEventListener("click", () => {
          const type = btn.dataset.linetype as "plain" | "dashed";
          this.panelBody
            .querySelectorAll(".linetype-button")
            .forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          this.updateStyle({ strokeType: type });
        });
      });
  }

  // Color management
  private updateColorFromAnnotation(color: string) {
    this.recent = withColorFromAnnotation(this.recent, color);
    this.currentColor = color;
  }

  private updateColorCircles() {
    this.colorCircles.forEach((circle, i) => {
      circle.setAttribute("data-color", this.recent.colors[i]);
      circle.style.setProperty("--circle-color", this.recent.colors[i]);
      circle.classList.toggle(
        "color-circle-primary",
        i === this.recent.activeIndex
      );
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
      this.recent.colors[this.recent.activeIndex] = this.currentColor;
      this.updateColorCircles();

      if (this.mode === "arrow")
        this.updateStyle({ strokeColor: this.currentColor });
      else if (this.mode === "text")
        this.updateStyle({ color: this.currentColor });
      else if (this.mode === "polygon")
        this.updateStyle({ strokeColor: this.currentColor });
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
    this.detachVisibility();
    document.removeEventListener("click", this.documentClickHandler);
    this.panel.remove();
  }
}
