import { Control } from "../Control";
import { EVT_COMPLETE_DRAWING, EVT_CANCEL_DRAWING, EVT_HISTORY } from "../constants";
import { svgIcon, type IconName } from "./icons";
import type { PanelPlacement, PanelOrientation } from "./layout";

/** Toolbars default to a bottom-docked horizontal bar, unlike the style
 * panel's right-docked vertical default - the natural "drawing tools"
 * position in both demos. */
const DEFAULT_TOOLBAR_PLACEMENT: PanelPlacement = "bottom";
const DEFAULT_TOOLBAR_ORIENTATION: PanelOrientation = "horizontal";

type DrawingMode = "arrow" | "comment" | "box" | "text" | "polygon" | null;

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

    this.root.appendChild(
      this.button("arrow", "arrow-right", "Add arrow", () => {
        this.control.enableArrowDrawing({
          strokeType: "plain",
          strokeColor: "#3A03CF",
          strokeWidth: 2,
          head: "arrow"
        });
        this.setActiveMode("arrow");
      })
    );
    this.root.appendChild(
      this.button("comment", "message-square", "Add comment", () => {
        this.control.enableCommentDrawing({
          offsetX: 200,
          offsetY: -150,
          commentStyle: {
            content: "",
            style: {
              color: "#3A03CF",
              background: "#EDE6FF",
              fontSize: 16,
              font: "IBM Plex Sans"
            }
          },
          arrowStyle: {
            style: {
              strokeType: "plain",
              strokeColor: "#3A03CF",
              strokeWidth: 2,
              head: "halo-dot"
            }
          }
        });
        this.setActiveMode("comment");
      })
    );
    this.root.appendChild(
      this.button("box", "rectangle-horizontal", "Add box", () => {
        this.control.enableBoxDrawing({
          background: "#EDE6FF",
          borderRadius: 8,
          padding: 12
        });
        this.setActiveMode("box");
      })
    );
    this.root.appendChild(
      this.button("text", "type", "Add text", () => {
        this.control.enableTextDrawing({
          font: "IBM Plex Sans",
          fontSize: 24,
          color: "#3A03CF",
          background: "#EDE6FF",
          borderRadius: 8,
          padding: 12
        });
        this.setActiveMode("text");
      })
    );
    this.root.appendChild(
      this.button(
        "polygon",
        "pentagon",
        "Add polygon (click points, Esc to finish)",
        () => {
          this.control.enablePolygonDrawing({
            strokeColor: "#3A03CF",
            strokeWidth: 2,
            background: "rgba(58, 3, 207, 0.15)"
          });
          this.setActiveMode("polygon");
        }
      )
    );

    this.root.appendChild(this.separator());

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
