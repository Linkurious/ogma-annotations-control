# Function: containerToClientPosition()

```ts
function containerToClientPosition(point, container?): object;
```

Inverse of clientToContainerPosition: turns a point already relative to
the container's top-left (e.g. from ogma.view.graphToScreenCoordinates)
into viewport-relative clientX/clientY, for code paths that synthesize a
MouseEvent-shaped object and hand it to something (like Handler.onDragStart)
that normalizes via clientToContainerPosition itself.

## Parameters

### point

#### x

`number`

#### y

`number`

### container?

`HTMLElement` | `null`

## Returns

`object`

### x

```ts
x: number;
```

### y

```ts
y: number;
```
