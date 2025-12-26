# Interface: PolygonStyle

Styles specific to box annotations.

## Extends

- [`BoxStyle`](BoxStyle.md)

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

border radius

### padding?

```ts
optional padding: number;
```

padding around the box

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

