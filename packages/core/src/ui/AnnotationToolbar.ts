import { Control } from "../Control";
import { EVT_COMPLETE_DRAWING, EVT_CANCEL_DRAWING, EVT_HISTORY } from "../constants";
import type {
  Arrow,
  ArrowProperties,
  Box,
  CommentProps,
  Polygon,
  Text
} from "../types";
import { svgIcon, type IconName } from "./icons";
import type { PanelPlacement, PanelOrientation } from "./layout";

/** Toolbars default to a bottom-docked horizontal bar, unlike the style
 * panel's right-docked vertical default - the natural "drawing tools"
 * position in both demos. */
const DEFAULT_TOOLBAR_PLACEMENT: PanelPlacement = "bottom";
const DEFAULT_TOOLBAR_ORIENTATION: PanelOrientation = "horizontal";

type DrawingMode = "arrow" | "comment" | "box" | "text" | "polygon" | null;

/** One of the toolbar's drawing tools - see `enabledTypes`. */
export type ToolbarDrawingType = "arrow" | "comment" | "box" | "text" | "polygon";

const ALL_DRAWING_TYPES: ToolbarDrawingType[] = [
  "arrow",
  "comment",
  "box",
  "text",
  "polygon"
];

/**
 * Per-type default style overrides, merged over the toolbar's own built-in
 * defaults (which stay in effect for anything you don't override). See
 * `Control.enableArrowDrawing` etc. for what each shape configures.
 */
export interface AnnotationToolbarStyles {
  arrow?: Partial<Arrow["properties"]["style"]>;
  box?: Partial<Box["properties"]["style"]>;
  text?: Partial<Text["properties"]["style"]>;
  polygon?: Partial<Polygon["properties"]["style"]>;
  comment?: {
    offsetX?: number;
    offsetY?: number;
    commentStyle?: Partial<CommentProps>;
    arrowStyle?: Partial<ArrowProperties>;
  };
}

export interface AnnotationToolbarOptions {
  control: Control;
  /**
   * Element the toolbar mounts into. The toolbar creates and manages its
   * own root `<div class="annotation-toolbar">` inside it. Defaults to
   * `document.body`.
   */
  container?: HTMLElement;
  /**
   * Which screen edge/corner the toolbar docks to. Defaults to `"bottom"`.
   * Change at runtime with {@link AnnotationToolbar.setPlacement}.
   */
  placement?: PanelPlacement;
  /**
   * Whether buttons run left-to-right or stack top-to-bottom. Defaults to
   * `"horizontal"`. Change at runtime with
   * {@link AnnotationToolbar.setOrientation}.
   */
  orientation?: PanelOrientation;
  /**
   * Which drawing tools to show, and in what order. Defaults to all five:
   * `["arrow", "comment", "box", "text", "polygon"]`.
   */
  enabledTypes?: ToolbarDrawingType[];
  /** Per-type default style overrides for the drawing tool buttons. */
  styles?: AnnotationToolbarStyles;
  /** Called when the SVG export button is clicked. Omit to hide the button. */
  onSvgExport?: () => void;
  /** Called when the JSON export button is clicked. Omit to hide the button. */
  onJsonExport?: () => void;
}

/**
 * Styled drawing/undo-redo toolbar: add arrow, comment, box, text and
 * polygon annotations, undo/redo, and delete the current selection. The
 * React equivalent is `AddMenu` (`@linkurious/ogma-annotations-react/ui`) -
 * this class mirrors its buttons and defaults for a vanilla consumer.
 */
export class AnnotationToolbar {
  private control: Control;
  private root: HTMLElement;
  private activeButton: HTMLButtonElement | null = null;
  private undoButton!: HTMLButtonElement;
  private redoButton!: HTMLButtonElement;
  private handleDrawingEnd = () => this.setActiveMode(null);
  private handleHistory = () => this.updateUndoRedo();

  constructor(options: AnnotationToolbarOptions) {
    this.control = options.control;

    const container = options.container ?? document.body;
    this.root = document.createElement("div");
    this.root.className = "annotation-toolbar";
    this.root.dataset.placement =
      options.placement ?? DEFAULT_TOOLBAR_PLACEMENT;
    this.root.dataset.orientation =
      options.orientation ?? DEFAULT_TOOLBAR_ORIENTATION;
    container.appendChild(this.root);

    ["click", "mousedown", "mousemove"].forEach((evt) =>
      this.root.addEventListener(evt, (e) => e.stopPropagation())
    );

    const enabled = options.enabledTypes ?? ALL_DRAWING_TYPES;
    const styles = options.styles ?? {};

    ALL_DRAWING_TYPES.filter((type) => enabled.includes(type)).forEach(
      (type) => this.root.appendChild(this.drawingButton(type, styles))
    );

    if (enabled.length > 0) this.root.appendChild(this.separator());

    this.undoButton = this.button(null, "undo", "Undo", () => this.control.undo());
    this.redoButton = this.button(null, "redo", "Redo", () => this.control.redo());
    this.root.appendChild(this.undoButton);
    this.root.appendChild(this.redoButton);

    this.root.appendChild(this.separator());

    this.root.appendChild(
      this.button(null, "trash", "Delete selected", () => {
        const selected = this.control.getSelectedAnnotations();
        if (selected.features.length > 0) this.control.remove(selected);
      })
    );

    if (options.onJsonExport || options.onSvgExport) {
      this.root.appendChild(this.separator());
      if (options.onJsonExport)
        this.root.appendChild(
          this.button(null, "download", "Export annotations", options.onJsonExport)
        );
      if (options.onSvgExport)
        this.root.appendChild(
          this.button(null, "camera", "Export SVG", options.onSvgExport)
        );
    }

    this.control.on(EVT_COMPLETE_DRAWING, this.handleDrawingEnd);
    this.control.on(EVT_CANCEL_DRAWING, this.handleDrawingEnd);
    this.control.on(EVT_HISTORY, this.handleHistory);
    this.updateUndoRedo();
  }

  private drawingButton(
    type: ToolbarDrawingType,
    styles: AnnotationToolbarStyles
  ): HTMLButtonElement {
    switch (type) {
      case "arrow":
        return this.button("arrow", "arrow-right", "Add arrow", () => {
          this.control.enableArrowDrawing({
            strokeType: "plain",
            strokeColor: "#3A03CF",
            strokeWidth: 2,
            head: "arrow",
            ...styles.arrow
          });
          this.setActiveMode("arrow");
        });
      case "comment":
        return this.button("comment", "message-square", "Add comment", () => {
          const commentOverride = styles.comment?.commentStyle;
          const arrowOverride = styles.comment?.arrowStyle;
          this.control.enableCommentDrawing({
            offsetX: styles.comment?.offsetX ?? 200,
            offsetY: styles.comment?.offsetY ?? -150,
            commentStyle: {
              content: "",
              ...commentOverride,
              style: {
                color: "#3A03CF",
                background: "#EDE6FF",
                fontSize: 16,
                font: "IBM Plex Sans",
                ...commentOverride?.style
              }
            },
            arrowStyle: {
              ...arrowOverride,
              style: {
                strokeType: "plain",
                strokeColor: "#3A03CF",
                strokeWidth: 2,
                head: "halo-dot",
                ...arrowOverride?.style
              }
            }
          });
          this.setActiveMode("comment");
        });
      case "box":
        return this.button("box", "rectangle-horizontal", "Add box", () => {
          this.control.enableBoxDrawing({
            background: "#EDE6FF",
            borderRadius: 8,
            padding: 12,
            ...styles.box
          });
          this.setActiveMode("box");
        });
      case "text":
        return this.button("text", "type", "Add text", () => {
          this.control.enableTextDrawing({
            font: "IBM Plex Sans",
            fontSize: 24,
            color: "#3A03CF",
            background: "#EDE6FF",
            borderRadius: 8,
            padding: 12,
            ...styles.text
          });
          this.setActiveMode("text");
        });
      case "polygon":
        return this.button(
          "polygon",
          "pentagon",
          "Add polygon (click points, Esc to finish)",
          () => {
            this.control.enablePolygonDrawing({
              strokeColor: "#3A03CF",
              strokeWidth: 2,
              background: "rgba(58, 3, 207, 0.15)",
              ...styles.polygon
            });
            this.setActiveMode("polygon");
          }
        );
    }
  }

  private button(
    mode: DrawingMode,
    icon: IconName,
    tooltip: string,
    onClick: () => void
  ): HTMLButtonElement {
    const button = document.createElement("button");
    button.dataset.tooltip = tooltip;
    button.innerHTML = svgIcon(icon, 16);
    button.addEventListener("click", onClick);
    if (mode) button.dataset.mode = mode;
    return button;
  }

  private separator(): HTMLElement {
    const el = document.createElement("span");
    el.className = "separator";
    return el;
  }

  private setActiveMode(mode: DrawingMode) {
    if (this.activeButton) this.activeButton.classList.remove("active");
    this.activeButton = mode
      ? this.root.querySelector<HTMLButtonElement>(`[data-mode="${mode}"]`)
      : null;
    if (this.activeButton) this.activeButton.classList.add("active");
  }

  private updateUndoRedo() {
    this.undoButton.disabled = !this.control.canUndo();
    this.redoButton.disabled = !this.control.canRedo();
  }

  // Layout
  public setPlacement(placement: PanelPlacement) {
    this.root.dataset.placement = placement;
  }

  public setOrientation(orientation: PanelOrientation) {
    this.root.dataset.orientation = orientation;
  }

  public destroy() {
    this.control.off(EVT_COMPLETE_DRAWING, this.handleDrawingEnd);
    this.control.off(EVT_CANCEL_DRAWING, this.handleDrawingEnd);
    this.control.off(EVT_HISTORY, this.handleHistory);
    this.root.remove();
  }
}
