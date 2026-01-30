# Function: adjustColorBrightness()

```ts
function adjustColorBrightness(color, amount): RgbaColor;
```

Automatically lightens or darkens a color (hex or rgba) for highlight purposes.

## Parameters

### color

`string`

Color string in hex (#RRGGBB or #RGB) or rgba format

### amount

`number`

Amount to lighten/darken (default 20 for lighter and -10 for darker)

## Returns

[`RgbaColor`](../type-aliases/RgbaColor.md)

Highlighted color in rgba format
