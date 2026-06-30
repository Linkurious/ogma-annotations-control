# Ready-made Style Panel

The core package ships a styled, framework-agnostic style panel so you don't
have to build one by hand. It lives under the `@linkurious/ogma-annotations/ui`
subpath and is completely optional — importing the main package entry stays
headless and pulls in none of this code or CSS.

## Installation

The panel is part of the package — no extra install. Import it from the `/ui`
subpath and load the stylesheet once:

```ts
import { AnnotationPanel } from "@linkurious/ogma-annotations/ui";
import "@linkurious/ogma-annotations/ui/styles.css";
```

::: tip Why a separate subpath?
Keeping the UI on `/ui` means consumers who only want the headless editor pay
nothing for the styled panel or its CSS. The icons are inline SVG, so there is
no icon font to wire up.
:::

## Usage

Create the panel with your `Control` instance. The panel wires itself to the
control's selection events: it appears when a single annotation is selected
(after the click/drag settles) and hides otherwise. It creates and manages its
own DOM inside the container you give it (defaulting to `document.body`).

```ts
import { Control } from "@linkurious/ogma-annotations";
import { AnnotationPanel } from "@linkurious/ogma-annotations/ui";
import "@linkurious/ogma-annotations/ui/styles.css";

const control = new Control(ogma);

const panel = new AnnotationPanel({
  control,
  container: document.getElementById("app")! // optional, defaults to document.body
});

// When tearing down:
panel.destroy();
```

<img src="/ui/vanilla-panel.png" alt="The vanilla style panel showing color, background, font and stroke controls for a selected annotation" />

The panel renders the right controls for the selected annotation type:

- **Arrow** — color, head/tail extremities, stroke width, line type.
- **Text / Box / Comment** — color, background, font, font size, stroke width,
  line type.
- **Polygon** — color, fill, stroke width, line type.

Editing a control calls `control.updateStyle(...)` for the selected annotation,
so changes flow through the normal update path (including undo/redo).

## Options

| Option | Type | Description |
| --- | --- | --- |
| `control` | `Control` | The annotation controller to bind to. |
| `container` | `HTMLElement` _(optional)_ | Element the panel mounts into. Defaults to `document.body`. |

## Methods

| Method | Description |
| --- | --- |
| `show()` | Show the panel. |
| `hide()` | Hide the panel and close any open color picker. |
| `destroy()` | Detach all event listeners and remove the panel from the DOM. |

## Theming

The stylesheet is driven by CSS custom properties. Override them on the panel
(or any ancestor) to restyle without forking the CSS — the defaults preserve the
out-of-the-box look:

```css
.annotation-panel {
  --oa-accent: #0aa; /* active state, selected option, slider thumb, etc. */
  --oa-panel-bg: #fff;
  --oa-panel-radius: 10px;
  --oa-control-bg: #eee;
  --oa-text-color: #333;
  --oa-muted-color: #666;
}
```

The accent also falls back to a legacy `--brand` variable if you already set
one in your app.

## Building your own

The `/ui` subpath also exports the building blocks the panel uses, so you can
assemble a custom panel or reuse pieces:

- `BACKGROUNDS`, `FONTS`, `EXTREMITY_OPTIONS`, `LINE_TYPES` — the option config.
- `initialRecentColors`, `withColorFromAnnotation`, `rgbaToString` — recent-color
  state helpers.
- `svgIcon`, `ICON_PATHS`, `IconName` — the inline SVG icon set.
- `attachPanelVisibility(control, { onShow, onHide })` — the selection → show/hide
  state machine the panel is built on. Returns a `detach()` cleanup function.
