# Interface: Link

Link between an arrow and a text or node

## Properties

### arrow

```ts
arrow: Id;
```

arrow attached to the text or node

***

### id

```ts
id: Id;
```

id of the text the arrow is attached to

***

### magnet

```ts
magnet: Point;
```

On which point relative to topleft corner the arrow is tighten, in case of
node, a 0 vector represents the center, otherwise it can be deduced from the arrow itself

***

### side

```ts
side: Side;
```

On which end the arrow is tighten to the text

***

### target

```ts
target: Id;
```

id of the text or node  the arrow is attached to

***

### targetType

```ts
targetType: TargetType;
```

Text or node
