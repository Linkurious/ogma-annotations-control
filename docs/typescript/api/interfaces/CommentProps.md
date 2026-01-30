# Interface: CommentProps

Properties for Comment annotations

Comments are specialized annotations that:
- Always maintain fixed screen-space size
- Always have at least one arrow pointing TO them
- Can be collapsed (icon) or expanded (text box)
- Support multiple arrows pointing to them

## Extends

- [`AnnotationProps`](AnnotationProps.md)

## Properties

### author?

```ts
optional author: string;
```

Optional metadata

***

### content

```ts
content: string;
```

Text content (similar to text annotation)

***

### height

```ts
height: number;
```

Height (auto-grows with content, pixels)

***

### mode

```ts
mode: "collapsed" | "expanded";
```

Display mode: collapsed (icon) or expanded (text box)

***

### style?

```ts
optional style: CommentStyle;
```

Styling

### timestamp?

```ts
optional timestamp: Date;
```

***

### type

```ts
type: "comment";
```

Type of annotation

### width

```ts
width: number;
```

Width in expanded mode (pixels)
