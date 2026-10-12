# Type Alias: CommentTarget

```ts
type CommentTarget = 
  | {
  id: Id;
  point: {
     x: number;
     y: number;
  };
  type: "node" | "edge" | "annotation";
}
  | {
  point: {
     x: number;
     y: number;
  };
  type: "void";
};
```

What a comment is being attached to: a graph node, a graph edge, another
annotation (text, box, polygon) or an empty point of the canvas.
