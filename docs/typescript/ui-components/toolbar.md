# Ready-made Toolbar

The core package ships a styled, framework-agnostic drawing/undo-redo toolbar
so you don't have to build one by hand. It lives under the
`@linkurious/ogma-annotations/ui` subpath alongside the
[style panel](./style-panel) and is completely optional — importing the main
package entry stays headless and pulls in none of this code or CSS.

<img src="/ui/vanilla-toolbar.png" alt="The vanilla AnnotationToolbar with arrow, comment, box, text, polygon, undo, redo and delete buttons" />

## Installation

The toolbar is part of the package — no extra install. Import it from the
`/ui` subpath and load the stylesheet once (the same one the style panel
uses):

```ts
import { AnnotationToolbar } from "@linkurious/ogma-annotations/ui";
import "@linkurious/ogma-annotations/ui/styles.css";
```

## Usage

Create the toolbar with your `Control` instance. It builds its own buttons and
manages its own DOM inside the container you give it (defaulting to
`document.body`).

```ts
import { Control } from "@linkurious/ogma-annotations";
import { AnnotationToolbar } from "@linkurious/ogma-annotations/ui";
import "@linkurious/ogma-annotations/ui/styles.css";

const control = new Control(ogma);

const toolbar = new AnnotationToolbar({
  control,
  container: document.getElementById("app")!, // optional, defaults to document.body
  onJsonExport: () => exportAnnotationsAsJson(control.getAnnotations()),
  onSvgExport: () => exportGraphAsSvg()
});

// When tearing down:
toolbar.destroy();
```

The toolbar provides buttons for:

- **Add arrow, comment, box, text, polygon** — each arms the matching
  `control.enable*Drawing()` call and marks its own button active until
  drawing completes or is cancelled.
- **Undo / redo** — disabled automatically based on `control.canUndo()` /
  `control.canRedo()`, tracking the `history` event.
- **Delete** — removes the current selection; a no-op if nothing is selected.
- **Export (optional)** — a JSON and/or SVG export button appear only when you
  pass the corresponding callback.

## Options

| Option | Type | Description |
| --- | --- | --- |
| `control` | `Control` | The annotation controller to bind to. |
| `container` | `HTMLElement` _(optional)_ | Element the toolbar mounts into. Defaults to `document.body`. |
| `placement` | `PanelPlacement` _(optional)_ | Which screen edge/corner the toolbar docks to. Defaults to `"bottom"`. |
| `orientation` | `PanelOrientation` _(optional)_ | `"horizontal"` (default) or `"vertical"`. |
| `enabledTypes` | `ToolbarDrawingType[]` _(optional)_ | Which drawing tools to show, and in what order. Defaults to all five: `["arrow", "comment", "box", "text", "polygon"]`. |
| `styles` | `AnnotationToolbarStyles` _(optional)_ | Per-type default style overrides for the drawing tool buttons. |
| `onJsonExport` | `() => void` _(optional)_ | Show a JSON export button that calls this. |
| `onSvgExport` | `() => void` _(optional)_ | Show an SVG export button that calls this. |

## Methods

| Method | Description |
| --- | --- |
| `setPlacement(placement)` | Change which edge/corner the toolbar docks to at runtime. |
| `setOrientation(orientation)` | Switch between horizontal and vertical layout at runtime. |
| `destroy()` | Detach all event listeners and remove the toolbar from the DOM. |

## Layout

The toolbar shares the style panel's placement/orientation system (see
[Style Panel → Layout](./style-panel#layout)) — same `PanelPlacement` /
`PanelOrientation` types, same `data-placement`/`data-orientation` attributes,
just defaulting to `"bottom"` / `"horizontal"` instead of the panel's
`"right"` / `"vertical"`, since a bottom-docked horizontal bar is the natural
home for drawing tools:

```ts
const toolbar = new AnnotationToolbar({
  control,
  placement: "left",
  orientation: "vertical"
});

toolbar.setPlacement("top-right");
```

Panel and toolbar can be docked independently — pick different corners/edges
for each, or point both at a shared `container` so neither collides with the
rest of your UI.

## Restricting tools and overriding defaults

By default every drawing tool is shown, styled in the brand purple used
throughout the demos. Both can be customized:

```ts
const toolbar = new AnnotationToolbar({
  control,
  // Only these two tools, in this order:
  enabledTypes: ["arrow", "text"],
  // Override per-type defaults - anything you don't set keeps the built-in
  // default (color, width, etc.):
  styles: {
    arrow: { strokeColor: "#0aa", strokeWidth: 3 },
    text: { font: "Georgia", fontSize: 18 },
    comment: {
      offsetX: 100,
      offsetY: -80,
      commentStyle: { style: { background: "#fff3cd" } }
    }
  }
});
```

`styles` only overrides the properties you pass — the rest of each tool's
built-in defaults still apply. This is separate from the package-level
`defaultArrowStyle` / `defaultTextStyle` / etc. singletons (see
[Arrow Styles](../styling/arrow-styles) and
[Text Styles](../styling/text-styles)): those are global fallbacks used when
*no* style value is given anywhere; `styles` here is scoped to this one
toolbar instance and always wins for the keys it sets.

## Theming

The toolbar uses the same `--oa-*` CSS custom properties as the
[style panel](./style-panel#theming) — override them once and both pick up
the change:

```css
.annotation-toolbar {
  --oa-accent: #0aa;
  --oa-panel-bg: #fff;
  --oa-panel-radius: 10px;
  --oa-control-bg: #eee;
  --oa-muted-color: #666;
}
```

## See Also

- [Style Panel](./style-panel) — the companion editing panel
- [Interactive Creation](../creating-annotations/interactive) — the drawing
  methods the toolbar's buttons call
- [TypeScript State Management](../managing/modification) — undo/redo details
