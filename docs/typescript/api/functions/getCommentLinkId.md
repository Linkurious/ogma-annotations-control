# Function: getCommentLinkId()

```ts
function getCommentLinkId(arrow): Id | undefined;
```

Get the id of the comment an arrow is connected to, if any.

A comment is one visual annotation together with the arrow that connects
it - callers that raise a comment's z-order (e.g. bringing a newly
created/selected comment to the front) should raise this arrow along with
it, not just the comment bubble.

## Parameters

### arrow

[`Arrow`](../interfaces/Arrow.md)

The arrow feature to check

## Returns

[`Id`](../type-aliases/Id.md) \| `undefined`

The linked comment's id, or undefined if the arrow isn't attached
to a comment
