# Function: getCascadeDeleteIds()

```ts
function getCascadeDeleteIds(features, id): Set<Id>;
```

Ids that removing `id` should take with it: `id` itself, plus every arrow
attached to it when it's a comment or text annotation - deleting the
anchor takes its connectors along, since a detached comment-arrow has
nothing to point at.

## Parameters

### features

`Record`\<[`Id`](../type-aliases/Id.md), [`Annotation`](../type-aliases/Annotation.md)\>

The full feature map (pre-deletion)

### id

[`Id`](../type-aliases/Id.md)

The id being removed

## Returns

`Set`\<[`Id`](../type-aliases/Id.md)\>

The complete set of ids to delete
