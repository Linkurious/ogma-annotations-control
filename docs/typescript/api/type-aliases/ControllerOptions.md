# Type Alias: ControllerOptions

```ts
type ControllerOptions = object;
```

Options for the annotations control

## Properties

### authorStyle?

```ts
optional authorStyle: Partial<AuthorLineStyle>;
```

Editor-wide default style for every Text annotation's author line. Only
applied when an annotation's `style.showAuthor` is true and
`properties.author` is set; a given field here is overridden by that
annotation's own `style.authorStyle` if set (see `TextStyle.authorStyle`).

***

### detectMargin

```ts
detectMargin: number;
```

The margin in which the Texts are detected when looking for magnet points

***

### editButtonIcon

```ts
editButtonIcon: string;
```

SVG icon for the edit button in text editor
Should be a complete SVG string (e.g., '<svg>...</svg>')

***

### isEditable()

```ts
isEditable: (annotation) => boolean;
```

Called to decide whether an annotation can be dragged, resized, restyled,
text-edited, deleted, or re-linked. Defaults to always `true`. Selection
(click to highlight, `getSelectedAnnotations()`) is unaffected - a
non-editable annotation stays fully selectable, just not mutable.

Keep this cheap and synchronous - it can run once per affected
annotation on every relevant edit attempt. To react to a change that
isn't reflected in the annotation's own data (e.g. a host-side
"read-only mode" toggle), call `control.setOptions({ isEditable })`
again with a new function reference - passing the same reference is a
no-op.

#### Parameters

##### annotation

[`Annotation`](Annotation.md)

#### Returns

`boolean`

***

### isVisible()

```ts
isVisible: (annotation) => boolean;
```

Called to decide whether an annotation is rendered (including in SVG
export) and hit-testable (hover/select/drag via the mouse). Defaults to
always `true`. A hidden annotation stays fully present in
`getAnnotations()`, `getAnnotation()`, and `getSelectedAnnotations()` -
visibility only controls what's drawn and clickable, not data access.

Keep this cheap and synchronous - it can run once per annotation on
every render pass while the view is changing (drag, pan, zoom). Same
reactivity note as `isEditable` applies to changing this after the fact.

#### Parameters

##### annotation

[`Annotation`](Annotation.md)

#### Returns

`boolean`

***

### magnetHandleRadius

```ts
magnetHandleRadius: number;
```

Display size of the magnet point

***

### magnetRadius

```ts
magnetRadius: number;
```

The radius in which arrows are attracted

***

### maxArrowHeight

```ts
maxArrowHeight: number;
```

Maximum height of the arrow in units

***

### minArrowHeight

```ts
minArrowHeight: number;
```

Minimum height of the arrow in units

***

### minReadableFontSize

```ts
minReadableFontSize: number;
```

Minimum on-screen font size, in pixels, for a scalable (non-fixedSize)
Text annotation's content or author line to actually be rendered.
Below this, the text is skipped entirely (the box/background still
renders) - avoids illegible sub-pixel text and the layout work that
produces it. Ignored for `fixedSize` text (its on-screen size never
shrinks with zoom) and during SVG/PNG export (export always renders
in full, same as viewport culling). Set to 0 to disable.

***

### sendButtonIcon

```ts
sendButtonIcon: string;
```

SVG icon for the send button in text editor
Should be a complete SVG string (e.g., '<svg>...</svg>')

***

### showEditButton

```ts
showEditButton: boolean;
```

Show edit button in text editor

***

### showSendButton

```ts
showSendButton: boolean;
```

Show send button in text editor

***

### textPlaceholder

```ts
textPlaceholder: string;
```

Placeholder for the text input
