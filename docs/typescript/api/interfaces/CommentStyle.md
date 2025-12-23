# Interface: CommentStyle

Style configuration for Comment annotations

## Extends

- [`TextStyle`](TextStyle.md)

## Properties

### autoGrow?

```ts
optional autoGrow: boolean;
```

Auto-grow height with content (default: true)

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

### collapseZoomThreshold?

```ts
optional collapseZoomThreshold: number;
```

Zoom threshold below which comment auto-collapses (default: 0.5)

***

### color?

```ts
optional color: string;
```

text color: #f00, yellow...

### fixedSize?

```ts
optional fixedSize: boolean;
```

When true, text maintains constant size regardless of zoom level

### font?

```ts
optional font: string;
```

Helvetica, sans-serif...

### fontSize?

```ts
optional fontSize: string | number;
```

Font size, in pixels

### iconBorderColor?

```ts
optional iconBorderColor: string;
```

Border color for collapsed icon

***

### iconBorderWidth?

```ts
optional iconBorderWidth: number;
```

Border width for collapsed icon

***

### iconColor?

```ts
optional iconColor: string;
```

Background color for collapsed icon (default: "#FFD700")

***

### iconSize?

```ts
optional iconSize: number;
```

Size when collapsed (default: 32px)

***

### iconSymbol?

```ts
optional iconSymbol: string;
```

Icon to display when collapsed (default: "💬")

***

### minHeight?

```ts
optional minHeight: number;
```

Minimum height (default: 60px)

***

### padding?

```ts
optional padding: number;
```

padding around the text

### scaled?

```ts
optional scaled: boolean;
```

if true, the box scales with zoom. Default is true

### showSendButton?

```ts
optional showSendButton: boolean;
```

Show "send" button in edit mode (default: true)

***

### strokeColor?

```ts
optional strokeColor: string;
```

Stroke color: #f00, yellow...

### strokeType?

```ts
optional strokeType: "none" | "plain" | "dashed";
```

Type of stroke: plain, dashed, or none

### strokeWidth?

```ts
optional strokeWidth: number;
```

Stroke width

