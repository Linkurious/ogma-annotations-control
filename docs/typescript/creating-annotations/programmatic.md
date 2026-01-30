# Programmatic Creation

Learn how to create annotations programmatically using factory functions. This approach gives you full control over annotation positioning, styling, and properties.

## Overview

Programmatic creation is useful when you need to:

- Add annotations based on data or events
- Import annotations from saved data
- Create annotations with precise positioning
- Build custom annotation workflows

All annotation types can be created using dedicated factory functions that return GeoJSON Feature objects.

## Creating Arrows

Arrows are created using the `createArrow()` function, which takes start and end coordinates plus optional styling.

```typescript
import { createArrow } from "@linkurious/ogma-annotations";

// Create a simple line
const line = createArrow(0, 0, 100, 100);
controller.add(line);

// Create an arrow with styling
const styledArrow = createArrow(0, 0, 100, 100, {
  strokeColor: "#3498db",
  strokeWidth: 2,
  strokeType: "dashed",
  head: "arrow", // Add arrowhead at end
  tail: "none" // No tail
});
controller.add(styledArrow);

// Create a bidirectional arrow
const bidirectional = createArrow(0, 0, 100, 100, {
  strokeColor: "#e74c3c",
  strokeWidth: 3,
  head: "arrow",
  tail: "arrow"
});
controller.add(bidirectional);
```

### Arrow Extremity Types

Arrows support different extremity styles:

- `"none"` - No decoration (default)
- `"arrow"` - Standard arrow head
- `"arrow-plain"` - Filled arrow head
- `"dot"` - Circle at the end
- `"halo-dot"` - Circle with halo effect

## Creating Text

Text annotations are created using `createText()`, which positions text at specific coordinates.

```typescript
import { createText } from "@linkurious/ogma-annotations";

// Create basic text
const label = createText(
  50,
  50, // x, y position (top-left corner)
  150,
  40, // width, height
  "Hello World" // content
);
controller.add(label);

// Create styled text
const styledText = createText(50, 50, 200, 60, "Important Node", {
  fontSize: 16,
  color: "#2c3e50",
  background: "#ecf0f1",
  padding: 12,
  borderRadius: 8,
  strokeColor: "#bdc3c7",
  strokeWidth: 1
});
controller.add(styledText);

// Create fixed-size text (doesn't scale with zoom)
const fixedText = createText(100, 100, 150, 40, "Always visible", {
  fixedSize: true,
  fontSize: 14,
  color: "#ffffff",
  background: "#3498db"
});
controller.add(fixedText);
```

## Creating Boxes

Boxes are rectangular areas created with `createBox()`.

```typescript
import { createBox } from "@linkurious/ogma-annotations";

// Create a simple highlight box
const highlight = createBox(
  0,
  0, // x, y position (top-left corner)
  200,
  150 // width, height
);
controller.add(highlight);

// Create styled box
const styledBox = createBox(0, 0, 200, 150, {
  background: "rgba(52, 152, 219, 0.2)",
  strokeColor: "#3498db",
  strokeWidth: 2,
  strokeType: "dashed",
  borderRadius: 8
});
controller.add(styledBox);

// Create a box with no fill (border only)
const borderBox = createBox(0, 0, 200, 150, {
  background: "transparent",
  strokeColor: "#e74c3c",
  strokeWidth: 3
});
controller.add(borderBox);
```

## Creating Polygons

Polygons are multi-point shapes created with `createPolygon()`.

```typescript
import { createPolygon } from "@linkurious/ogma-annotations";

// Create a triangle
const triangle = createPolygon([
  [
    [0, 0],
    [100, 0],
    [50, 100],
    [0, 0] // Close the polygon
  ]
]);
controller.add(triangle);

// Create an irregular shape
const shape = createPolygon(
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
      background: "rgba(46, 204, 113, 0.3)",
      strokeColor: "#27ae60",
      strokeWidth: 2,
      strokeType: "plain"
    }
  }
);
controller.add(shape);
```

::: warning
Polygons use GeoJSON coordinate format: `[[[x1, y1], [x2, y2], ...]]`. Note the triple array nesting - this allows for polygons with holes (not currently supported).
:::

## Creating Comments

Comments combine a text box with an arrow. Use `createCommentWithArrow()` to ensure proper linking.

```typescript
import { createCommentWithArrow } from "@linkurious/ogma-annotations";

// Create a comment pointing to a specific location
const { comment, arrow } = createCommentWithArrow(
  100,
  100, // Target position (where arrow points FROM)
  300,
  50, // Comment position (where arrow points TO)
  "This is important!", // Comment text
  {
    commentStyle: {
      style: {
        background: "#FFFACD",
        color: "#333",
        fontSize: 14
      }
    },
    arrowStyle: {
      strokeColor: "#666",
      strokeWidth: 2,
      head: "arrow"
    }
  }
);

// Add both to the controller
controller.add(comment);
controller.add(arrow);
```

::: tip
Always use `createCommentWithArrow()` rather than creating comments manually. This ensures the arrow is properly linked to the comment, which is required for comments to work correctly.
:::

## Creating Linked Arrows

Arrows can be linked to other annotations or graph nodes, making them follow when the target moves.

```typescript
import { createArrow, createText } from "@linkurious/ogma-annotations";

// Create a text annotation
const label = createText(100, 100, 150, 40, "Target");
controller.add(label);

// Create an arrow linked to the text
const arrow = createArrow(0, 0, 100, 120, {
  strokeColor: "#3498db",
  head: "arrow"
});

// Link the arrow's end to the text annotation
arrow.properties.link = {
  end: {
    id: label.id,
    side: "end",
    type: "text",
    magnet: { x: 0, y: 0.5 } // Attach to left-center of text box
  }
};

controller.add(arrow);

// Now when you move the text, the arrow follows!
```

### Link Magnet Positions

The `magnet` property specifies where on the target the arrow attaches:

- `{ x: 0, y: 0 }` - Top-left corner
- `{ x: 0.5, y: 0 }` - Top-center
- `{ x: 1, y: 0.5 }` - Right-center
- `{ x: 0.5, y: 1 }` - Bottom-center
- `{ x: 0, y: 0.5 }` - Left-center

## Batch Creation

Add multiple annotations efficiently using batch operations:

```typescript
import {
  createArrow,
  createText,
  createBox
} from "@linkurious/ogma-annotations";

// Create multiple annotations
const annotations = [
  createText(50, 50, 150, 40, "Node 1"),
  createText(250, 50, 150, 40, "Node 2"),
  createArrow(125, 70, 250, 70, { head: "arrow" }),
  createBox(20, 20, 400, 100, { background: "rgba(52, 152, 219, 0.1)" })
];

// Add all at once
annotations.forEach((annotation) => controller.add(annotation));
```

## Creating from Data

Common pattern for creating annotations from data:

```typescript
interface AnnotationData {
  type: "text" | "arrow" | "box";
  position: { x: number; y: number };
  content?: string;
  style?: any;
}

function createAnnotationsFromData(data: AnnotationData[]) {
  data.forEach((item) => {
    let annotation;

    switch (item.type) {
      case "text":
        annotation = createText(
          item.position.x,
          item.position.y,
          150,
          40,
          item.content || "",
          item.style
        );
        break;

      case "arrow":
        annotation = createArrow(
          item.position.x,
          item.position.y,
          item.position.x + 100,
          item.position.y + 100,
          item.style
        );
        break;

      case "box":
        annotation = createBox(
          item.position.x,
          item.position.y,
          200,
          150,
          item.style
        );
        break;
    }

    if (annotation) {
      controller.add(annotation);
    }
  });
}
```

## Importing Annotations

Import saved annotations from JSON:

```typescript
// Saved annotations (GeoJSON FeatureCollection)
const savedData = {
  type: "FeatureCollection",
  features: [
    {
      id: "text-1",
      type: "Feature",
      geometry: { type: "Point", coordinates: [50, 50] },
      properties: {
        type: "text",
        content: "Imported text",
        width: 150,
        height: 40,
        style: { fontSize: 14 }
      }
    }
    // ... more annotations
  ]
};

// Import all annotations
controller.add(savedData);
```

## Best Practices

### 1. Generate Unique IDs

By default, annotations get auto-generated IDs. For data persistence, you may want custom IDs:

```typescript
// same as used by the library internally
import { nanoid } from "nanoid";

const text = createText(50, 50, 150, 40, "Hello");
text.id = `text-${nanoid()}`;
controller.add(text);
```

### 2. Use Type-Safe Styling

Define reusable style configurations:

```typescript
const theme = {
  primary: {
    strokeColor: "#3498db",
    strokeWidth: 2,
    background: "rgba(52, 152, 219, 0.2)"
  } as BoxStyle,
  secondary: {
    strokeColor: "#95a5a6",
    strokeWidth: 1,
    background: "rgba(149, 165, 166, 0.2)"
  } as BoxStyle
};

const box = createBox(0, 0, 200, 150, theme.primary);
controller.add(box);
```

### 3. Coordinate System

All coordinates are in graph space (Ogma's coordinate system), not screen pixels:

```typescript
// Get graph coordinates from screen position
const graphCoords = ogma.view.screenToGraphCoordinates({ x: 100, y: 100 });

// Create annotation at graph position
const text = createText(
  graphCoords.x,
  graphCoords.y,
  150,
  40,
  "At graph position"
);
controller.add(text);
```

## Next Steps

- [Interactive Creation](/typescript/creating-annotations/interactive) - Let users draw annotations
- [Styling](/typescript/styling/arrow-styles) - Customize annotation appearance
- [Managing Annotations](/typescript/managing/modification) - Update and modify annotations
- [Events](/typescript/core-concepts/events) - Listen to annotation changes
