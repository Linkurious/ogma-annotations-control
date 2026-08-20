# Function: bringToTop()

```ts
function bringToTop(root, el): void;
```

Move `el` to the end of `root`'s children. SVG paint order is DOM order,
so this is how a shape gets raised to the top of its group. Safe to call
every render even when `el` is already last - `appendChild` on an
existing child just re-positions it, it doesn't clone or re-trigger
insertion.

## Parameters

### root

`Element`

### el

`Element`

## Returns

`void`
