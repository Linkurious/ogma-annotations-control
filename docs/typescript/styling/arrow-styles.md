# Arrow Styles

Learn how to customize the appearance of arrow annotations, including stroke styles, colors, widths, and extremity decorations.

## Overview

Arrows support extensive styling options through the [`ArrowStyles`](/typescript/api/interfaces/ArrowStyles) interface. You can customize:

- Stroke appearance (color, width, type)
- Extremity decorations (heads and tails)
- Opacity and visual effects

## Basic Stroke Styling

Control the arrow line appearance with stroke properties:

```typescript
import { createArrow } from "@linkurious/ogma-annotations";

// Solid arrow
const solidArrow = createArrow(0, 0, 100, 100, {
  strokeColor: "#3498db",
  strokeWidth: 2,
  strokeType: "plain"
});

// Dashed arrow
const dashedArrow = createArrow(0, 0, 100, 100, {
  strokeColor: "#e74c3c",
  strokeWidth: 2,
  strokeType: "dashed"
});

// Dotted arrow
const dottedArrow = createArrow(0, 0, 100, 100, {
  strokeColor: "#2ecc71",
  strokeWidth: 3,
  strokeType: "dotted"
});

controller.add(solidArrow);
controller.add(dashedArrow);
controller.add(dottedArrow);
```

### Stroke Types

- `"plain"` - Solid line (default)
- `"dashed"` - Dashed line pattern
- `"dotted"` - Dotted line pattern

## Extremity Styles

Customize arrow heads and tails using the [`Extremity`](/typescript/api/type-aliases/Extremity) type:

```typescript
// Arrow with standard head
const standardArrow = createArrow(0, 0, 100, 100, {
  strokeColor: "#3498db",
  strokeWidth: 2,
  head: "arrow",
  tail: "none"
});

// Bidirectional arrow
const bidirectional = createArrow(0, 0, 100, 100, {
  strokeColor: "#9b59b6",
  strokeWidth: 2,
  head: "arrow",
  tail: "arrow"
});

// Filled arrow head
const filledArrow = createArrow(0, 0, 100, 100, {
  strokeColor: "#e74c3c",
  strokeWidth: 3,
  head: "arrow-plain",
  tail: "none"
});

// Dot extremities
const dottedEnds = createArrow(0, 0, 100, 100, {
  strokeColor: "#1abc9c",
  strokeWidth: 2,
  head: "dot",
  tail: "dot"
});

// Halo dot (with glow effect)
const haloArrow = createArrow(0, 0, 100, 100, {
  strokeColor: "#f39c12",
  strokeWidth: 2,
  head: "halo-dot",
  tail: "none"
});
```

### Available Extremity Types

- `"none"` - No decoration
- `"arrow"` - Standard arrow head (outline)
- `"arrow-plain"` - Filled arrow head
- `"dot"` - Circle at the end
- `"halo-dot"` - Circle with halo/glow effect

## Updating Arrow Styles

You can update arrow styles after creation using the `update()` method:

```typescript
// Get the arrow annotation
const arrow = controller.getAnnotation("arrow-id");

if (arrow && arrow.properties.type === "arrow") {
  // Update stroke color and width
  arrow.properties.style.strokeColor = "#e74c3c";
  arrow.properties.style.strokeWidth = 3;

  // Change to bidirectional
  arrow.properties.style.head = "arrow";
  arrow.properties.style.tail = "arrow";

  // Apply the changes
  controller.update(arrow);
}
```

## Color Options

Use any valid CSS color format for `strokeColor`:

```typescript
// Hex colors
createArrow(0, 0, 100, 100, {
  strokeColor: "#3498db"
});

// RGB colors
createArrow(0, 0, 100, 100, {
  strokeColor: "rgb(52, 152, 219)"
});

// RGBA with transparency
createArrow(0, 0, 100, 100, {
  strokeColor: "rgba(52, 152, 219, 0.5)"
});
```

See the [`Color`](/typescript/api/type-aliases/Color) type for all supported formats.

## Default Arrow Style

The library provides default arrow styling through [`defaultArrowStyle`](/typescript/api/variables/defaultArrowStyle):

```typescript
import { defaultArrowStyle } from "@linkurious/ogma-annotations";

console.log(defaultArrowStyle);
// {
//   strokeColor: "#000000",
//   strokeWidth: 2,
//   strokeType: "plain",
//   head: "none",
//   tail: "none"
// }
```

You can merge with defaults to override specific properties:

```typescript
const customArrow = createArrow(0, 0, 100, 100, {
  ...defaultArrowStyle,
  strokeColor: "#3498db",
  head: "arrow"
});
```

## Theme-Based Styling

Create consistent arrow themes for your application:

```typescript
import { ArrowStyles } from "@linkurious/ogma-annotations";

// Define arrow themes
const arrowThemes = {
  primary: {
    strokeColor: "#3498db",
    strokeWidth: 2,
    strokeType: "plain",
    head: "arrow",
    tail: "none"
  } as ArrowStyles,

  secondary: {
    strokeColor: "#95a5a6",
    strokeWidth: 1,
    strokeType: "dashed",
    head: "arrow",
    tail: "none"
  } as ArrowStyles,

  highlight: {
    strokeColor: "#f39c12",
    strokeWidth: 3,
    strokeType: "plain",
    head: "arrow-plain",
    tail: "none"
  } as ArrowStyles,

  connection: {
    strokeColor: "#9b59b6",
    strokeWidth: 2,
    strokeType: "plain",
    head: "arrow",
    tail: "arrow"
  } as ArrowStyles
};

// Use themes
const primaryArrow = createArrow(0, 0, 100, 100, arrowThemes.primary);
const secondaryArrow = createArrow(0, 0, 100, 100, arrowThemes.secondary);

controller.add(primaryArrow);
controller.add(secondaryArrow);
```

## Best Practices

### 1. Consistent Stroke Widths

Use stroke widths that scale well with your graph zoom levels:

```typescript
// Good: Moderate widths that remain visible
const arrow1 = createArrow(0, 0, 100, 100, {
  strokeWidth: 2 // Visible but not overwhelming
});

// Avoid: Very thin strokes that disappear when zoomed out
const arrow2 = createArrow(0, 0, 100, 100, {
  strokeWidth: 0.5 // May be hard to see
});
```

Also keep in mind that the comment arrows width does not scale with zoom level, so choose a width that works well at all zoom levels. In the first version the behaviour is hardcoded to keep the visual consistency between comments and their arrows.

### 2. Semantic Color Coding

Use colors to convey meaning:

```typescript
const semanticColors = {
  success: "#27ae60",
  warning: "#f39c12",
  error: "#e74c3c",
  info: "#3498db",
  neutral: "#95a5a6"
};

// Create semantically colored arrows
const successArrow = createArrow(0, 0, 100, 100, {
  strokeColor: semanticColors.success,
  head: "arrow"
});
```

### 3. Contrast with Background

Ensure arrows are visible against your graph background:

```typescript
// For light backgrounds
const darkArrow = createArrow(0, 0, 100, 100, {
  strokeColor: "#2c3e50",
  strokeWidth: 2
});

// For dark backgrounds
const lightArrow = createArrow(0, 0, 100, 100, {
  strokeColor: "#ecf0f1",
  strokeWidth: 2
});
```

## See Also

- [`ArrowStyles`](/typescript/api/interfaces/ArrowStyles) - Complete style interface reference
- [`Extremity`](/typescript/api/type-aliases/Extremity) - Arrow head/tail types
- [`Color`](/typescript/api/type-aliases/Color) - Supported color formats
- [`defaultArrowStyle`](/typescript/api/variables/defaultArrowStyle) - Default arrow styling
- [Text Styles](/typescript/styling/text-styles) - Styling text annotations
