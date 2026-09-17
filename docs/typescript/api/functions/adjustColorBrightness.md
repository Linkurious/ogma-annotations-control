# Function: adjustColorBrightness()

```ts
function adjustColorBrightness(color, amount): RgbaColor;
```

Adjusts the brightness of a color (hex or rgba) based on its perceived luminance.
For bright colors, the adjustment is applied as darkening; for dark colors, as lightening.

## Parameters

### color

`string`

Color string in hex (#RRGGBB or #RGB) or rgba format

### amount

`number`

Adjustment factor between -1 and 1:
  - Positive values (0 to 1): lighten dark colors, darken bright colors
  - Negative values (-1 to 0): darken dark colors, lighten bright colors
  - 0: no change
  - Example: 0.2 applies a 20% adjustment, -0.1 applies a -10% adjustment

## Returns

[`RgbaColor`](../type-aliases/RgbaColor.md)

Adjusted color in rgba format
