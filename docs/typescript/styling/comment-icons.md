# Collapsed Comment Icons

A collapsed comment is drawn as a small icon. By default it is a built-in SVG message icon (Lucide `message-square-more`). You can change it for every comment at once, per comment, or pick it dynamically.

## Default icon for all comments

Set the `commentIcon` option on the controller. Comments don't store anything, so annotation JSON stays small.

```typescript
import { Control } from "@linkurious/ogma-annotations";

const control = new Control(ogma, {
  // an <svg> string...
  commentIcon:
    '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#e91e63"/></svg>'
});

// ...or a text symbol such as an emoji
control.setOptions({ commentIcon: "💬" });
```

## Icon per comment

Set `iconSymbol` in the comment style. It takes precedence over `commentIcon`, but is stored in the annotation, so repeating a large SVG across many comments bloats the exported JSON. Prefer `commentIcon` (or the callback below) for repeated icons.

```typescript
import { createComment } from "@linkurious/ogma-annotations";

const comment = createComment(0, 0, "Check this", {
  mode: "collapsed",
  style: { iconSymbol: "🔔" }
});
```

## Choosing the icon dynamically

`commentIcon` can be a function. It receives the comment and returns an icon string, or `undefined` for the built-in one. Nothing is stored in the annotation.

```typescript
const control = new Control(ogma, {
  commentIcon: (comment) =>
    comment.properties.author === "bot" ? BOT_SVG : undefined
});
```

The function runs on every render of a collapsed comment, so keep it cheap and return the same string for the same comment.

## Resolution order

1. `style.iconSymbol` of the comment
2. `commentIcon` control option (string, or the function's result)
3. Built-in SVG icon

## How values are rendered

| Value | Rendered as |
| --- | --- |
| Starts with `<svg` | Sanitized SVG, scaled to 60% of `iconSize` and centered |
| Any other string | Text (e.g. an emoji), sized to 50% of `iconSize` |
| `undefined` | Next step in the resolution order |

SVG icons should have a `viewBox` so they scale. Colors in the SVG are kept as written. For safety, `<script>`, `<foreignObject>`, `<iframe>`, `<object>`, `<embed>`, `<animate>`, `<set>`, `on*` event attributes and `javascript:` values are removed. Invalid SVG renders nothing. Parsed SVGs are cached per unique string.

The icon's background, border and size come from the comment style (`iconColor`, `iconBorderColor`, `iconBorderWidth`, `iconSize`). See [`CommentStyle`](/typescript/api/interfaces/CommentStyle).
