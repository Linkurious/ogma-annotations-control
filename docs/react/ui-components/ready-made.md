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

## Components

### `AnnotationPanelController`

A turnkey style panel. It listens to the editor's selection and shows the
[`AnnotationPanel`](#annotationpanel) for the selected annotation, hiding it
during drags and when nothing is selected. No props.

```tsx
<AnnotationPanelController />
```

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

### `AddMenu`

The drawing toolbar: buttons for arrow, comment, box, text and polygon, plus
undo / redo and delete. Optional export buttons appear only when you pass the
corresponding callback.

| Prop | Type | Description |
| --- | --- | --- |
| `onJsonExport` | `() => void` _(optional)_ | Show a JSON export button that calls this. |
| `onSvgExport` | `() => void` _(optional)_ | Show an SVG export button that calls this. |

```tsx
<AddMenu onJsonExport={exportJson} onSvgExport={exportSvg} />
```

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
