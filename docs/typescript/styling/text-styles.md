# Text and Shape Styles

Learn how to customize the appearance of text annotations, boxes, polygons, and comments with colors, borders, backgrounds, and typography.

## Text Annotations

Text annotations support extensive styling through the [`TextStyle`](/typescript/api/interfaces/TextStyle) interface.

### Typography

Control font properties for text content:

```typescript
import { createText } from "@linkurious/ogma-annotations";

// Basic text with custom font
const styledText = createText(50, 50, 200, 60, "Hello World", {
  fontSize: 16,
  fontFamily: "Arial, sans-serif",
  color: "#2c3e50",
  fontWeight: "bold"
});

// Text with custom styling
const fancyText = createText(50, 120, 250, 80, "Important Note", {
  fontSize: 18,
  fontFamily: "Georgia, serif",
  color: "#e74c3c",
  fontWeight: "600",
  textAlign: "center"
});

controller.add(styledText);
controller.add(fancyText);
```

### Background and Borders

Customize the text box appearance:

```typescript
// Text with background and border
const boxedText = createText(50, 50, 200, 60, "Highlighted", {
  color: "#2c3e50",
  background: "#f39c12",
  strokeColor: "#e67e22",
  strokeWidth: 2,
  borderRadius: 8,
  padding: 12
});

// Transparent background with border
const outlineText = createText(50, 120, 200, 60, "Outline Only", {
  color: "#3498db",
  background: "transparent",
  strokeColor: "#3498db",
  strokeWidth: 2,
  strokeType: "dashed",
  borderRadius: 4
});

// Solid background, no border
const solidText = createText(50, 190, 200, 60, "No Border", {
  color: "#ffffff",
  background: "#9b59b6",
  strokeWidth: 0,
  borderRadius: 12,
  padding: 16
});

controller.add(boxedText);
controller.add(outlineText);
controller.add(solidText);
```

### Fixed Size Text

Create text that doesn't scale with graph zoom:

```typescript
const fixedText = createText(100, 100, 150, 40, "Always visible", {
  fixedSize: true,
  fontSize: 14,
  color: "#ffffff",
  background: "#3498db",
  padding: 10,
  borderRadius: 6
});

controller.add(fixedText);
```

## Box Annotations

Boxes use the [`BoxStyle`](/typescript/api/interfaces/BoxStyle) interface for styling:

```typescript
import { createBox } from "@linkurious/ogma-annotations";

// Highlight box with semi-transparent background
const highlight = createBox(0, 0, 200, 150, {
  background: "rgba(52, 152, 219, 0.2)",
  strokeColor: "#3498db",
  strokeWidth: 2,
  strokeType: "plain",
  borderRadius: 8
});

// Border-only box (no fill)
const borderBox = createBox(0, 160, 200, 150, {
  background: "transparent",
  strokeColor: "#e74c3c",
  strokeWidth: 3,
  strokeType: "dashed",
  borderRadius: 0
});

// Rounded filled box
const roundedBox = createBox(0, 320, 200, 150, {
  background: "rgba(46, 204, 113, 0.3)",
  strokeColor: "#27ae60",
  strokeWidth: 2,
  strokeType: "plain",
  borderRadius: 16
});

controller.add(highlight);
controller.add(borderBox);
controller.add(roundedBox);
```

## Polygon Annotations

Polygons use the [`PolygonStyle`](/typescript/api/interfaces/PolygonStyle) interface:

```typescript
import { createPolygon } from "@linkurious/ogma-annotations";

// Create a styled polygon
const styledPolygon = createPolygon(
  [
    [
      [0, 0],
      [100, 20],
      [120, 100],
      [50, 150],
      [0, 100],
      [0, 0]
    ]
  ],
  {
    style: {
      background: "rgba(155, 89, 182, 0.3)",
      strokeColor: "#8e44ad",
      strokeWidth: 2,
      strokeType: "plain"
    }
  }
);

// Outline-only polygon
const outlinePolygon = createPolygon(
  [
    [
      [0, 0],
      [100, 0],
      [50, 100],
      [0, 0]
    ]
  ],
  {
    style: {
      background: "transparent",
      strokeColor: "#e74c3c",
      strokeWidth: 3,
      strokeType: "dashed"
    }
  }
);

controller.add(styledPolygon);
controller.add(outlinePolygon);
```

## Comment Annotations

Comments combine text styling with arrow styling through the [`CommentStyle`](/typescript/api/interfaces/CommentStyle) interface:

```typescript
import { createCommentWithArrow } from "@linkurious/ogma-annotations";

const { comment, arrow } = createCommentWithArrow(
  100,
  100, // Target position
  300,
  50, // Comment position
  "This is important!",
  {
    commentStyle: {
      style: {
        background: "#FFFACD",
        color: "#333",
        fontSize: 14,
        strokeColor: "#DAA520",
        strokeWidth: 1,
        borderRadius: 6,
        padding: 12
      },
      width: 200,
      height: 80
    },
    arrowStyle: {
      strokeColor: "#DAA520",
      strokeWidth: 2,
      head: "arrow",
      tail: "none"
    }
  }
);

controller.add(comment);
controller.add(arrow);
```

## Updating Styles

Update annotation styles dynamically using the `update()` method:

```typescript
// Get an annotation
const text = controller.getAnnotation("text-id");

if (text && text.properties.type === "text") {
  // Update text style
  text.properties.style.color = "#e74c3c";
  text.properties.style.background = "#ffeaa7";
  text.properties.style.fontSize = 18;
  text.properties.style.fontWeight = "bold";

  // Apply changes
  controller.update(text);
}

// Update a box
const box = controller.getAnnotation("box-id");

if (box && box.properties.type === "box") {
  // Change box appearance
  box.properties.style.background = "rgba(52, 152, 219, 0.3)";
  box.properties.style.strokeColor = "#3498db";
  box.properties.style.strokeWidth = 3;

  // Apply changes
  controller.update(box);
}
```

## Color Formats

All style properties that accept colors support multiple formats through the [`Color`](/typescript/api/type-aliases/Color) type:

```typescript
// Hex colors
createText(0, 0, 150, 40, "Hex", {
  color: "#3498db",
  background: "#ecf0f1"
});

// RGB colors
createText(0, 50, 150, 40, "RGB", {
  color: "rgb(52, 152, 219)",
  background: "rgb(236, 240, 241)"
});

// RGBA with transparency
createBox(0, 100, 200, 100, {
  background: "rgba(52, 152, 219, 0.3)",
  strokeColor: "rgba(52, 152, 219, 0.8)"
});
```

## Default Styles

The library provides default styles for each annotation type:

```typescript
import {
  defaultTextStyle,
  defaultBoxStyle,
  defaultPolygonStyle,
  defaultCommentStyle
} from "@linkurious/ogma-annotations";

// View default styles
console.log(defaultTextStyle);
console.log(defaultBoxStyle);
console.log(defaultPolygonStyle);
console.log(defaultCommentStyle);

// Merge with defaults
const customText = createText(50, 50, 150, 40, "Custom", {
  ...defaultTextStyle,
  color: "#3498db",
  fontSize: 16
});
```

See the API reference for default styles:
- [`defaultTextStyle`](/typescript/api/variables/defaultTextStyle)
- [`defaultBoxStyle`](/typescript/api/variables/defaultBoxStyle)
- [`defaultPolygonStyle`](/typescript/api/variables/defaultPolygonStyle)
- [`defaultCommentStyle`](/typescript/api/variables/defaultCommentStyle)

## Style Themes

Create consistent styling themes for your application:

```typescript
import { TextStyle, BoxStyle } from "@linkurious/ogma-annotations";

// Define a color palette
const palette = {
  primary: "#3498db",
  secondary: "#2ecc71",
  accent: "#f39c12",
  danger: "#e74c3c",
  light: "#ecf0f1",
  dark: "#2c3e50"
};

// Create text style themes
const textThemes = {
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: palette.dark,
    background: "transparent"
  } as TextStyle,

  label: {
    fontSize: 14,
    color: palette.dark,
    background: palette.light,
    padding: 8,
    borderRadius: 4,
    strokeColor: palette.primary,
    strokeWidth: 1
  } as TextStyle,

  highlight: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
    background: palette.accent,
    padding: 12,
    borderRadius: 8,
    strokeWidth: 0
  } as TextStyle
};

// Create box style themes
const boxThemes = {
  selection: {
    background: "rgba(52, 152, 219, 0.2)",
    strokeColor: palette.primary,
    strokeWidth: 2,
    strokeType: "dashed" as const,
    borderRadius: 4
  } as BoxStyle,

  highlight: {
    background: "rgba(243, 156, 18, 0.3)",
    strokeColor: palette.accent,
    strokeWidth: 3,
    strokeType: "plain" as const,
    borderRadius: 8
  } as BoxStyle
};

// Use themes
const titleText = createText(50, 50, 300, 50, "Title", textThemes.title);
const labelText = createText(50, 110, 200, 40, "Label", textThemes.label);
const highlightBox = createBox(0, 0, 400, 200, boxThemes.highlight);

controller.add(titleText);
controller.add(labelText);
controller.add(highlightBox);
```

## Best Practices

### 1. Readable Typography

Ensure text is readable with proper font sizes and contrast:

```typescript
// Good: Readable text with good contrast
const goodText = createText(50, 50, 200, 60, "Readable Text", {
  fontSize: 14, // Minimum readable size
  color: "#2c3e50", // Dark text
  background: "#ecf0f1", // Light background
  padding: 10
});

// Avoid: Too small or low contrast
const badText = createText(50, 120, 200, 60, "Hard to read", {
  fontSize: 8, // Too small
  color: "#95a5a6", // Low contrast
  background: "#bdc3c7"
});
```

### 2. Consistent Styling

Use style objects or themes for consistency:

```typescript
// Define reusable styles
const cardStyle: TextStyle = {
  fontSize: 14,
  color: "#2c3e50",
  background: "#ffffff",
  strokeColor: "#dfe6e9",
  strokeWidth: 1,
  borderRadius: 8,
  padding: 12
};

// Apply consistently
const card1 = createText(50, 50, 200, 80, "Card 1", cardStyle);
const card2 = createText(50, 140, 200, 80, "Card 2", cardStyle);
```

### 3. Semantic Colors

Use colors to convey meaning:

```typescript
const statusStyles = {
  success: {
    background: "rgba(46, 204, 113, 0.2)",
    strokeColor: "#27ae60",
    color: "#27ae60"
  } as TextStyle,

  warning: {
    background: "rgba(243, 156, 18, 0.2)",
    strokeColor: "#f39c12",
    color: "#f39c12"
  } as TextStyle,

  error: {
    background: "rgba(231, 76, 60, 0.2)",
    strokeColor: "#e74c3c",
    color: "#e74c3c"
  } as TextStyle
};

const successLabel = createText(50, 50, 150, 40, "Success", statusStyles.success);
const errorLabel = createText(50, 100, 150, 40, "Error", statusStyles.error);
```

## See Also

- [`TextStyle`](/typescript/api/interfaces/TextStyle) - Text style interface
- [`BoxStyle`](/typescript/api/interfaces/BoxStyle) - Box style interface
- [`PolygonStyle`](/typescript/api/interfaces/PolygonStyle) - Polygon style interface
- [`CommentStyle`](/typescript/api/interfaces/CommentStyle) - Comment style interface
- [`Color`](/typescript/api/type-aliases/Color) - Supported color formats
- [Arrow Styles](/typescript/styling/arrow-styles) - Styling arrows
