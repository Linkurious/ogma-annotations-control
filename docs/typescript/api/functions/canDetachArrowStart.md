# Function: canDetachArrowStart()

```ts
function canDetachArrowStart(arrow): boolean;
```

Check if arrow start point can be detached from its source

Returns false for arrows originating FROM comments, since comment arrows
must always remain attached to the comment on their start side.

## Parameters

### arrow

[`Arrow`](../interfaces/Arrow.md)

The arrow feature

## Returns

`boolean`

True if arrow start can be detached

## Example

```typescript
if (canDetachArrowStart(arrow)) {
  // Allow user to drag arrow start point
} else {
  // Keep arrow start locked to comment
}
```
