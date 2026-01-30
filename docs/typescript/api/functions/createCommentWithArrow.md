# Function: createCommentWithArrow()

```ts
function createCommentWithArrow(
   targetX, 
   targetY, 
   commentX, 
   commentY, 
   content, 
   options?): object;
```

Create a comment with an arrow pointing to a target location

This is the recommended way to create comments programmatically, as it ensures
that the comment always has at least one arrow (which is required).

## Parameters

### targetX

`number`

X coordinate where the arrow points to

### targetY

`number`

Y coordinate where the arrow points to

### commentX

`number`

X coordinate of the comment box center

### commentY

`number`

Y coordinate of the comment box center

### content

`string` = `""`

Text content of the comment

### options?

Optional configuration

#### arrowStyle?

`Partial`\<[`ArrowStyles`](../interfaces/ArrowStyles.md)\>

Style options for the arrow

#### commentStyle?

`Partial`\<[`CommentProps`](../interfaces/CommentProps.md)\>

Style options for the comment

## Returns

`object`

Object containing the comment and arrow features

### arrow

```ts
arrow: Arrow;
```

### comment

```ts
comment: Comment;
```

## Example

```typescript
import { createCommentWithArrow } from '@linkurious/ogma-annotations';

// Create a comment pointing to a node at (100, 100)
const { comment, arrow } = createCommentWithArrow(
  100, 100,           // Target position (where arrow points)
  300, 50,            // Comment position
  "Important node!",  // Comment text
  {
    commentStyle: {
      style: {
        background: "#FFFACD",
        color: "#333"
      }
    },
    arrowStyle: {
      strokeColor: "#3498db",
      strokeWidth: 2,
      head: "arrow"
    }
  }
);

// Add both to the controller
controller.add(comment);
controller.add(arrow);

// The arrow is automatically linked to the comment
```
