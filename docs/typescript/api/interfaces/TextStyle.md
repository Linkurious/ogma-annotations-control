# Interface: TextStyle

Styles specific to box annotations.

## Extends

- [`BoxStyle`](BoxStyle.md)

## Extended by

- [`CommentStyle`](CommentStyle.md)

## Properties

### authorStyle?

```ts
optional authorStyle: Partial<AuthorLineStyle>;
```

Per-annotation override for the author line's appearance. Overrides
the global `ControllerOptions.authorStyle` for this annotation only -
same precedence pattern as `placeholder` vs
`ControllerOptions.textPlaceholder`. Falls back to a small built-in
default (`DEFAULT_AUTHOR_STYLE` in `renderer/shapes/text.ts`) for any
field neither this nor the global option sets.

***

### background?

```ts
optional background: string;
```

background color: empty for transparent #f00, yellow...

### borderRadius?

```ts
optional borderRadius: number;
```

Text box border radius

### boxShadow?

```ts
optional boxShadow: string;
```

box shadow in CSS format, e.g. "0px 4px 6px rgba(0, 0, 0, 0.1)"

### color?

```ts
optional color: string;
```

text color: #f00, yellow...

***

### fixedSize?

```ts
optional fixedSize: boolean;
```

When true, text maintains constant size regardless of zoom level

***

### font?

```ts
optional font: string;
```

Helvetica, sans-serif...

***

### fontScale?

```ts
optional fontScale: number;
```

Accumulated multiplier applied to fontSize at render time:
effectiveFontSize = fontSize * (fontScale ?? 1). Updated incrementally
by TextHandler's corner/edge drag when scaleFontOnResize is true;
absent (≡ 1) for every annotation that doesn't opt in.

***

### fontSize?

```ts
optional fontSize: string | number;
```

Font size, in pixels

***

### fontWeight?

```ts
optional fontWeight: "normal" | "bold";
```

Bold the rendered/edited text. Absent (≡ "normal") for every
annotation that doesn't opt in - no italic, no other weights for v1.

***

### padding?

```ts
optional padding: number;
```

padding around the text

### placeholder?

```ts
optional placeholder: string;
```

Ghost text shown (via the textarea's native `placeholder` attribute)
while `content` is empty - disappears the instant the user types, no
selection/focus tricks needed. Overrides the global
`ControllerOptions.textPlaceholder` for this annotation.

***

### scaled?

```ts
optional scaled: boolean;
```

if true, the box scales with zoom. Default is true

### scaleFontOnResize?

```ts
optional scaleFontOnResize: boolean;
```

Opt-in: when true, corner/edge-drag resize also updates fontScale, so
the rendered font size scales with the box instead of the text
rewrapping/truncating. Only set by defaultStickyNoteStyle.

***

### showAuthor?

```ts
optional showAuthor: boolean;
```

Whether to render `properties.author` as a one-line, ellipsis-truncated
signature at the bottom of the box. Toggled by `TextStyleToolbar`'s
author-visibility cell. No-op when `properties.author` is unset or
blank. Hidden (≡ false) by default.

***

### strokeColor?

```ts
optional strokeColor: string;
```

Stroke color: #f00, yellow...

### strokeType?

```ts
optional strokeType: StrokeType;
```

Type of stroke: plain, dashed, or none

### strokeWidth?

```ts
optional strokeWidth: number;
```

Stroke width

