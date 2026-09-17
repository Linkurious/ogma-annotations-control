# Function: isRigidConnector()

```ts
function isRigidConnector(comment): boolean;
```

Whether a comment's connector line should rigidly follow its attachment
point (translate the comment by the same offset) rather than elastically
re-anchoring to the nearest point on the comment box.

## Parameters

### comment

[`Comment`](../interfaces/Comment.md)

Comment annotation

## Returns

`boolean`

True unless the comment's style explicitly sets `connectorMode: "elastic"`
