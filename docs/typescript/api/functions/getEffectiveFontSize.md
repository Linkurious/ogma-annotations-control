# Function: getEffectiveFontSize()

```ts
function getEffectiveFontSize(fontSize, fontScale): number;
```

fontSize * fontScale, the number to actually render/edit at. Shared by
the SVG renderer (text.ts) and the live-edit overlay (textArea.ts) so
both stay in sync. fontScale absent/undefined is a no-op (×1).

## Parameters

### fontSize

`string` | `number` | `undefined`

### fontScale

`number` | `undefined`

## Returns

`number`
