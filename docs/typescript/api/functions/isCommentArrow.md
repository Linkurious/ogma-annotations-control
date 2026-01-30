# Function: isCommentArrow()

```ts
function isCommentArrow(arrow): boolean;
```

Check if an arrow is connected to a comment

## Parameters

### arrow

[`Arrow`](../interfaces/Arrow.md)

The arrow feature to check

## Returns

`boolean`

True if the arrow has a comment on either end

## Example

```typescript
if (isCommentArrow(arrow)) {
  // Handle comment arrow specially
}
```
