# Floating Text Toolbar

A small pill that floats above the selected Text annotation or sticky note,
anchored to it (pans, zooms and rotates with the graph) instead of docked to
a screen edge like the [style panel](./style-panel). It lives under the
`@linkurious/ogma-annotations/ui` subpath, same as the panel and the
[toolbar](./toolbar) — importing the main package entry stays headless.

Color, font family, font size, bold, delete — sticky notes additionally get
an author-visibility toggle.

## Installation

Part of the package — no extra install. Import from the `/ui` subpath and
load the shared stylesheet once:

```ts
import { TextAnnotationToolbar } from "@linkurious/ogma-annotations/ui";
import "@linkurious/ogma-annotations/ui/styles.css";
```

## Usage

```ts
import { Control } from "@linkurious/ogma-annotations";
import { TextAnnotationToolbar } from "@linkurious/ogma-annotations/ui";
import "@linkurious/ogma-annotations/ui/styles.css";

const control = new Control(ogma);

const textToolbar = new TextAnnotationToolbar({ control });

// When tearing down:
textToolbar.destroy();
```

It shows itself automatically when exactly one Text annotation is selected
(same selection/debounce behavior as the style panel), and hides on
unselect or drag. Non-Text selections (arrow/box/polygon/comment) are
ignored — those still only get the docked [style panel](./style-panel).
Nothing else to wire up: no `container`, no placement — its position is
computed from the annotation's own geometry.

## Changing the fonts, sizes or color palette

This is the one thing you'll most likely want to change, and it's a single
option each — no subclassing:

```ts
const textToolbar = new TextAnnotationToolbar({
  control,
  fonts: [
    { value: "Georgia, serif", label: "Georgia" },
    { value: "IBM Plex Mono", label: "IBM Plex Mono", style: { fontFamily: "IBM Plex Mono" } },
    { value: "Comic Sans MS", label: "Comic Sans" }
  ],
  fontSizes: [10, 12, 14, 16, 20, 28],
  swatches: [
    { fill: "#FFE49B", stroke: "#D9A926" },
    { fill: "#C7F7EF", stroke: "#8CD9CC" }
  ]
});
```

- **`fonts`** — options shown in the Font-family dropdown. Each is
  `{ value, label, style? }`: `value` is the CSS `font-family` written to
  the annotation's style, `label` the option's text, and the optional
  `style` an inline style hint for how that option previews in the list
  (typically `{ fontFamily: value }`, so e.g. a monospace option actually
  looks monospace). Defaults to `DEFAULT_TOOLBAR_FONTS` — Sans Serif,
  Serif, Monospace, IBM Plex Sans, IBM Plex Mono. As with any font, the
  actual webfont has to be loaded by your page (a `<link>` to Google
  Fonts, `@font-face`, etc.) for it to render as chosen — the toolbar just
  writes the CSS value, same as `defaultTextStyle`/`defaultStickyNoteStyle`
  already do for `"IBM Plex Sans"` elsewhere in this package.
- **`fontSizes`** — plain numbers for the Font-size dropdown. Defaults to
  `DEFAULT_TOOLBAR_FONT_SIZES` (`[12, 14, 16, 18, 24, 32, 48, 64]`).
- **`swatches`** — `{ fill, stroke }` pairs for the color cell's swatch
  grid (`fill` becomes the note's `background`; `stroke` is the swatch's
  ring color). Defaults to `STICKY_SWATCHES`. A "More colors…" entry always
  stays available underneath the grid, opening the full color picker
  regardless of what you pass here — unless you pass `onMoreColors`.

Bring your own color picker instead of the bundled `vanilla-colorful` one
by passing `onMoreColors` — it's called instead of opening the built-in
popover when "More colors…" is clicked, so you can show your own UI (a
native `<input type="color">`, a design-system component, an app-wide
color-picker modal, whatever) and apply the result yourself:

```ts
new TextAnnotationToolbar({
  control,
  onMoreColors: (ctx, anchor) => {
    const current = ctx.getAnnotation().properties.style?.background;
    const input = document.createElement("input");
    input.type = "color";
    input.value = current?.startsWith("#") ? current : "#ffffff";
    input.addEventListener("input", () => {
      ctx.updateStyle({ background: input.value });
    });
    // `anchor` is the "More colors…" button - position your own popover
    // against it if you want to open in the same place the built-in one
    // would have.
    anchor.after(input);
    input.click();
  }
});
```

`ctx` is the same context object every cell action gets — read the current
color from `ctx.getAnnotation().properties.style?.background`, and call
`ctx.updateStyle({ background: ... })` (as many times as you like, e.g.
live while the user drags in your own picker) to apply a pick. The
toolbar's own swatch-grid popover closes right before `onMoreColors` runs
either way, so there's no double-popover to manage.

Import the defaults from `@linkurious/ogma-annotations/ui` if you want to
extend rather than replace them:

```ts
import {
  TextAnnotationToolbar,
  DEFAULT_TOOLBAR_FONTS,
  DEFAULT_TOOLBAR_FONT_SIZES,
  STICKY_SWATCHES
} from "@linkurious/ogma-annotations/ui";

new TextAnnotationToolbar({
  control,
  fonts: [
    ...DEFAULT_TOOLBAR_FONTS,
    { value: "Georgia, serif", label: "Georgia" }
  ]
});
```

## Options

| Option | Type | Description |
| --- | --- | --- |
| `control` | `Control` | The annotation controller to bind to. |
| `fonts` | `ToolbarDropdownOption[]` _(optional)_ | Font-family dropdown options. Defaults to `DEFAULT_TOOLBAR_FONTS`. |
| `fontSizes` | `number[]` _(optional)_ | Font-size dropdown presets. Defaults to `DEFAULT_TOOLBAR_FONT_SIZES`. |
| `swatches` | `Swatch[]` _(optional)_ | Color cell's swatch-grid palette. Defaults to `STICKY_SWATCHES`. |
| `onMoreColors` | `(ctx, anchor: HTMLElement) => void` _(optional)_ | Called instead of opening the built-in color picker when "More colors…" is clicked - hand off to your own picker. |
| `items` | `(defaultItems: ToolbarItem[], ctx) => ToolbarItem[]` _(optional)_ | Full control over the pill's contents - reorder, drop, or add items around the built-in list. See [below](#beyond-fontssizescolors-rearranging-or-replacing-items). |
| `hideWhenNotEditable` | `boolean` _(optional)_ | Whether a selected-but-locked (`isEditable: false`) Text keeps the pill hidden, same as no selection. Defaults to `true`. |

## Methods

| Method | Description |
| --- | --- |
| `destroy()` | Detach all event listeners and remove the toolbar from the DOM. |

## Sticky notes vs. plain Text

A sticky note isn't a separate annotation type — it's a `Text` created via
`control.enableStickyNoteDrawing()`. The toolbar tells them apart with
`isStickyNote()` (exported from the main package entry, next to `isText`)
and shows the extra author-visibility cell only for those. `fonts`/
`fontSizes`/`swatches`/`onMoreColors` apply to both — there's no separate
option set for sticky notes.

The author toggle only flips a `showAuthor` display flag on the
annotation's style for now; it doesn't render an author name anywhere yet
(that format — who, and where it's stored — isn't decided).

## Beyond fonts/sizes/colors: rearranging or replacing items

`fonts`/`fontSizes`/`swatches` cover the common case. For anything more -
drop the Delete button, add a new action, reorder the whole row - pass
`items`. It's called with the built-in list (color, font, font size,
bold, show-author, delete) and returns what actually renders - add,
remove, reorder or replace freely, no subclassing needed:

```ts
const toolbar = new TextAnnotationToolbar({
  control,
  items: (defaultItems, ctx) => [
    ...defaultItems.slice(0, -2), // everything except the trailing separator + Delete
    { kind: "separator" },
    {
      kind: "button",
      title: "Export as SVG",
      icon: "camera",
      action: (c) => exportAnnotationAsSvg(c.getAnnotation())
    }
  ]
});
```

Each built-in entry carries a stable `id` (`"color"`, `"font"`,
`"fontSize"`, `"bold"`, `"showAuthor"`, `"delete"`) so you can address one
without relying on array position - safe even if a later version adds to
or reorders the built-in list:

```ts
items: (defaultItems) => defaultItems.filter((i) => i.id !== "delete")
```

Each entry is one of:

- `{ kind: "button", id?, title, icon, action, isActive?, danger? }` — a
  plain action or toggle button (this is what Bold/Delete/the author
  toggle are).
- `{ kind: "dropdown", id?, title, options, getValue, onSelect, getLabel? }`
  — a "pick one of a list" cell (Font family/Font size).
- `{ kind: "separator" }` — a divider. There's no automatic spacing
  between items - the list controls layout explicitly, dividers included.
- `{ kind: "custom", id?, build: (ctx) => cell }` — an escape hatch for
  anything that doesn't fit the two shapes above: a hand-built
  `ToolbarCell` (`element`/`update()`/`destroy()`). The color cell (a
  swatch grid opening a secondary picker popover) uses this.

`icon` is any name from the shared icon set (`IconName`, exported from
`@linkurious/ogma-annotations/ui`) — the same hand-copied SVG paths used
throughout the panel and toolbar, no icon font required. For anything
else (like a lock glyph, in the example below) build the cell's own
`<svg>` inline instead - see `kind: "custom"`.

`items` covers everything a `TextStyleToolbar` subclass used to be needed
for. Subclassing (override `getItems()`) still works and is only worth
reaching for if you're also changing the class's behavior beyond its item
list - `items` is the right tool for "different buttons," not a smaller
version of subclassing.

### Worked example: a "lock" button that blocks drag/edit and greys out the rest

`isEditable(annotation)` (a `Control` option) decides whether an
annotation can be dragged, resized, restyled, text-edited, deleted or
re-linked - this is the actual enforcement; the toolbar only decides
what's shown.

**Keep the locked-ids set outside the annotation's own data - don't try
to store it as an annotation field.** `isEditable` gates *every* write
that goes through `control.update()`/`updateStyle()`, evaluated against
the annotation's state *before* that write applies - so a `locked` flag
living inside `properties` could never unlock itself: the very call that
sets `locked: false` would already be vetoed, since at the moment it
runs the annotation is still locked. (Worth confirming yourself before
relying on it - `control.update({ id, properties: { locked: false } })`
against an annotation whose `isEditable` currently returns `false` logs
`Cannot update annotation <id>: not editable` and is a no-op.) A plain
`Map`, read by the predicate and written directly by the lock button,
sidesteps the gate entirely and still applies uniformly across every
annotation type - Text, Arrow, Box, Polygon, Comment alike, not just
`TextStyle`:

```ts
import type { Id } from "@linkurious/ogma-annotations";

const locked = new Map<Id, boolean>();

control.setOptions({
  isEditable: (annotation) => !locked.get(annotation.id)
});
```

The button. Nothing here changes annotation data, so nothing else
triggers a re-render on its own - the click handler refreshes the
button (and the grey-out class) itself, right after mutating `locked`:

```ts
import type { ToolbarCell, ToolbarCellContext } from "@linkurious/ogma-annotations/ui";
import type { Id } from "@linkurious/ogma-annotations";

const LOCK_ICON =
  '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>';

class LockCell implements ToolbarCell {
  readonly element = document.createElement("button");

  constructor(private ctx: ToolbarCellContext) {
    this.element.type = "button";
    // oa-lock-button is a hook for the CSS below, not a styling class of
    // its own - oa-toolbar-button is what actually makes it look right.
    this.element.className = "oa-toolbar-button oa-lock-button";
    this.element.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${LOCK_ICON}</svg>`;
    this.element.addEventListener("click", this.onClick);
  }

  private onClick = () => {
    const id = this.ctx.getAnnotation().id;
    locked.set(id, !locked.get(id));
    this.refresh(id);
  };

  update(annotation: { id: Id }) {
    this.refresh(annotation.id);
  }

  private refresh(id: Id) {
    const isLocked = locked.get(id) === true;
    this.element.classList.toggle("active", isLocked);
    this.element.dataset.tooltip = isLocked ? "Unlock" : "Lock";
    // Grey out every other cell in the pill - see the CSS below.
    this.element.closest(".annotation-style-toolbar")?.classList.toggle("locked", isLocked);
  }

  destroy() {
    this.element.removeEventListener("click", this.onClick);
  }
}
```

```css
/* Every direct child of the pill except the lock button and dividers -
   covers Bold/Delete/the color swatch/the Font dropdowns alike, whatever
   kind of cell they are, since they're all direct children of the same
   row. */
.annotation-style-toolbar.locked > *:not(.oa-lock-button):not(.oa-toolbar-separator) {
  opacity: 0.4;
  pointer-events: none;
}
```

Wire it together with `items` and `hideWhenNotEditable: false` - the
latter is what keeps the pill open (greyed out) on a locked selection
instead of disappearing, which is the default (matches the docked
[style panel](./style-panel)'s behavior too):

```ts
const toolbar = new TextAnnotationToolbar({
  control,
  hideWhenNotEditable: false,
  items: (defaultItems, ctx) => [
    { kind: "custom", id: "lock", build: () => new LockCell(ctx) },
    { kind: "separator" },
    ...defaultItems
  ]
});
```

That's the whole feature - no subclass, no custom show/hide wiring. The
docked `AnnotationPanel` takes the same `hideWhenNotEditable` option if
you want a locked annotation's panel to behave the same way there.

## Theming

The pill uses its own `--oa-toolbar-*` CSS custom properties, alongside the
`--oa-accent` token shared with the [style panel](./style-panel#theming)
and [toolbar](./toolbar#theming):

```css
.annotation-style-toolbar {
  --oa-accent: #0aa;
  --oa-toolbar-bg: #fff;
  --oa-toolbar-radius: 12px;
  --oa-toolbar-shadow: 0 2px 4px rgba(0, 0, 0, 0.12);
  --oa-toolbar-divider: #d5d7da;
  --oa-toolbar-tooltip-bg: #303030;
  --oa-toolbar-tooltip-fg: #fff;
}
```

## See Also

- [Style Panel](./style-panel) — the docked, all-annotation-types editing panel
- [Toolbar](./toolbar) — the drawing/undo-redo toolbar
- [Text Styles](../styling/text-styles) — the underlying `TextStyle` properties
