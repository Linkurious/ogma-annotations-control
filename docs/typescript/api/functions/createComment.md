# Function: createComment()

```ts
function createComment(
   x, 
   y, 
   content, 
   options?): Comment;
```

Create a new Comment annotation

## Parameters

### x

`number`

X coordinate of the comment box/icon center

### y

`number`

Y coordinate of the comment box/icon center

### content

`string`

Text content

### options?

`Partial`\<[`CommentProps`](../interfaces/CommentProps.md)\>

Optional configuration

## Returns

[`Comment`](../interfaces/Comment.md)

New Comment feature

## Important

This creates ONLY the comment box without an arrow. Since comments
require at least one arrow, you should use [createCommentWithArrow](createCommentWithArrow.md)
instead for programmatic creation. This function is primarily used internally
by the interactive drawing handlers.

## See

createCommentWithArrow for creating comments programmatically
