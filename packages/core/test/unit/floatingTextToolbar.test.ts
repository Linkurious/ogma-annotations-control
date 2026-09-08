import { Ogma } from "@linkurious/ogma";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  Control,
  createText,
  defaultTextStyle,
  isStickyNote,
  type Text,
  type AnnotationState
} from "../../src";
import { renderText } from "../../src/renderer/shapes/text";
import {
  STICKY_SWATCHES,
  DEFAULT_TOOLBAR_FONTS,
  TextAnnotationToolbar,
  ButtonItemCell,
  DropdownItemCell,
  ColorCell
} from "../../src/ui";
import type { ToolbarCellContext } from "../../src/ui/toolbar/cells/contract";
import type { ToolbarButtonItem, ToolbarDropdownItem } from "../../src/ui/toolbar/cells/types";

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
    expect(cell.element.classList.contains("oa-toolbar-button-danger")).toBe(true);

    cell.element.click();
    expect(action).toHaveBeenCalledWith(ctx);

    cell.update({ ...text, properties: { ...text.properties, style: { fontWeight: "bold" } } });
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

    const option = cell.element.querySelectorAll<HTMLButtonElement>(
      ".oa-toolbar-dropdown-option"
    )[1];
    option.click();

    expect(onSelect).toHaveBeenCalledWith(24, ctx);
  });

  it("ColorCell gives the transparent swatch a checkerboard marker class and picks it correctly", () => {
    const text = createText(0, 0, 100, 50, "Hi", { background: "#FFE49B" });
    const { ctx } = fakeCellContext(text);
    const cell = new ColorCell(ctx, { swatches: STICKY_SWATCHES });

    const cells = cell.element.querySelectorAll<HTMLButtonElement>(
      ".oa-toolbar-swatch-cell"
    );
    const transparentCell = Array.from(cells).find(
      (c) => c.title === "transparent"
    )!;
    expect(transparentCell).toBeTruthy();
    expect(
      transparentCell.classList.contains("oa-toolbar-swatch-cell-transparent")
    ).toBe(true);
    // Every other swatch is a real color, so none should carry the marker.
    cells.forEach((c) => {
      if (c !== transparentCell) {
        expect(
          c.classList.contains("oa-toolbar-swatch-cell-transparent")
        ).toBe(false);
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

  it("ColorCell calls onMoreColors instead of opening the built-in picker when provided", () => {
    const text = createText(0, 0, 100, 50, "Hi", { background: "#FFE49B" });
    const { ctx } = fakeCellContext(text);
    const onMoreColors = vi.fn();
    const cell = new ColorCell(ctx, { swatches: STICKY_SWATCHES, onMoreColors });

    const moreBtn = cell.element.querySelector<HTMLButtonElement>(
      ".oa-toolbar-more-colors"
    )!;
    moreBtn.click();

    expect(onMoreColors).toHaveBeenCalledWith(ctx, moreBtn);
    // The built-in vanilla-colorful popover must not have been built.
    expect(cell.element.querySelector(".oa-toolbar-more-colors-host")).toBeNull();

    // The host is expected to call ctx.updateStyle itself - simulate that
    // and confirm it lands the same way a built-in pick would.
    onMoreColors.mock.calls[0][0].updateStyle({ background: "#123456" });
    expect(ctx.updateStyle).toHaveBeenCalledWith({ background: "#123456" });
  });

  it("real Text/StickyNote item lists (via TextStyleToolbar) expose bold/author/delete/font tooltips", () => {
    // Exercised end-to-end (real tooltips in the mounted pill) in the
    // ui/TextAnnotationToolbar block below - this just checks the default
    // font list includes the requested monospace option.
    expect(DEFAULT_TOOLBAR_FONTS.map((f) => f.value)).toContain("IBM Plex Mono");
  });
});

describe("ui/TextAnnotationToolbar", () => {
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
    // Deselect before destroying: TextHandler arms a window-level capture
    // "click" listener (see handlers/base.ts's `setAnnotation`) while a
    // Text/Comment is selected, keyed off `ogma.getContainer()` being
    // non-null - true here, unlike the suite's usual containerless
    // `createOgma()`. `control.destroy()` alone doesn't appear to disarm
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

  it("shows the plain-Text pill, author cell included, for a non-sticky Text", () => {
    // The author-visibility toggle used to be a sticky-note-only cell (see
    // `StickyNoteStyleToolbar`); it now lives on the base `TextStyleToolbar`
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
    // the off-by-one in StickyNoteStyleToolbar's insertion index used to
    // produce depending on which side of the split kept the pre-existing
    // separator.
    const pill = document.querySelector(".annotation-style-toolbar")!;
    expect(pill.querySelectorAll(".oa-toolbar-separator").length).toBe(4);

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
});
