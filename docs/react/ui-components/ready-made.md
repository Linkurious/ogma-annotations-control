# Ready-made UI Components

The React package ships a set of styled, themeable UI components so you don't
have to build a toolbar and style panel from scratch. They live under the
`@linkurious/ogma-annotations-react/ui` subpath and are completely optional —
importing the main package entry stays headless and pulls in none of this code
or CSS.

> Prefer to build your own? See [Building a Toolbar](./toolbar),
> [Building a Style Panel](./style-panel) and
> [Annotation List](./annotation-list). The ready-made components are built on
> the same `useAnnotationsContext` hook, so you can mix and match.

## Installation

The components are part of the package — no extra install. Import them from the
`/ui` subpath and load the stylesheet once in your app:

```tsx
import {
  AnnotationPanelController,
  AddMenu,
  ViewControls
} from "@linkurious/ogma-annotations-react/ui";

// Load once, e.g. in your entry file:
import "@linkurious/ogma-annotations-react/ui/styles.css";
```

::: tip Why a separate subpath?
Keeping the UI on `/ui` means consumers who only want the headless editor pay
nothing for the styled components or their CSS. The icons are inline SVG, so
there is no icon font or extra icon dependency to wire up.
:::

## Putting it together

Drop the components inside an `AnnotationsContextProvider` (see
[the provider docs](../core-concepts/provider)):

```tsx
import { Ogma } from "@linkurious/ogma-react";
import { AnnotationsContextProvider } from "@linkurious/ogma-annotations-react";
import {
  AnnotationPanelController,
  AddMenu,
  ViewControls
} from "@linkurious/ogma-annotations-react/ui";
import "@linkurious/ogma-annotations-react/ui/styles.css";

export function Editor({ graph }) {
  return (
    <Ogma graph={graph}>
      <AnnotationsContextProvider>
        {/* Toolbar: add arrow/text/box/polygon/comment, undo/redo, delete */}
        <AddMenu />

        {/* Center / rotate the view */}
        <ViewControls />

        {/* Style panel that follows the current selection */}
        <AnnotationPanelController />
      </AnnotationsContextProvider>
    </Ogma>
  );
}
```

That's a full editor: a drawing toolbar, view controls, and a style panel that
appears when you select an annotation and lets you edit color, background,
font, line type, stroke width, and arrow extremities.

<img src="/ui/react-editor.png" alt="The ready-made editor: AddMenu toolbar, ViewControls, and the style panel over an annotated graph" />

## Components

### `AnnotationPanelController`

A turnkey style panel. It listens to the editor's selection and shows the
[`AnnotationPanel`](#annotationpanel) for the selected annotation, hiding it
during drags and when nothing is selected.

| Prop | Type | Description |
| --- | --- | --- |
| `placement` | `PanelPlacement` _(optional)_ | Which screen edge/corner the panel docks to. Defaults to `"right"`. |
| `orientation` | `PanelOrientation` _(optional)_ | `"vertical"` (default) or `"horizontal"`. |

```tsx
<AnnotationPanelController placement="top-right" orientation="horizontal" />
```

<div style="display: flex; gap: 16px; flex-wrap: wrap; align-items: flex-start;">
  <figure style="margin: 0;">
    <img src="/ui/panel-arrow.png" alt="Style panel for a selected arrow: color, extremities, stroke width, line type" style="max-width: 240px;" />
    <figcaption>Arrow selected</figcaption>
  </figure>
  <figure style="margin: 0;">
    <img src="/ui/panel-text.png" alt="Style panel for selected text: color, background, font, font size, stroke width, line type" style="max-width: 240px;" />
    <figcaption>Text selected</figcaption>
  </figure>
</div>

If you want to control rendering yourself, use the `useAnnotationPanel` hook,
which returns the current `annotation` and `visible` state:

```tsx
import { useAnnotationPanel, AnnotationPanel } from "@linkurious/ogma-annotations-react/ui";

function MyPanel() {
  const { annotation, visible } = useAnnotationPanel();
  return <AnnotationPanel visible={visible} annotation={annotation} />;
}
```

### `AnnotationPanel`

The presentational style panel. Renders the right set of controls for the given
annotation type (arrow, text/box/comment, or polygon). You normally render it
via `AnnotationPanelController`, but you can drive it directly.

| Prop | Type | Description |
| --- | --- | --- |
| `annotation` | `Annotation \| null` | The annotation to edit. |
| `visible` | `boolean` | Whether the panel is shown. |
| `placement` | `PanelPlacement` _(optional)_ | Which screen edge/corner the panel docks to. Defaults to `"right"`. |
| `orientation` | `PanelOrientation` _(optional)_ | `"vertical"` (default) or `"horizontal"`. |

`PanelPlacement` is one of `"left"`, `"right"` (default), `"top"`, `"bottom"`,
`"top-left"`, `"top-right"`, `"bottom-left"`, `"bottom-right"` — applied as a
`data-placement` attribute and handled entirely in CSS, same as the vanilla
[`AnnotationPanel`](/typescript/ui-components/style-panel#layout) it wraps.
`AddMenu` doesn't yet support the same docking system (its position is left to
your own CSS); the vanilla-only [`AnnotationToolbar`](/typescript/ui-components/toolbar)
does.

### `AddMenu`

The drawing toolbar: buttons for arrow, comment, box, text and polygon, plus
undo / redo and delete. Optional export buttons appear only when you pass the
corresponding callback.

<img src="/ui/add-menu.png" alt="AddMenu toolbar with drawing, history, delete and export buttons" />

| Prop | Type | Description |
| --- | --- | --- |
| `enabledTypes` | `ToolbarDrawingType[]` _(optional)_ | Which drawing tools to show, and in what order. Defaults to all five: `["arrow", "comment", "box", "text", "polygon"]`. |
| `styles` | `AnnotationToolbarStyles` _(optional)_ | Per-type default style overrides for the drawing tool buttons. |
| `onJsonExport` | `() => void` _(optional)_ | Show a JSON export button that calls this. |
| `onSvgExport` | `() => void` _(optional)_ | Show an SVG export button that calls this. |

```tsx
<AddMenu onJsonExport={exportJson} onSvgExport={exportSvg} />
```

Restrict the tools shown and override their default styles - only the
properties you set change, everything else keeps its built-in default:

```tsx
<AddMenu
  enabledTypes={["arrow", "text"]}
  styles={{
    arrow: { strokeColor: "#0aa", strokeWidth: 3 },
    text: { font: "Georgia", fontSize: 18 }
  }}
/>
```

`ToolbarDrawingType` and `AnnotationToolbarStyles` come from
`@linkurious/ogma-annotations/ui` — the same types the vanilla
[`AnnotationToolbar`](/typescript/ui-components/toolbar#restricting-tools-and-overriding-defaults)
uses.

### `ViewControls`

Center-view and rotate-view buttons. Uses the Ogma instance from context; no
props.

### Field controllers

The panel is composed from small controllers you can reuse to build a custom
panel: `ColorController`, `BackgroundController`, `FontController`,
`ExtremityController`, `SliderController`, `LineTypeController`. Each takes the
target `annotation` and renders one section.

### `Icon`

The inline-SVG icon used throughout the components, in case you want to match
the look in your own UI.

| Prop | Type | Description |
| --- | --- | --- |
| `name` | `IconName` | One of the shared icon names. |
| `size` | `number` _(optional, default 18)_ | Width/height in px. |
| `rotate` | `boolean` _(optional)_ | Rotate 180°. |
| `className` | `string` _(optional)_ | Extra class. |

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
