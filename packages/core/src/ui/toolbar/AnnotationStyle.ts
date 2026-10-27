import type { Ogma, Overlay } from "@linkurious/ogma";
import type { Control } from "../../Control";
import { isText, type Id, type Text } from "../../types";
import { getBoxCenter, getBoxSize } from "../../utils/utils";
import { ButtonItemCell } from "./cells/buttonItem";
import { DropdownItemCell } from "./cells/dropdownItem";
import type {
  ToolbarAnnotation,
  ToolbarCell,
  ToolbarCellContext
} from "./cells/contract";
import type { ToolbarItem } from "./cells/types";

/** Graph-space gap (at zoom 1) between the annotation's top edge and the
 * pill, kept roughly constant on screen by dividing by zoom - see
 * `getAnchor`. Matches the Figma export's ~12px anchor gap. */
const ANCHOR_GAP = 12;

type PillSide = "top" | "bottom";

export interface AnnotationStyleToolbarOptions {
  control: Control;
}

/**
 * Base class for a floating, per-selection style pill: mounts an
 * `ogma.layers.addOverlay(...)` layer holding a row of cells built from
 * `getItems()`'s declarative `ToolbarItem[]`, and keeps it anchored above
 * the annotation's (possibly rotated) top edge.
 *
 * Generic over the annotation kind `A` (Text, Box, Arrow) and the options
 * type `TOptions`. A subclass reads its configuration back via `this.options`
 * from within `getItems()`, which the base constructor calls before any
 * subclass field initializer would run. Pass that configuration through the
 * options object itself (as `TextStyleToolbar` does), not extra constructor
 * parameters.
 *
 * One instance is tied to one annotation for its whole lifetime - the host
 * `TextAnnotationToolbar` destroys and recreates the toolbar when the
 * selection changes to a different annotation (or to a different kind), and
 * calls `update()` on the same instance for everything else.
 */
export abstract class AnnotationStyleToolbar<
  A extends ToolbarAnnotation = Text,
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
  private cells: ToolbarCell<A>[] = [];
  private documentClickHandler = (e: MouseEvent) => {
    if (this.root.contains(e.target as Node)) return;
    this.root
      .querySelectorAll(".oa-toolbar-dropdown.open")
      .forEach((el) => el.classList.remove("open"));
  };

  constructor(options: TOptions, annotation: A) {
    this.control = options.control;
    this.options = options;
    this.ogma = this.control.getOgma();
    this.annotationId = annotation.id;

    this.anchor = document.createElement("div");
    this.anchor.className = "annotation-style-toolbar-anchor";

    this.root = document.createElement("div");
    this.root.className = "annotation-style-toolbar oa-toolbar oa-toolbar-bar";
    this.root.setAttribute("role", "group");
    this.root.setAttribute("aria-label", this.label());
    this.anchor.appendChild(this.root);
    // Same guard as AnnotationPanel/AnnotationToolbar: don't let clicks
    // inside the pill reach Ogma's own interaction handlers (which would
    // otherwise e.g. unselect the annotation the pill is editing).
    ["click", "mousedown", "mousemove"].forEach((evt) =>
      this.root.addEventListener(evt, (e) => e.stopPropagation())
    );

    const ctx: ToolbarCellContext<A> = {
      getAnnotation: () => this.control.getAnnotation<A>(this.annotationId)!,
      updateStyle: (patch) =>
        this.control.updateStyle<A>(this.annotationId, patch),
      deleteAnnotation: () => {
        const current = this.control.getAnnotation<A>(this.annotationId);
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
    this.placePill(annotation);

    this.ogma.events.on("viewChanged", this.onViewChanged);
    document.addEventListener("click", this.documentClickHandler);
  }

  private onViewChanged = () => {
    const annotation = this.control.getAnnotation<A>(this.annotationId);
    if (annotation) this.placePill(annotation);
  };

  /** The toolbar's entries, in order - implemented by each concrete
   * toolbar. Declarative (`ToolbarItem[]`) rather than pre-built cells, so a
   * consumer can reconfigure the built-in items (fonts, sizes, swatches) via
   * `this.options` without subclassing any cell. */
  protected abstract getItems(ctx: ToolbarCellContext<A>): ToolbarItem<A>[];

  /** `aria-label` of the pill's root group. */
  protected label(): string {
    return "Annotation style toolbar";
  }

  /** Turns one `ToolbarItem` into its `ToolbarCell` - `"separator"` has
   * none (handled by `setItems` directly), `"custom"` calls its own
   * `build()` (the color picker's escape hatch), `"button"`/`"dropdown"`
   * go through the two generic cell classes. */
  private buildCell(
    item: ToolbarItem<A>,
    ctx: ToolbarCellContext<A>
  ): ToolbarCell<A> | null {
    switch (item.kind) {
      case "separator":
        return null;
      case "custom":
        return item.build(ctx);
      case "button":
        return new ButtonItemCell<A>(ctx, item);
      case "dropdown":
        return new DropdownItemCell<A>(ctx, item);
    }
  }

  private setItems(items: ToolbarItem<A>[], ctx: ToolbarCellContext<A>) {
    this.cells = [];
    items.forEach((item) => {
      if (item.kind === "separator") {
        const divider = document.createElement("span");
        divider.className = "oa-toolbar-separator";
        this.root.appendChild(divider);
        return;
      }
      const cell = this.buildCell(item, ctx)!;
      this.cells.push(cell);
      this.root.appendChild(cell.element);
    });
  }

  /** Point the pill is centered on (graph space) and the half-extent of the
   * annotation around it. Default: the box center and half its height.
   * `fixedSize` only applies to Text (its height is screen-constant). */
  protected getAnchorBox(annotation: A): {
    center: { x: number; y: number };
    halfHeight: number;
  } {
    const zoom = this.control.getZoom();
    const isFixedSize =
      isText(annotation) && annotation.properties.style?.fixedSize === true;

    let { height } = getBoxSize(annotation);
    if (isFixedSize) height /= zoom;

    return { center: getBoxCenter(annotation), halfHeight: height / 2 };
  }

  /**
   * Anchor point on the `side` of the annotation, in graph space, offset
   * outward by `ANCHOR_GAP` (screen-constant, so divided by zoom) and rotated
   * by the global annotation-rotation angle - the same `ctx.rotate(rotation)`
   * transform `Handles.renderOutline` applies to a Text box's outline, so
   * the pill tracks the box exactly as it visually rotates.
   */
  private getAnchor(
    annotation: A,
    side: PillSide = "top"
  ): { x: number; y: number } {
    const zoom = this.control.getZoom();
    const rotation = this.control.getRotation();
    const { center, halfHeight } = this.getAnchorBox(annotation);
    const direction = side === "top" ? -1 : 1;
    const localY = direction * (halfHeight + ANCHOR_GAP / zoom);
    const sin = Math.sin(rotation);
    const cos = Math.cos(rotation);

    return {
      x: center.x - localY * sin,
      y: center.y + localY * cos
    };
  }

  /**
   * Chooses the side (above or below the anchor) and horizontal shift that
   * keep the pill inside the Ogma container. Prefers above; flips below only
   * when above does not fit and below does. Horizontal overflow is removed
   * by shifting the pill, not by moving the anchor. Skipped (defaults to
   * above) while the pill has no layout size.
   */
  private placePill(annotation: A): void {
    const top = this.getAnchor(annotation, "top");
    const bottom = this.getAnchor(annotation, "bottom");
    const container = this.ogma.getContainer();
    const width = this.root.offsetWidth;
    const height = this.root.offsetHeight;

    if (!container || !width || !height) {
      this.setSide("top", top, 0);
      return;
    }

    const screenTop = this.ogma.view.graphToScreenCoordinates(top);
    const screenBottom = this.ogma.view.graphToScreenCoordinates(bottom);
    const fitsAbove = screenTop.y - height >= 0;
    const fitsBelow = screenBottom.y + height <= container.clientHeight;
    const side: PillSide = fitsAbove || !fitsBelow ? "top" : "bottom";

    const screenX = (side === "top" ? screenTop : screenBottom).x;
    const left = screenX - width / 2;
    const right = left + width;
    let shift = 0;
    if (left < 0) shift = -left;
    else if (right > container.clientWidth)
      shift = container.clientWidth - right;

    this.setSide(side, side === "top" ? top : bottom, shift);
  }

  private setSide(
    side: PillSide,
    position: { x: number; y: number },
    shift: number
  ) {
    this.root.classList.toggle("is-below", side === "bottom");
    this.root.style.marginLeft = `${shift}px`;
    this.overlay.setPosition(position);
  }

  /** Refreshes every cell and repositions the pill for `annotation` -
   * called after a select, an own-cell edit, or an external update to the
   * same annotation. Does not rebuild cells; the host recreates the whole
   * instance when the annotation identity/kind changes. */
  public update(annotation: A): void {
    this.cells.forEach((cell) => cell.update(annotation));
    this.placePill(annotation);
  }

  public destroy(): void {
    this.ogma.events.off(this.onViewChanged);
    document.removeEventListener("click", this.documentClickHandler);
    this.cells.forEach((cell) => cell.destroy());
    this.overlay.destroy();
  }
}
