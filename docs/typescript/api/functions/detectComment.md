# Function: detectComment()

```ts
function detectComment(
   comment, 
   point, 
   threshold, 
   sin, 
   cos, 
   zoom): boolean;
```

Detect if a point is within a comment's bounds

## Parameters

### comment

[`Comment`](../interfaces/Comment.md)

Comment to test

### point

[`Point`](../type-aliases/Point.md)

Point to test

### threshold

`number` = `0`

Detection threshold in pixels

### sin

`number`

### cos

`number`

### zoom

`number` = `1`

Current zoom level

## Returns

`boolean`

True if point is within comment bounds
