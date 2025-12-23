# Interface: BoxStyle

Stroke style options for annotations

## Extends

- [`StrokeOptions`](../type-aliases/StrokeOptions.md)

## Extended by

- [`PolygonStyle`](PolygonStyle.md)
- [`TextStyle`](TextStyle.md)

## Properties

### background?

```ts
optional background: string;
```

background color: empty for transparent #f00, yellow...

***

### borderRadius?

```ts
optional borderRadius: number;
```

border radius

***

### padding?

```ts
optional padding: number;
```

padding around the box

***

### scaled?

```ts
optional scaled: boolean;
```

if true, the box scales with zoom. Default is true

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

