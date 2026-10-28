import { Ogma } from "@linkurious/ogma";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  Control,
  createArrow,
  createBox,
  createCommentWithArrow,
  createPolygon,
  createText,
  isPolygon,
  defaultTextStyle,
  isStickyNote,
  type Annotation,
  type Arrow,
  type Box,
  type Polygon,
  type Text,
  type AnnotationState
} from "../../src";
import { renderText } from "../../src/renderer/shapes/text";
import {
  STICKY_SWATCHES,
  STROKE_SWATCHES,
  DEFAULT_TOOLBAR_FONTS,
  TextAnnotationToolbar,
  ContextToolbars,
  ArrowContextToolbar,
  BoxContextToolbar,
  ContextToolbar,
  deleteItem,
  ButtonItemCell,
  DropdownItemCell,
  ColorCell,
  StrokeCell,
  STROKE_WIDTH_THIN,
  STROKE_WIDTH_THICK,
  createColorHistory,
  MAX_CUSTOM_SWATCHES,
  SwatchPicker,
  colorHistoryFor
} from "../../src/ui";
import type { ToolbarCellContext } from "../../src/ui/toolbar/cells/contract";
import type {
  ToolbarButtonItem,
  ToolbarDropdownItem,
  ToolbarItem
} from "../../src/ui/toolbar/cells/types";
import { fitPopover } from "../../src/ui/toolbar/cells/dropdown";

/** Minimal fake `AnnotationState` covering only what `renderText`/`renderBox`
 * read - no need to spin up a real store for a pure rendering test. */
function fakeState(): AnnotationState {
  return {
    hoveredFeature: null,
    getScreenAlignedTransform: () => "matrix(1, 0, 0, 1, 0, 0)",
    getRotationTransform: () => ""
  } as unknown as AnnotationState;
}

describe("renderer/shapes/text - fontWeight", () => {
  it("folds fontWeight into the CSS font string used for measurement", () => {
    const root = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const text = createText(0, 0, 200, 100, "Hello world", {
      fontWeight: "bold",
      fontSize: 20,
      font: "sans-serif"
    });

    const g = renderText(root, text, undefined, fakeState());
    const textEl = g.querySelector("text")!;

    expect(textEl.getAttribute("font-weight")).toBe("bold");
  });

  it("omits font-weight for normal/unset text", () => {
    const root = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const text = createText(0, 0, 200, 100, "Hello world", {
      fontSize: 20,
      font: "sans-serif"
    });

    const g = renderText(root, text, undefined, fakeState());
    const textEl = g.querySelector("text")!;

    expect(textEl.getAttribute("font-weight")).toBeNull();
  });
});

describe("types/features/Text - isStickyNote", () => {
  it("is true for a Text created with defaultStickyNoteStyle's markers", () => {
    const sticky = createText(0, 0, 160, 160, "", {
      scaleFontOnResize: true,
      placeholder: "Quick note…"
    });
    expect(isStickyNote(sticky)).toBe(true);
  });

  it("is false for plain Text with neither marker", () => {
    const plain = createText(0, 0, 100, 50, "Hello");
    expect(isStickyNote(plain)).toBe(false);
  });

  it("is false when only scaleFontOnResize is set (avoids false positives)", () => {
    const manual = createText(0, 0, 100, 50, "Hello", {
      scaleFontOnResize: true
    });
    expect(isStickyNote(manual)).toBe(false);
  });
});

describe("ui/toolbar/swatches", () => {
  it("exposes the Figma-extracted fill/stroke pairs, plus a transparent option", () => {
    expect(STICKY_SWATCHES.length).toBeGreaterThan(0);
    STICKY_SWATCHES.forEach((s) => {
      expect(s.fill).toMatch(/^#[0-9A-F]{6}$|^transparent$/i);
      expect(s.stroke).toMatch(/^#[0-9A-F]{6}$/i);
    });
    expect(STICKY_SWATCHES.some((s) => s.fill === "transparent")).toBe(true);
  });

  it("STROKE_SWATCHES is STICKY_SWATCHES without the transparent swatch", () => {
    expect(STROKE_SWATCHES.some((s) => s.fill === "transparent")).toBe(false);
    expect(STROKE_SWATCHES).toEqual(
      STICKY_SWATCHES.filter((s) => s.fill !== "transparent")
    );
  });
});

/** Minimal fake cell context - cells only ever touch this structural slice,
 * not `Control`/`Ogma`, so no headless Ogma needed for these. */
function fakeCellContext(initial: Text) {
  let annotation = initial;
  return {
    ctx: {
      getAnnotation: () => annotation,
      updateStyle: vi.fn((patch: Partial<Text["properties"]["style"]>) => {
        annotation = {
          ...annotation,
          properties: {
            ...annotation.properties,
            style: { ...annotation.properties.style, ...patch }
          }
        };
      }),
      deleteAnnotation: vi.fn()
    } as ToolbarCellContext,
    setAnnotation: (a: Text) => (annotation = a)
  };
}

describe("ui/toolbar/cells - generic item renderers", () => {
  it("ButtonItemCell wires the item's action and isActive/danger flags", () => {
    const text = createText(0, 0, 100, 50, "Hi");
    const { ctx } = fakeCellContext(text);
    const action = vi.fn();
    const item: ToolbarButtonItem = {
      kind: "button",
      title: "Bold",
      icon: "bold",
      danger: true,
      isActive: (a) => a.properties.style?.fontWeight === "bold",
      action
    };
    const cell = new ButtonItemCell(ctx, item);

    expect(cell.element.dataset.tooltip).toBe("Bold");
    expect(cell.element.getAttribute("aria-label")).toBe("Bold");
    expect(cell.element.classList.contains("oa-toolbar-button-danger")).toBe(
      true
    );

    cell.element.click();
    expect(action).toHaveBeenCalledWith(ctx);

    cell.update({
      ...text,
      properties: { ...text.properties, style: { fontWeight: "bold" } }
    });
    expect(cell.element.classList.contains("active")).toBe(true);
  });

  it("DropdownItemCell calls onSelect and reflects the current value's label", () => {
    const text = createText(0, 0, 100, 50, "Hi", { fontSize: 18 });
    const { ctx } = fakeCellContext(text);
    const onSelect = vi.fn();
    const item: ToolbarDropdownItem = {
      kind: "dropdown",
      title: "Font size",
      options: [
        { value: 18, label: "18" },
        { value: 24, label: "24" }
      ],
      getValue: (a) => (a.properties.style?.fontSize as number) ?? 18,
      onSelect
    };
    const cell = new DropdownItemCell(ctx, item);
    cell.update(ctx.getAnnotation());

    const trigger = cell.element.querySelector<HTMLButtonElement>(
      ".oa-toolbar-dropdown-trigger"
    )!;
    expect(trigger.tagName).toBe("BUTTON");
    expect(trigger.getAttribute("aria-haspopup")).toBe("listbox");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.getAttribute("aria-label")).toBe("Font size: 18");

    const panel = cell.element.querySelector(".oa-toolbar-dropdown-panel")!;
    expect(panel.getAttribute("role")).toBe("listbox");

    const options = cell.element.querySelectorAll<HTMLButtonElement>(
      ".oa-toolbar-dropdown-option"
    );
    expect(options[0].getAttribute("role")).toBe("option");
    expect(options[0].getAttribute("aria-selected")).toBe("true");
    expect(options[1].getAttribute("aria-selected")).toBe("false");

    options[1].click();

    expect(onSelect).toHaveBeenCalledWith(24, ctx);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("ColorCell gives the transparent swatch a checkerboard marker class and picks it correctly", () => {
    const text = createText(0, 0, 100, 50, "Hi", { background: "#FFE49B" });
    const { ctx } = fakeCellContext(text);
    const cell = new ColorCell(ctx, {
      swatches: STICKY_SWATCHES,
      history: createColorHistory(),
      defaults: {}
    });

    const cells = cell.element.querySelectorAll<HTMLButtonElement>(
      ".oa-toolbar-swatch-cell"
    );
    const transparentCell = Array.from(cells).find(
      (c) => c.title === "transparent"
    )!;
    expect(transparentCell).toBeTruthy();
    expect(transparentCell.getAttribute("aria-label")).toBe("No background");
    expect(
      transparentCell.classList.contains("oa-toolbar-swatch-cell-transparent")
    ).toBe(true);
    // Every other swatch is a real color, so none should carry the marker.
    cells.forEach((c) => {
      if (c !== transparentCell) {
        expect(c.classList.contains("oa-toolbar-swatch-cell-transparent")).toBe(
          false
        );
      }
    });

    transparentCell.click();
    expect(ctx.updateStyle).toHaveBeenCalledWith({ background: "transparent" });

    // The trigger's own swatch indicator picks up the marker too once the
    // annotation's background actually is transparent.
    cell.update(ctx.getAnnotation());
    const trigger = cell.element.querySelector(".oa-toolbar-swatch")!;
    expect(trigger.classList.contains("oa-toolbar-swatch-transparent")).toBe(
      true
    );
  });

  it("ColorCell's built-in '+' color picker opens for a transparent background instead of throwing (regression: parseColor didn't recognize transparent/none)", () => {
    const text = createText(0, 0, 100, 50, "Hi", { background: "transparent" });
    const { ctx } = fakeCellContext(text);
    const cell = new ColorCell(ctx, {
      swatches: STICKY_SWATCHES,
      history: createColorHistory(),
      defaults: {}
    });

    const moreBtn = cell.element.querySelector<HTMLButtonElement>(
      ".oa-toolbar-swatch-add"
    )!;

    expect(() => moreBtn.click()).not.toThrow();
    expect(
      cell.element.querySelector(".oa-toolbar-more-colors-host")
    ).not.toBeNull();
  });

  it("ColorCell calls onMoreColors instead of opening the built-in picker when provided", () => {
    const text = createText(0, 0, 100, 50, "Hi", { background: "#FFE49B" });
    const { ctx } = fakeCellContext(text);
    const onMoreColors = vi.fn();
    const cell = new ColorCell(ctx, {
      swatches: STICKY_SWATCHES,
      history: createColorHistory(),
      defaults: {},
      onMoreColors
    });

    const moreBtn = cell.element.querySelector<HTMLButtonElement>(
      ".oa-toolbar-swatch-add"
    )!;
    moreBtn.click();

    expect(onMoreColors).toHaveBeenCalledWith(
      ctx,
      moreBtn,
      expect.any(Function)
    );
    // The built-in vanilla-colorful popover must not have been built.
    expect(
      cell.element.querySelector(".oa-toolbar-more-colors-host")
    ).toBeNull();

    // The host is expected to call ctx.updateStyle itself - simulate that
    // and confirm it lands the same way a built-in pick would.
    onMoreColors.mock.calls[0][0].updateStyle({ background: "#123456" });
    expect(ctx.updateStyle).toHaveBeenCalledWith({ background: "#123456" });
  });

  it("StrokeCell's thickness row writes the thin/thick strokeWidth presets and reflects the closer preset as active", () => {
    const text = createText(0, 0, 100, 50, "Hi", { strokeWidth: 0 });
    const { ctx } = fakeCellContext(text);
    const cell = new StrokeCell(ctx, {
      swatches: STROKE_SWATCHES,
      history: createColorHistory(),
      defaults: {}
    });
    cell.update(ctx.getAnnotation());

    const [weightRow] = cell.element.querySelectorAll<HTMLElement>(
      ".oa-toolbar-stroke-row"
    );
    const [thin, thick] = weightRow.querySelectorAll<HTMLButtonElement>(
      ".oa-toolbar-stroke-option"
    );
    // strokeWidth 0 is closer to STROKE_WIDTH_THIN than STROKE_WIDTH_THICK.
    expect(thin.classList.contains("active")).toBe(true);
    expect(thick.classList.contains("active")).toBe(false);

    thick.click();
    expect(ctx.updateStyle).toHaveBeenCalledWith({
      strokeWidth: STROKE_WIDTH_THICK
    });

    cell.update(ctx.getAnnotation());
    expect(thick.classList.contains("active")).toBe(true);
    expect(thin.classList.contains("active")).toBe(false);

    thin.click();
    expect(ctx.updateStyle).toHaveBeenCalledWith({
      strokeWidth: STROKE_WIDTH_THIN
    });
  });

  it("StrokeCell's line-style row writes strokeType plain/dashed and reflects the current value", () => {
    const text = createText(0, 0, 100, 50, "Hi", { strokeType: "plain" });
    const { ctx } = fakeCellContext(text);
    const cell = new StrokeCell(ctx, {
      swatches: STROKE_SWATCHES,
      history: createColorHistory(),
      defaults: {}
    });
    cell.update(ctx.getAnnotation());

    const [, typeRow] = cell.element.querySelectorAll<HTMLElement>(
      ".oa-toolbar-stroke-row"
    );
    const [solid, dashed] = typeRow.querySelectorAll<HTMLButtonElement>(
      ".oa-toolbar-stroke-option"
    );
    expect(solid.classList.contains("active")).toBe(true);
    expect(dashed.classList.contains("active")).toBe(false);

    dashed.click();
    expect(ctx.updateStyle).toHaveBeenCalledWith({ strokeType: "dashed" });

    cell.update(ctx.getAnnotation());
    expect(dashed.classList.contains("active")).toBe(true);
    expect(solid.classList.contains("active")).toBe(false);
  });

  it("StrokeCell's swatch grid writes strokeColor and closes the dropdown", () => {
    const text = createText(0, 0, 100, 50, "Hi");
    const { ctx } = fakeCellContext(text);
    const cell = new StrokeCell(ctx, {
      swatches: STROKE_SWATCHES,
      history: createColorHistory(),
      defaults: {}
    });
    cell.element.classList.add("open");

    const swatch = cell.element.querySelector<HTMLButtonElement>(
      ".oa-toolbar-swatch-cell"
    )!;
    swatch.click();

    expect(ctx.updateStyle).toHaveBeenCalledWith({
      strokeColor: STROKE_SWATCHES[0].fill
    });
    expect(cell.element.classList.contains("open")).toBe(false);
  });

  it("StrokeCell's built-in '+' color picker opens without throwing", () => {
    const text = createText(0, 0, 100, 50, "Hi", { strokeColor: "#123456" });
    const { ctx } = fakeCellContext(text);
    const cell = new StrokeCell(ctx, {
      swatches: STROKE_SWATCHES,
      history: createColorHistory(),
      defaults: {}
    });

    const moreBtn = cell.element.querySelector<HTMLButtonElement>(
      ".oa-toolbar-swatch-add"
    )!;

    expect(() => moreBtn.click()).not.toThrow();
    expect(
      cell.element.querySelector(".oa-toolbar-more-colors-host")
    ).not.toBeNull();
  });

  it("StrokeCell calls onMoreColors instead of opening the built-in picker when provided", () => {
    const text = createText(0, 0, 100, 50, "Hi", { strokeColor: "#123456" });
    const { ctx } = fakeCellContext(text);
    const onMoreColors = vi.fn();
    const cell = new StrokeCell(ctx, {
      swatches: STROKE_SWATCHES,
      history: createColorHistory(),
      defaults: {},
      onMoreColors
    });

    const moreBtn = cell.element.querySelector<HTMLButtonElement>(
      ".oa-toolbar-swatch-add"
    )!;
    moreBtn.click();

    expect(onMoreColors).toHaveBeenCalledWith(
      ctx,
      moreBtn,
      expect.any(Function)
    );
    expect(
      cell.element.querySelector(".oa-toolbar-more-colors-host")
    ).toBeNull();

    onMoreColors.mock.calls[0][0].updateStyle({ strokeColor: "#654321" });
    expect(ctx.updateStyle).toHaveBeenCalledWith({ strokeColor: "#654321" });
  });

  it("real Text/StickyNote item lists (via TextContextToolbar) expose bold/author/delete/font tooltips", () => {
    // Exercised end-to-end (real tooltips in the mounted pill) in the
    // ui/TextAnnotationToolbar block below - this just checks the default
    // font list includes the requested monospace option.
    expect(DEFAULT_TOOLBAR_FONTS.map((f) => f.value)).toContain(
      "IBM Plex Mono"
    );
  });
});

describe("ui/toolbar/cells/swatchPicker", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const mount = (onMore?: SwatchPickerOptionsLike["onMore"]) => {
    const history = createColorHistory();
    const onPick = vi.fn();
    const picker = new SwatchPicker({
      swatches: STROKE_SWATCHES,
      history,
      label: (c) => c,
      getCurrent: () => "#000000",
      onPick,
      onDone: vi.fn(),
      onResize: vi.fn(),
      onMore
    });
    const custom = () =>
      Array.from(
        picker.element.querySelectorAll<HTMLButtonElement>(
          ".oa-toolbar-swatch-grid-custom .oa-toolbar-swatch-cell"
        )
      ).map((b) => b.title);
    const add = () =>
      picker.element.querySelector<HTMLButtonElement>(
        ".oa-toolbar-swatch-add"
      )!;
    return { picker, history, onPick, custom, add };
  };

  it("history keeps newest first, no duplicates, at most the limit", () => {
    const history = createColorHistory(3);
    ["#1", "#2", "#3", "#1", "#4"].forEach((c) => history.add(c));
    expect(history.get()).toEqual(["#4", "#1", "#3"]);
    expect(createColorHistory().get()).toEqual([]);
    expect(MAX_CUSTOM_SWATCHES).toBe(5);
  });

  it("'+' opens the picker; the color settles into the custom swatches", () => {
    const { picker, onPick, custom, add } = mount();
    expect(custom()).toEqual([]);

    add().click();
    const el = picker.element.querySelector(
      ".oa-toolbar-more-colors-host"
    )!.firstElementChild!;
    const change = (r: number) =>
      el.dispatchEvent(
        new CustomEvent("color-changed", {
          detail: { value: { r, g: 0, b: 0, a: 1 } }
        })
      );
    change(10);
    change(20);
    expect(onPick).toHaveBeenCalledTimes(2);
    expect(custom()).toEqual([]); // not while dragging

    vi.advanceTimersByTime(500);
    expect(custom()).toHaveLength(1);
    expect(custom()[0]).toBe(onPick.mock.calls[1][0]);
    picker.destroy();
  });

  it("custom swatches apply when clicked, and the '+' stays last", () => {
    const { picker, history, onPick, add } = mount();
    history.add("#abcdef");
    const swatch = picker.element.querySelector<HTMLButtonElement>(
      '.oa-toolbar-swatch-grid-custom [title="#abcdef"]'
    )!;
    swatch.click();
    expect(onPick).toHaveBeenCalledWith("#abcdef");
    expect(add().parentElement!.lastElementChild).toBe(add());
    picker.destroy();
  });

  it("onMore gets an addSwatch callback instead of the built-in picker", () => {
    const onMore = vi.fn();
    const { picker, custom, add } = mount(onMore);
    add().click();
    expect(
      picker.element.querySelector(".oa-toolbar-more-colors-host")
    ).toBeNull();
    onMore.mock.calls[0][1]("#123456");
    expect(custom()).toEqual(["#123456"]);
    picker.destroy();
  });
});

type SwatchPickerOptionsLike = ConstructorParameters<typeof SwatchPicker>[0];

describe("ui/ContextToolbars", () => {
  let ogma: Ogma;
  let control: Control;
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.useFakeTimers();
    // Headless Ogma normally builds a detached container
    // (`ogma.getContainer()` is `null`, per `createOgma()`'s default usage
    // elsewhere in this suite) - fine for logic-only tests, but this
    // toolbar mounts via `ogma.layers.addOverlay`, which appends into
    // Ogma's own container, so an explicit one attached to `document.body`
    // is needed for `document.querySelector` assertions below to find it.
    container = document.createElement("div");
    document.body.appendChild(container);
    ogma = new Ogma({ container, options: { renderer: null } });
    control = new Control(ogma);
  });

  afterEach(() => {
    vi.useRealTimers();
    // Deselect before destroying: TextHandler installs a window-level capture
    // "click" listener (see handlers/base.ts's `setAnnotation`) while a
    // Text/Comment is selected, keyed off `ogma.getContainer()` being
    // non-null - true here, unlike the suite's usual containerless
    // `createOgma()`. `control.destroy()` alone doesn't appear to remove
    // it, so without this, the listener leaks on the shared `window`
    // across tests and later fires against an already-`ogma.destroy()`ed
    // (modules-nulled) instance on any click anywhere in the document.
    try {
      control.unselect();
    } catch {
      // headless mode
    }
    try {
      control.destroy();
    } catch {
      // headless mode
    }
    try {
      ogma.destroy();
    } catch {
      // headless mode
    }
    container.remove();
  });

  it("hides the arrow pill for an arrow attached to a comment", () => {
    const { comment, arrow } = createCommentWithArrow(0, 0, 50, 50);
    control.add(comment);
    control.add(arrow);

    const toolbar = new TextAnnotationToolbar({ control });
    control.select(arrow.id);
    vi.advanceTimersByTime(200);

    expect(document.querySelector(".annotation-style-toolbar")).toBeNull();
    toolbar.destroy();
  });

  it("shows the arrow pill for a plain arrow", () => {
    const added = control.add(createArrow(0, 0, 100, 0)).getAnnotations()
      .features[0] as Arrow;

    const toolbar = new TextAnnotationToolbar({ control });
    control.select(added.id);
    vi.advanceTimersByTime(200);

    expect(document.querySelector(".annotation-style-toolbar")).not.toBeNull();
    toolbar.destroy();
  });

  it("shows the plain-Text pill, author cell included, for a non-sticky Text", () => {
    // The author-visibility toggle used to be a sticky-note-only cell (see
    // `StickyNoteContextToolbar`); it now lives on `TextContextToolbar`
    // so any Text annotation - sticky note or not - can show an author line.
    const added = control.add(
      createText(0, 0, 100, 50, "Hello", { fontSize: 18 })
    );
    const text = added.getAnnotations().features[0] as Text;

    const toolbar = new TextAnnotationToolbar({ control });
    control.select(text.id);
    vi.advanceTimersByTime(200);

    expect(document.querySelector(".annotation-style-toolbar")).not.toBeNull();
    expect(
      document.querySelector('[data-tooltip="Show author"]')
    ).not.toBeNull();
    expect(document.querySelector('[data-tooltip="Bold"]')).not.toBeNull();

    toolbar.destroy();
  });

  it("shows the outline (Line Type) cell for a plain Text but not for a sticky note", () => {
    const plainAdded = control.add(createText(0, 0, 100, 50, "Hello"));
    const plain = plainAdded.getAnnotations().features[0] as Text;

    const toolbar = new TextAnnotationToolbar({ control });
    control.select(plain.id);
    vi.advanceTimersByTime(200);

    expect(document.querySelector('[data-tooltip="Line Type"]')).not.toBeNull();

    const sticky = control
      .add(
        createText(0, 0, 160, 160, "", {
          ...defaultTextStyle,
          scaleFontOnResize: true,
          placeholder: "Quick note…"
        })
      )
      .getAnnotations().features[1] as Text;
    control.select(sticky.id);
    vi.advanceTimersByTime(200);

    expect(document.querySelector('[data-tooltip="Line Type"]')).toBeNull();

    toolbar.destroy();
  });

  it("shows the sticky-note pill (with author cell) for a sticky note", () => {
    const added = control.add(
      createText(0, 0, 160, 160, "", {
        ...defaultTextStyle,
        scaleFontOnResize: true,
        placeholder: "Quick note…"
      })
    );
    const text = added.getAnnotations().features[0] as Text;

    const toolbar = new TextAnnotationToolbar({ control });
    control.select(text.id);
    vi.advanceTimersByTime(200);

    expect(
      document.querySelector('[data-tooltip="Show author"]')
    ).not.toBeNull();

    // 5 groups - [Color] [Font, Size] [Bold] [author toggle] [Delete], Font
    // and Size sharing a group with no divider between them - means
    // exactly 4 separators. Not 3 (the author toggle landing with no
    // divider on one side) or 5 (two stacked before Delete), both of which
    // the off-by-one in the sticky toolbar's old insertion index used to
    // produce depending on which side of the split kept the pre-existing
    // separator.
    const pill = document.querySelector(".annotation-style-toolbar")!;
    expect(pill.querySelectorAll(".oa-toolbar-separator").length).toBe(4);

    toolbar.destroy();
  });

  it("shows the outline and delete cells (no text cells) for a selected box", () => {
    const box = control.add(createBox(0, 0, 100, 50)).getAnnotations()
      .features[0] as Box;

    const toolbar = new TextAnnotationToolbar({ control });
    control.select(box.id);
    vi.advanceTimersByTime(200);

    expect(document.querySelector('[data-tooltip="Line Type"]')).not.toBeNull();
    expect(document.querySelector('[data-tooltip="Delete"]')).not.toBeNull();
    expect(document.querySelector('[data-tooltip="Bold"]')).toBeNull();

    toolbar.destroy();
  });

  it("shows the outline and delete cells (no text cells) for a selected arrow", () => {
    const arrow = control.add(createArrow(0, 0, 100, 0)).getAnnotations()
      .features[0] as Arrow;

    const toolbar = new TextAnnotationToolbar({ control });
    control.select(arrow.id);
    vi.advanceTimersByTime(200);

    expect(document.querySelector('[data-tooltip="Line Type"]')).not.toBeNull();
    expect(document.querySelector('[data-tooltip="Delete"]')).not.toBeNull();
    expect(document.querySelector('[data-tooltip="Bold"]')).toBeNull();

    toolbar.destroy();
  });

  it("hides on unselect", () => {
    const added = control.add(createText(0, 0, 100, 50, "Hello"));
    const text = added.getAnnotations().features[0] as Text;

    const toolbar = new TextAnnotationToolbar({ control });
    control.select(text.id);
    vi.advanceTimersByTime(200);
    expect(document.querySelector(".annotation-style-toolbar")).not.toBeNull();

    control.unselect();
    expect(document.querySelector(".annotation-style-toolbar")).toBeNull();

    toolbar.destroy();
  });

  it("Delete cell removes the annotation via control.remove", () => {
    const added = control.add(createText(0, 0, 100, 50, "Hello"));
    const text = added.getAnnotations().features[0] as Text;

    const toolbar = new TextAnnotationToolbar({ control });
    control.select(text.id);
    vi.advanceTimersByTime(200);

    const deleteBtn = document.querySelector<HTMLButtonElement>(
      '[data-tooltip="Delete"]'
    )!;
    deleteBtn.click();

    expect(control.getAnnotation(text.id)).toBeUndefined();

    toolbar.destroy();
  });

  it("Delete cell also unmounts the pill and clears selection (regression: pill used to outlive the deleted annotation)", () => {
    const added = control.add(createText(0, 0, 100, 50, "Hello"));
    const text = added.getAnnotations().features[0] as Text;

    const toolbar = new TextAnnotationToolbar({ control });
    control.select(text.id);
    vi.advanceTimersByTime(200);
    expect(document.querySelector(".annotation-style-toolbar")).not.toBeNull();

    const deleteBtn = document.querySelector<HTMLButtonElement>(
      '[data-tooltip="Delete"]'
    )!;
    deleteBtn.click();

    expect(document.querySelector(".annotation-style-toolbar")).toBeNull();
    expect(control.getSelectedAnnotations().features).toHaveLength(0);

    toolbar.destroy();
  });

  it("hides for a non-editable selection by default", () => {
    const added = control.add(createText(0, 0, 100, 50, "Hello"));
    const text = added.getAnnotations().features[0] as Text;
    control.setOptions({ isEditable: () => false });

    const toolbar = new TextAnnotationToolbar({ control });
    control.select(text.id);
    vi.advanceTimersByTime(200);

    expect(document.querySelector(".annotation-style-toolbar")).toBeNull();

    toolbar.destroy();
  });

  it("hideWhenNotEditable: false keeps the pill open for a non-editable selection", () => {
    const added = control.add(createText(0, 0, 100, 50, "Hello"));
    const text = added.getAnnotations().features[0] as Text;
    control.setOptions({ isEditable: () => false });

    const toolbar = new TextAnnotationToolbar({
      control,
      hideWhenNotEditable: false
    });
    control.select(text.id);
    vi.advanceTimersByTime(200);

    expect(document.querySelector(".annotation-style-toolbar")).not.toBeNull();

    toolbar.destroy();
  });

  it("items transforms the built-in list - reorder, drop, and add by id", () => {
    const added = control.add(createText(0, 0, 100, 50, "Hello"));
    const text = added.getAnnotations().features[0] as Text;

    const toolbar = new TextAnnotationToolbar({
      control,
      items: (defaultItems) => [
        {
          kind: "button",
          id: "lock",
          title: "Lock",
          icon: "circle-dot",
          action: () => {}
        },
        { kind: "separator" },
        ...defaultItems.filter((i) =>
          i.kind === "separator" ? true : i.id !== "delete"
        )
      ]
    });
    control.select(text.id);
    vi.advanceTimersByTime(200);

    const pill = document.querySelector(".annotation-style-toolbar")!;
    const tooltips = Array.from(
      pill.querySelectorAll<HTMLElement>("[data-tooltip]")
    ).map((el) => el.dataset.tooltip);

    expect(tooltips[0]).toBe("Lock");
    expect(tooltips).not.toContain("Delete");

    toolbar.destroy();
  });

  const selectAndWait = (id: string | number) => {
    control.select(id);
    vi.advanceTimersByTime(200);
  };
  const pill = () => document.querySelector(".annotation-style-toolbar");
  const pillTooltips = () =>
    Array.from(
      document.querySelectorAll(".annotation-style-toolbar [data-tooltip]")
    ).map((el) => el.getAttribute("data-tooltip"));

  it("ContextToolbars: `box: false` turns off the box pill only", () => {
    const box = control.add(createBox(0, 0, 100, 50)).getAnnotations()
      .features[0] as Box;
    const text = control.add(createText(200, 0, 100, 50, "Hi")).getAnnotations()
      .features[1] as Text;

    const toolbars = new ContextToolbars({ control, box: false });
    selectAndWait(box.id);
    expect(pill()).toBeNull();
    selectAndWait(text.id);
    expect(pill()).not.toBeNull();
    toolbars.destroy();
  });

  it("ContextToolbars: per-type `items` applies to that type", () => {
    const arrow = control.add(createArrow(0, 0, 100, 0)).getAnnotations()
      .features[0] as Arrow;
    const box = control.add(createBox(0, 100, 100, 50)).getAnnotations()
      .features[1] as Box;

    const toolbars = new ContextToolbars({
      control,
      arrow: { items: (d) => d.filter((i) => i.id !== "delete") }
    });
    selectAndWait(arrow.id);
    expect(pillTooltips()).not.toContain("Delete");
    selectAndWait(box.id);
    expect(pillTooltips()).toContain("Delete");
    toolbars.destroy();
  });

  it("BoxContextToolbar alone shows only for boxes", () => {
    const box = control.add(createBox(0, 0, 100, 50)).getAnnotations()
      .features[0] as Box;
    const text = control.add(createText(200, 0, 100, 50, "Hi")).getAnnotations()
      .features[1] as Text;

    const toolbar = new BoxContextToolbar({ control });
    selectAndWait(text.id);
    expect(pill()).toBeNull();
    selectAndWait(box.id);
    expect(pill()).not.toBeNull();
    toolbar.destroy();
    expect(pill()).toBeNull();
  });

  it("Box pill has a background Color cell; custom colors are shared across pills", () => {
    const [box, text] = control
      .add(createBox(0, 0, 100, 50))
      .add(createText(200, 0, 100, 50, "Hi"))
      .getAnnotations().features as [Box, Text];
    const toolbars = new ContextToolbars({ control });

    selectAndWait(box.id);
    expect(pillTooltips()).toEqual(["Color", "Line Type", "Delete"]);
    const boxSwatch = document.querySelector<HTMLButtonElement>(
      '.oa-toolbar-color-cell .oa-toolbar-swatch-cell[title="#FFE49B"]'
    )!;
    boxSwatch.click();
    expect(
      (control.getAnnotation(box.id) as Box).properties.style?.background
    ).toBe("#FFE49B");

    // "+"-added colors live per Control, so they show on other pills too.
    const customOf = () =>
      Array.from(
        document.querySelectorAll(
          ".oa-toolbar-color-cell .oa-toolbar-swatch-grid-custom .oa-toolbar-swatch-cell"
        )
      ).map((b) => b.getAttribute("title"));
    colorHistoryFor(control).add("#0a0b0c");
    expect(customOf()).toEqual(["#0a0b0c"]);
    selectAndWait(text.id);
    expect(customOf()).toEqual(["#0a0b0c"]);
    toolbars.destroy();
  });

  it("all toolbars share one selection watcher per Control", () => {
    const on = vi.spyOn(control, "on");
    const selectListeners = () =>
      on.mock.calls.filter(([evt]) => evt === "select").length;

    const toolbars = new ContextToolbars({ control });
    expect(selectListeners()).toBe(1);

    // Torn down with its last subscriber, recreated for the next one.
    toolbars.destroy();
    const box = control.add(createBox(0, 0, 100, 50)).getAnnotations()
      .features[0] as Box;
    const boxToolbar = new BoxContextToolbar({ control });
    expect(selectListeners()).toBe(2);
    selectAndWait(box.id);
    expect(pill()).not.toBeNull();
    boxToolbar.destroy();
  });

  it("`filter` narrows which annotations of the type get the pill", () => {
    const [a, b] = control
      .add(createBox(0, 0, 100, 50))
      .add(createBox(200, 0, 100, 50))
      .getAnnotations().features as Box[];

    const toolbar = new BoxContextToolbar({
      control,
      filter: (box) => box.id === a.id
    });
    selectAndWait(b.id);
    expect(pill()).toBeNull();
    selectAndWait(a.id);
    expect(pill()).not.toBeNull();
    toolbar.destroy();
  });

  it("`includeCommentArrows` shows the pill on a comment's arrow", () => {
    const { comment, arrow } = createCommentWithArrow(0, 0, 50, 50);
    control.add(comment);
    control.add(arrow);

    const toolbar = new ArrowContextToolbar({
      control,
      includeCommentArrows: true
    });
    selectAndWait(arrow.id);
    expect(pill()).not.toBeNull();
    toolbar.destroy();
  });

  it("per-type `hideWhenNotEditable` overrides the top-level one", () => {
    const box = control.add(createBox(0, 0, 100, 50)).getAnnotations()
      .features[0] as Box;
    control.setOptions({ isEditable: () => false });

    const hidden = new ContextToolbars({ control });
    selectAndWait(box.id);
    expect(pill()).toBeNull();
    hidden.destroy();
    control.unselect();

    const shown = new ContextToolbars({
      control,
      box: { hideWhenNotEditable: false }
    });
    selectAndWait(box.id);
    expect(pill()).not.toBeNull();
    shown.destroy();
  });

  it("ContextToolbar can be extended for other kinds (polygon)", () => {
    class PolygonToolbar extends ContextToolbar<Polygon> {
      protected matches(a: Annotation): a is Polygon {
        return isPolygon(a);
      }
      protected defaultItems(): ToolbarItem<Polygon>[] {
        return [deleteItem()];
      }
    }
    const polygon = control
      .add(
        createPolygon([
          [
            [0, 0],
            [100, 0],
            [100, 100]
          ]
        ])
      )
      .getAnnotations().features[0] as Polygon;

    const toolbar = new PolygonToolbar({ control });
    selectAndWait(polygon.id);
    expect(pillTooltips()).toEqual(["Delete"]);
    toolbar.destroy();
  });
});

describe("ui/toolbar/cells/dropdown fitPopover", () => {
  const rect = (left: number, top: number, width: number, height: number) =>
    new DOMRect(left, top, width, height);
  const setup = (panelRect: DOMRect, triggerRect: DOMRect) => {
    const trigger = document.createElement("button");
    const panel = document.createElement("div");
    trigger.getBoundingClientRect = () => triggerRect;
    panel.getBoundingClientRect = () => panelRect;
    return { trigger, panel };
  };
  const bounds = rect(0, 0, 500, 500);
  const shiftOf = (panel: HTMLElement) =>
    panel.style.getPropertyValue("--oa-popover-shift");

  it("leaves a panel that fits as is", () => {
    const { trigger, panel } = setup(
      rect(100, 140, 200, 100),
      rect(150, 100, 32, 32)
    );
    fitPopover(trigger, panel, bounds);
    expect(panel.classList.contains("is-up")).toBe(false);
    expect(shiftOf(panel)).toBe("0px");
  });

  it("flips above when it overflows below and fits above", () => {
    const { trigger, panel } = setup(
      rect(100, 440, 200, 100),
      rect(150, 400, 32, 32)
    );
    fitPopover(trigger, panel, bounds);
    expect(panel.classList.contains("is-up")).toBe(true);
  });

  it("stays below when it fits neither way", () => {
    const { trigger, panel } = setup(
      rect(100, 90, 200, 450),
      rect(150, 50, 32, 32)
    );
    fitPopover(trigger, panel, bounds);
    expect(panel.classList.contains("is-up")).toBe(false);
  });

  it("shifts sideways to stay inside", () => {
    const left = setup(rect(-40, 140, 200, 100), rect(0, 100, 32, 32));
    fitPopover(left.trigger, left.panel, bounds);
    expect(shiftOf(left.panel)).toBe("40px");

    const right = setup(rect(400, 140, 200, 100), rect(480, 100, 32, 32));
    fitPopover(right.trigger, right.panel, bounds);
    expect(shiftOf(right.panel)).toBe("-100px");
  });
});

describe("ui/toolbar placement (ContextToolbar)", () => {
  type Point = { x: number; y: number };
  const PILL_WIDTH = 200;
  const PILL_HEIGHT = 40;
  const CONTAINER_WIDTH = 600;
  const CONTAINER_HEIGHT = 600;

  let ogma: Ogma;
  let control: Control;
  let container: HTMLDivElement;
  let placements: Point[];
  let restoreOffsets: () => void;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement("div");
    document.body.appendChild(container);
    ogma = new Ogma({ container, options: { renderer: null } });
    control = new Control(ogma);

    // Record every overlay position the toolbar sets, so tests can read the
    // final placement (Overlay has no getter).
    placements = [];
    const addOverlay = ogma.layers.addOverlay.bind(ogma.layers);
    vi.spyOn(ogma.layers, "addOverlay").mockImplementation((opts) => {
      placements.push(opts.position);
      const overlay = addOverlay(opts);
      const setPosition = overlay.setPosition.bind(overlay);
      overlay.setPosition = (p) => {
        placements.push(p);
        return setPosition(p);
      };
      return overlay;
    });

    // jsdom has no layout: stub pill and container sizes, and make the view
    // transform the identity so screen = graph coordinates.
    const pillOffsets = {
      offsetWidth: PILL_WIDTH,
      offsetHeight: PILL_HEIGHT
    };
    const originals = Object.getOwnPropertyDescriptors(HTMLElement.prototype);
    Object.defineProperties(HTMLElement.prototype, {
      offsetWidth: { configurable: true, get: () => pillOffsets.offsetWidth },
      offsetHeight: { configurable: true, get: () => pillOffsets.offsetHeight }
    });
    Object.defineProperties(container, {
      clientWidth: { configurable: true, value: CONTAINER_WIDTH },
      clientHeight: { configurable: true, value: CONTAINER_HEIGHT }
    });
    vi.spyOn(ogma.view, "graphToScreenCoordinates").mockImplementation(
      (p: Point) => ({ x: p.x, y: p.y })
    );
    restoreOffsets = () => {
      Object.defineProperties(HTMLElement.prototype, {
        offsetWidth: originals.offsetWidth,
        offsetHeight: originals.offsetHeight
      });
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    restoreOffsets();
    try {
      control.destroy();
    } catch {
      // headless mode
    }
    try {
      ogma.destroy();
    } catch {
      // headless mode
    }
    container.remove();
  });

  const mount = (arrow: Arrow) => {
    const added = control.add(arrow).getAnnotations().features[0] as Arrow;
    const toolbar = new ArrowContextToolbar({ control });
    control.select(added.id);
    vi.advanceTimersByTime(200);
    return {
      toolbar,
      pill: document.querySelector<HTMLElement>(".annotation-style-toolbar")!
    };
  };

  it("anchors an arrow's pill above the midpoint of its line", () => {
    const { toolbar } = mount(createArrow(300, 300, 400, 400));
    const zoom = control.getZoom();

    expect(placements.at(-1)!.x).toBeCloseTo(350);
    expect(placements.at(-1)!.y).toBeCloseTo(350 - 12 / zoom);
    toolbar.destroy();
  });

  it("flips the pill below the anchor when there is no room above", () => {
    const { toolbar, pill } = mount(createArrow(200, 20, 300, 20));
    const zoom = control.getZoom();

    expect(pill.classList.contains("is-below")).toBe(true);
    expect(placements.at(-1)!.y).toBeCloseTo(20 + 12 / zoom);
    toolbar.destroy();
  });

  it("shifts the pill horizontally so it stays inside the container", () => {
    const { toolbar, pill } = mount(createArrow(0, 300, 0, 400));

    // Midpoint x = 0, pill is 200px wide, so its left edge is at -100.
    expect(pill.classList.contains("is-below")).toBe(false);
    expect(pill.style.marginLeft).toBe("100px");
    toolbar.destroy();
  });
});
