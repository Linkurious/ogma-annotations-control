# Function: isStickyNote()

```ts
function isStickyNote(a): boolean;
```

Heuristic "is this Text a sticky note" check. Sticky notes are not a
distinct annotation type - they're `Text` created via
`Control.enableStickyNoteDrawing()` with `defaultStickyNoteStyle` (see
`api/drawing.ts`) - so there is no dedicated marker to check yet.

Checks two of that preset's characteristic style values rather than just
`scaleFontOnResize` alone: that flag's own doc comment above notes it's
"only set by defaultStickyNoteStyle", but a host app is free to set it
manually on a plain Text too, so pairing it with `placeholder` (which -
unlike `content` - never gets cleared by typing) cuts down on that
false-positive risk. Still a heuristic: a host that overrides
`styles.stickyNote.placeholder` when calling `enableStickyNoteDrawing`/
`AnnotationToolbar` will miss here.

Kept as a single function (not inlined at each call site) so swapping in
a dedicated marker later - e.g. a `style.preset` field - is a one-place
change.

## Parameters

### a

[`Text`](../interfaces/Text.md)

## Returns

`boolean`
