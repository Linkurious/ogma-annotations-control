# Variable: defaultCommentStyle

```ts
const defaultCommentStyle: CommentStyle;
```

Default style for Comment annotations

## Example

```typescript
{
  // Box styling
  background: "#FFFACD", // Light yellow (sticky note color)
  padding: 8,
  borderRadius: 4,
  strokeColor: "#DDD",
  strokeWidth: 1,
  strokeType: "plain",

  // Icon styling (collapsed mode)
  iconColor: "#FFCB2F", // Gold
  iconSymbol: "💬",
  iconBorderColor: "#aaa",
  iconBorderWidth: 2,

  // Size properties
  minHeight: 60,
  iconSize: 32,

  // Text styling
  color: "#333",
  font: "Arial, sans-serif",
  fontSize: 12,

  // Editing UI
  showSendButton: true,
  autoGrow: true,

  // Fixed size (always screen-aligned)
  fixedSize: true
}
```
