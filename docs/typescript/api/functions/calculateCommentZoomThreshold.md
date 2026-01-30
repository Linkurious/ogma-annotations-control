# Function: calculateCommentZoomThreshold()

```ts
function calculateCommentZoomThreshold(comment, minReadableWidth): number;
```

Calculate optimal zoom threshold for auto-collapse based on comment dimensions

The threshold is computed so that the comment collapses when its screen-space
size would be smaller than a minimum readable size.

## Parameters

### comment

[`Comment`](../interfaces/Comment.md)

Comment annotation

### minReadableWidth

`number` = `80`

Minimum readable width in pixels (default: 80)

## Returns

`number`

Zoom threshold below which comment should collapse

## Example

```ts
// A 200px wide comment with minReadable=80 will collapse at zoom < 0.4
// because 200 * 0.4 = 80
```
