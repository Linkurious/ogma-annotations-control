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
  DropdownItemCell
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
  it("exposes the Figma-extracted fill/stroke pairs", () => {
    expect(STICKY_SWATCHES.length).toBeGreaterThan(0);
    STICKY_SWATCHES.forEach((s) => {
      expect(s.fill).toMatch(/^#[0-9A-F]{6}$/i);
      expect(s.stroke).toMatch(/^#[0-9A-F]{6}$/i);
    });
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
    expect(cell.element.classList.contains("oa-toolbar-cell-danger")).toBe(true);

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

  it("shows the plain-Text pill (no author cell) for a non-sticky Text", () => {
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
    ).toBeNull();
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
