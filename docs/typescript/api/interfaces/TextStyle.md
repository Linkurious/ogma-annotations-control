# Interface: TextStyle

Styles specific to box annotations.

## Extends

- [`BoxStyle`](BoxStyle.md)

## Extended by

- [`CommentStyle`](CommentStyle.md)

## Properties

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

### fontSize?

```ts
optional fontSize: string | number;
```

Font size, in pixels

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

