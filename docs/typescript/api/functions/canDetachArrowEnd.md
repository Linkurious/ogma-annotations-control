# Function: canDetachArrowEnd()

```ts
function canDetachArrowEnd(_arrow): boolean;
```

Check if arrow endpoint can be detached from its target

Always returns true since arrow endpoints can be freely retargeted,
even for comment arrows. The comment is typically on the start side.

## Parameters

## Returns

`boolean`

Always true - arrow ends can be detached

## Example

```typescript
if (canDetachArrowEnd(arrow)) {
  // Allow user to drag arrow end point
}
```
