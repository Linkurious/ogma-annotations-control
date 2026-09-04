import type { Ogma, Overlay } from "@linkurious/ogma";
import type { Control } from "../../Control";
import type { Id, Text } from "../../types";
import { getBoxCenter, getBoxSize } from "../../utils/utils";
import { ButtonItemCell } from "./cells/buttonItem";
import { DropdownItemCell } from "./cells/dropdownItem";
import type { ToolbarCell, ToolbarCellContext } from "./cells/contract";
import type { ToolbarItem } from "./cells/types";

/** Graph-space gap (at zoom 1) between the annotation's top edge and the
 * pill, kept roughly constant on screen by dividing by zoom - see
 * `getAnchor`. Matches the Figma export's ~12px anchor gap. */
const ANCHOR_GAP = 12;

export interface AnnotationStyleToolbarOptions {
  control: Control;
}

/**
 * Base class for a floating, per-selection style pill: mounts an
 * `ogma.layers.addOverlay(...)` layer holding a row of cells built from
 * `getItems()`'s declarative `ToolbarItem[]`, and keeps it anchored above
 * the annotation's (possibly rotated) top edge.
 *
 * Generic over its options type (`TOptions extends
 * AnnotationStyleToolbarOptions`) so a subclass can add its own
 * configuration - fonts/sizes/swatches for `TextStyleToolbar`, say - and
 * read it back via `this.options` from within `getItems()`, which the base
 * constructor calls before any subclass field initializer would run. Pass
 * that configuration through the options object itself (as
 * `TextStyleToolbar` does), not extra constructor parameters.
 *
 * Written directly against `Text` rather than also being generic over the
 * annotation type - `TextStyleToolbar`/`StickyNoteStyleToolbar` are the
 * only subclasses today. A future non-Text style toolbar (arrows/boxes/
 * polygons - explicitly undecided, see the toolbar's design notes) would
 * most likely copy this class's shape (overlay mount + item-driven cell
 * row + anchor tracking) rather than force a second type parameter through
 * a base no second subclass has yet exercised.
 *
 * One instance is tied to one annotation for its whole lifetime - the host
 * `TextAnnotationToolbar` destroys and recreates the toolbar when the
 * selection changes to a different annotation (or between plain-Text and
 * sticky-note), and calls `update()` on the same instance for everything
 * else (an edit from one of its own cells, or an external update).
 */
export abstract class AnnotationStyleToolbar<
  TOptions extends AnnotationStyleToolbarOptions = AnnotationStyleToolbarOptions
> {
  protected control: Control;
  protected ogma: Ogma;
  protected options: TOptions;
  public readonly annotationId: Id;

  private overlay: Overlay;
  /** The element handed to `addOverlay` - Ogma writes its own
   * `style.transform` (translate/rotate/scale, recomputed on every
   * viewChanged/zoom/rotate/move) directly onto this node to place it at
   * `position`, so nothing of ours may also set `transform` here or Ogma's
   * assignment clobbers it (inline style, last writer wins - there's no way
   * to compose two separate `transform` writers on one element). Zero-size
   * and otherwise unstyled; it exists purely as the anchor point. */
  private anchor: HTMLElement;
  /** The actual visible pill - a child of `anchor`, `position: absolute`
   * with its own `transform: translate(-50%, -100%)` (see `styles.css`) to
   * center horizontally and sit fully above the anchor point. This is where
   * our own positioning lives, kept off `anchor` for exactly that reason. */
  private root: HTMLElement;
  private cells: ToolbarCell[] = [];
  private documentClickHandler = (e: MouseEvent) => {
    if (this.root.contains(e.target as Node)) return;
    this.root
      .querySelectorAll(".oa-toolbar-dropdown.open")
      .forEach((el) => el.classList.remove("open"));
  };

  constructor(options: TOptions, annotation: Text) {
    this.control = options.control;
    this.options = options;
    this.ogma = this.control.getOgma();
    this.annotationId = annotation.id;

    this.anchor = document.createElement("div");
    this.anchor.className = "annotation-style-toolbar-anchor";

    this.root = document.createElement("div");
    this.root.className = "annotation-style-toolbar";
    this.anchor.appendChild(this.root);
    // Same guard as AnnotationPanel/AnnotationToolbar: don't let clicks
    // inside the pill reach Ogma's own interaction handlers (which would
    // otherwise e.g. unselect the annotation the pill is editing).
    ["click", "mousedown", "mousemove"].forEach((evt) =>
      this.root.addEventListener(evt, (e) => e.stopPropagation())
    );

    const ctx: ToolbarCellContext = {
      getAnnotation: () => this.control.getAnnotation<Text>(this.annotationId)!,
      updateStyle: (patch) =>
        this.control.updateStyle<Text>(this.annotationId, patch),
      deleteAnnotation: () => {
        const current = this.control.getAnnotation<Text>(this.annotationId);
        if (current) this.control.remove(current);
      }
    };

    this.setItems(this.getItems(ctx), ctx);
    this.cells.forEach((cell) => cell.update(annotation));

    // scaled:false - a UI pill, not a graph object, keeps a constant
    // screen size regardless of zoom (same reasoning TextArea documents for
    // fixedSize text). Position stays graph-space either way; Ogma keeps it
    // synced through pan/zoom on its own, same as every other Overlay.
    this.overlay = this.ogma.layers.addOverlay({
      element: this.anchor,
      position: this.getAnchor(annotation),
      scaled: false
    });

    document.addEventListener("click", this.documentClickHandler);
  }

  /** The toolbar's entries, in order - implemented by
   * `TextStyleToolbar`/`StickyNoteStyleToolbar`. Declarative
   * (`ToolbarItem[]`) rather than pre-built cells, so a consumer can
   * reconfigure the built-in items (fonts, sizes, swatches) via
   * `this.options` without subclassing any cell. */
  protected abstract getItems(ctx: ToolbarCellContext): ToolbarItem[];

  /** Turns one `ToolbarItem` into its `ToolbarCell` - `"separator"` has
   * none (handled by `setItems` directly), `"custom"` calls its own
   * `build()` (the color picker's escape hatch), `"button"`/`"dropdown"`
   * go through the two generic cell classes. */
  private buildCell(item: ToolbarItem, ctx: ToolbarCellContext): ToolbarCell | null {
    switch (item.kind) {
      case "separator":
        return null;
      case "custom":
        return item.build(ctx);
      case "button":
        return new ButtonItemCell(ctx, item);
      case "dropdown":
        return new DropdownItemCell(ctx, item);
    }
  }

  private setItems(items: ToolbarItem[], ctx: ToolbarCellContext) {
    this.cells = [];
    items.forEach((item) => {
      if (item.kind === "separator") {
        const divider = document.createElement("span");
        divider.className = "oa-toolbar-divider";
        this.root.appendChild(divider);
        return;
      }
      const cell = this.buildCell(item, ctx)!;
      this.cells.push(cell);
      this.root.appendChild(cell.element);
    });
  }

  /**
   * Top-center of the annotation's box, in graph space, offset outward by
   * `ANCHOR_GAP` (screen-constant, so divided by zoom) and rotated by the
   * global annotation-rotation angle - the same `ctx.rotate(rotation)`
   * transform `Handles.renderOutline` applies to a Text box's outline, so
   * the pill tracks the box exactly as it visually rotates.
   */
  private getAnchor(annotation: Text): { x: number; y: number } {
    const zoom = this.control.getZoom();
    const rotation = this.control.getRotation();
    const isFixedSize = annotation.properties.style?.fixedSize === true;

    let { height } = getBoxSize(annotation);
    if (isFixedSize) height /= zoom;

    const center = getBoxCenter(annotation);
    const localY = -(height / 2 + ANCHOR_GAP / zoom);
    const sin = Math.sin(rotation);
    const cos = Math.cos(rotation);

    return {
      x: center.x - localY * sin,
      y: center.y + localY * cos
    };
  }

  /** Refreshes every cell and repositions the pill for `annotation` -
   * called after a select, an own-cell edit, or an external update to the
   * same annotation. Does not rebuild cells; the host recreates the whole
   * instance when the annotation identity/kind changes. */
  public update(annotation: Text): void {
    this.cells.forEach((cell) => cell.update(annotation));
    this.overlay.setPosition(this.getAnchor(annotation));
  }

  public destroy(): void {
    document.removeEventListener("click", this.documentClickHandler);
    this.cells.forEach((cell) => cell.destroy());
    this.overlay.destroy();
  }
}
