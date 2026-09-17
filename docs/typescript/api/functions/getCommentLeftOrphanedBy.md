# Function: getCommentLeftOrphanedBy()

```ts
function getCommentLeftOrphanedBy(features, arrowId): Id | null;
```

Comments must always keep at least one arrow. Returns the comment's id
when deleting `arrowId` would leave it with none, so the caller can block
the deletion instead - or `null` when it's safe to proceed.

## Parameters

### features

`Record`\<[`Id`](../type-aliases/Id.md), [`Annotation`](../type-aliases/Annotation.md)\>

The full feature map (pre-deletion)

### arrowId

[`Id`](../type-aliases/Id.md)

The arrow being removed

## Returns

[`Id`](../type-aliases/Id.md) \| `null`
