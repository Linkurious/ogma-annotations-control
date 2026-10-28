import type { Ogma, Overlay } from "@linkurious/ogma";
import type { Control } from "../../Control";
import { isText, type Annotation, type Id } from "../../types";
import { getBoxCenter, getBoxSize } from "../../utils/utils";
import { ButtonItemCell } from "./cells/buttonItem";
import { DropdownItemCell } from "./cells/dropdownItem";
import type {
  ToolbarAnnotation,
  ToolbarCell,
  ToolbarCellContext
} from "./cells/contract";
import {
  ColorCell,
  type ColorCellOptions,
  type FillAnnotation
} from "./cells/color";
import {
  StrokeCell,
  type StrokeAnnotation,
  type StrokeCellOptions
} from "./cells/stroke";
import { colorHistoryFor, type ColorHistory } from "./cells/swatchPicker";
import type {
  ToolbarButtonItem,
  ToolbarCustomItem,
  ToolbarItem
} from "./cells/types";
import { watchSelection } from "./selection";
import { STICKY_SWATCHES, STROKE_SWATCHES, type Swatch } from "./swatches";

/** Graph-space gap (at zoom 1) between the annotation's top edge and the
 * pill, kept roughly constant on screen by dividing by zoom - see
 * `getAnchor`. Matches the Figma export's ~12px anchor gap. */
const ANCHOR_GAP = 12;

type PillSide = "top" | "bottom";

type AnchorBox = { center: { x: number; y: number }; halfHeight: number };

/** Options shared by every context toolbar (Text, Sticky note, Box, Arrow). */
export interface ContextToolbarOptions<
  A extends ToolbarAnnotation = ToolbarAnnotation
> {
  control: Control;
  /**
   * Whether a selected-but-locked (`isEditable: false`) annotation keeps the
   * toolbar hidden, same as no selection. Defaults to `true`.
   * Set to `false` to keep the toolbar open on a locked selection instead
   * (e.g. to keep a lock/unlock button in `items` reachable) - see
   * `attachPanelVisibility`'s `hideWhenNotEditable` for the full contract.
   */
  hideWhenNotEditable?: boolean;
  /**
   * Narrows which annotations of this toolbar's type get the pill - e.g.
   * `(a) => a.properties.tags?.includes("styled")`. Applied on top of the
   * type check, so it only ever sees annotations of the toolbar's own type.
   * Defaults to all of them.
   */
  filter?: (annotation: A) => boolean;
  /** Custom colors behind the color pickers' "+" button. Defaults to one
   * in-memory list per `Control`, shared by every toolbar on it - pass your
   * own (see `createColorHistory`) to persist or share it differently. */
  colorHistory?: ColorHistory;
  /**
   * Full control over the pill's contents: called with the built-in item
   * list (each with a stable `id`, see `ToolbarButtonItem.id`) and returns
   * what actually renders. Add, remove, reorder or replace freely -
   * `defaultItems.filter((i) => i.id !== "delete")` drops Delete,
   * `[{ kind: "custom", build: (c) => new MyCell(c) }, ...defaultItems]`
   * prepends a cell. Defaults to `defaultItems` unchanged.
   */
  items?: (
    defaultItems: ToolbarItem<A>[],
    ctx: ToolbarCellContext<A>
  ) => ToolbarItem<A>[];
}

/** Options for a toolbar with an Outline (`StrokeCell`) group. */
export interface StrokeToolbarOptions<
  A extends StrokeAnnotation = StrokeAnnotation
> extends ContextToolbarOptions<A> {
  /** Outline cell's swatch-grid palette - defaults to `STROKE_SWATCHES`. */
  strokeSwatches?: Swatch[];
  /** Bring your own picker for the outline cell's "+" - see
   * `StrokeCellOptions.onMoreColors`. */
  onMoreStrokeColors?: StrokeCellOptions<A>["onMoreColors"];
}

/** Options for a toolbar with a background Color (`ColorCell`) cell. */
export interface FillToolbarOptions<
  A extends FillAnnotation = FillAnnotation
> extends ContextToolbarOptions<A> {
  /** Color cell's swatch-grid palette - defaults to `STICKY_SWATCHES`. */
  swatches?: Swatch[];
  /** Bring your own picker for the color cell's "+" - see
   * `ColorCellOptions.onMoreColors`. */
  onMoreColors?: ColorCellOptions<A>["onMoreColors"];
}

/** The built-in background Color item (`id: "color"`). */
export function colorItem<A extends FillAnnotation>(
  options: FillToolbarOptions<A>,
  defaults: { background?: string }
): ToolbarCustomItem<A> {
  const history = options.colorHistory ?? colorHistoryFor(options.control);
  return {
    kind: "custom",
    id: "color",
    build: (c) =>
      new ColorCell<A>(c, {
        swatches: options.swatches ?? STICKY_SWATCHES,
        history,
        defaults,
        onMoreColors: options.onMoreColors
      })
  };
}

/** The built-in Outline item (`id: "outline"`). */
export function outlineItem<A extends StrokeAnnotation>(
  options: StrokeToolbarOptions<A>,
  defaults: { strokeWidth?: number; strokeType?: string }
): ToolbarCustomItem<A> {
  const history = options.colorHistory ?? colorHistoryFor(options.control);
  return {
    kind: "custom",
    id: "outline",
    build: (c) =>
      new StrokeCell<A>(c, {
        swatches: options.strokeSwatches ?? STROKE_SWATCHES,
        history,
        defaults,
        onMoreColors: options.onMoreStrokeColors
      })
  };
}

/** The built-in Delete button, shared by every context toolbar. */
export function deleteItem<
  A extends ToolbarAnnotation
>(): ToolbarButtonItem<A> {
  return {
    kind: "button",
    id: "delete",
    title: "Delete",
    icon: "trash",
    danger: true,
    action: (c) => c.deleteAnnotation()
  };
}

/**
 * Base class for a floating, per-selection style toolbar - a context menu
 * for one annotation kind. Listens to selection on its own: when exactly one
 * annotation for which `matches()` is true is selected, it mounts a pill
 * (an `ogma.layers.addOverlay(...)` layer) anchored above it, holding a row
 * of cells built from `defaultItems()` (passed through `options.items`).
 *
 * Use a concrete subclass (`TextContextToolbar`, `StickyNoteContextToolbar`,
 * `BoxContextToolbar`, `ArrowContextToolbar`) on its own, or
 * `ContextToolbars` to set them all up at once.
 */
export abstract class ContextToolbar<
  A extends ToolbarAnnotation = ToolbarAnnotation,
  TOptions extends ContextToolbarOptions<A> = ContextToolbarOptions<A>
> {
  protected control: Control;
  protected options: TOptions;
  private pill: ToolbarPill<A> | null = null;
  private unwatch: () => void;

  constructor(options: TOptions) {
    this.control = options.control;
    this.options = options;
    // Selection is watched by one debounced state machine per `Control`,
    // shared with every other context toolbar on it (see `selection.ts`).
    this.unwatch = watchSelection(this.control, {
      show: (annotation) => this.show(annotation),
      hide: () => this.hide()
    });
  }

  /** Which annotations this toolbar is shown for. */
  protected abstract matches(annotation: Annotation): annotation is A;

  /** The built-in entries, in order, before `options.items` is applied. */
  protected abstract defaultItems(): ToolbarItem<A>[];

  /** `aria-label` of the pill's root group. */
  protected label(): string {
    return "Annotation style toolbar";
  }

  /** Point the pill is centered on (graph space) and the half-extent of the
   * annotation around it. Default: the box center and half its height.
   * `fixedSize` only applies to Text (its height is screen-constant). */
  protected getAnchorBox(annotation: A): AnchorBox {
    const zoom = this.control.getZoom();
    const isFixedSize =
      isText(annotation) && annotation.properties.style?.fixedSize === true;

    let { height } = getBoxSize(annotation);
    if (isFixedSize) height /= zoom;

    return { center: getBoxCenter(annotation), halfHeight: height / 2 };
  }

  private isShownFor(annotation: Annotation): annotation is A {
    const { filter, hideWhenNotEditable = true } = this.options;
    return (
      this.matches(annotation) &&
      (!filter || filter(annotation)) &&
      (!hideWhenNotEditable || this.control.isAnnotationEditable(annotation.id))
    );
  }

  private show(annotation: Annotation) {
    if (!this.isShownFor(annotation)) {
      this.hide();
      return;
    }
    if (this.pill?.annotationId === annotation.id) {
      this.pill.update(annotation);
      return;
    }
    this.hide();
    this.pill = new ToolbarPill<A>(
      this.control,
      annotation,
      (ctx) => {
        const defaults = this.defaultItems();
        return this.options.items?.(defaults, ctx) ?? defaults;
      },
      this.label(),
      (a) => this.getAnchorBox(a)
    );
  }

  private hide() {
    this.pill?.destroy();
    this.pill = null;
  }

  public destroy(): void {
    this.unwatch();
    this.hide();
  }
}

/**
 * One mounted pill, tied to one annotation for its whole lifetime -
 * `ContextToolbar` destroys and recreates it when the selection changes to
 * a different annotation, and calls `update()` for everything else.
 */
class ToolbarPill<A extends ToolbarAnnotation> {
  public readonly annotationId: Id;
  private ogma: Ogma;
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

  constructor(
    private control: Control,
    annotation: A,
    getItems: (ctx: ToolbarCellContext<A>) => ToolbarItem<A>[],
    label: string,
    private getAnchorBox: (annotation: A) => AnchorBox
  ) {
    this.ogma = control.getOgma();
    this.annotationId = annotation.id;

    this.anchor = document.createElement("div");
    this.anchor.className = "annotation-style-toolbar-anchor";

    this.root = document.createElement("div");
    this.root.className = "annotation-style-toolbar oa-toolbar oa-toolbar-bar";
    this.root.setAttribute("role", "group");
    this.root.setAttribute("aria-label", label);
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
      },
      getBounds: () => this.getBounds()
    };

    this.setItems(getItems(ctx), ctx);
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

  /** The Ogma container clipped to the window viewport. */
  private getBounds(): DOMRect {
    const viewport = new DOMRect(0, 0, window.innerWidth, window.innerHeight);
    const container = this.ogma.getContainer();
    if (!container) return viewport;
    const c = container.getBoundingClientRect();
    const left = Math.max(c.left, viewport.left);
    const top = Math.max(c.top, viewport.top);
    const right = Math.min(c.right, viewport.right);
    const bottom = Math.min(c.bottom, viewport.bottom);
    return new DOMRect(left, top, right - left, bottom - top);
  }

  private onViewChanged = () => {
    const annotation = this.control.getAnnotation<A>(this.annotationId);
    if (annotation) this.placePill(annotation);
  };

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
   * same annotation. Does not rebuild cells. */
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
