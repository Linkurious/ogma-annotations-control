# Annotations

Ogma Annotations provides five types of annotations that you can place on your graph to highlight, label, and explain data.

## Overview

All annotations are based on the [GeoJSON specification](https://geojson.org/), making them easy to serialize, store, and share. Each annotation type has specific properties and default behaviors.

<!--
TODO - Alex:
- [ ] Create overview image showing all 5 annotation types on a single graph
-->

## Annotation Types

### Arrow

Arrows are directional lines that connect points on the graph. They can be used to show relationships, flows, or point to specific areas.

<!--
TODO - Alex:
- [ ] Create image: Simple arrow with head
- [ ] Create image: Bidirectional arrow (heads on both ends)
- [ ] Create image: Plain line (no heads)
-->

[**API**](/typescript/api/interfaces/Arrow)

**Default Behavior:**

- By default, arrows have no heads or tails (just a plain line)
- Arrows can be connected to other annotations via [links](#links) (see below)
- When an arrow is linked, moving the target annotation automatically updates the arrow position
- Arrows support interactive editing with handles at both ends

**Example:**

```typescript
import { createArrow } from "@linkurious/ogma-annotations";

// Create a simple arrow
const arrow = createArrow(0, 0, 100, 100, {
  strokeColor: "#3498db",
  strokeWidth: 2,
  head: "arrow"
});

controller.add(arrow);
```

### Text

Text annotations are labels or notes placed at specific positions on the graph. They automatically size to fit their content as you type.

<!--
TODO - Alex:
- [ ] Create image: Text annotation with background
- [ ] Create image: Text annotation being edited
-->

[**API**](/typescript/api/interfaces/Text)

**Default Behavior:**

- Text boxes are positioned by their top-left corner
- Double-click to edit text content
- Text automatically wraps within the box dimensions
- Background has rounded corners by default (`borderRadius: 8`)
- Text scales with graph zoom unless `fixedSize: true`

**Example:**

```typescript
import { createText } from "@linkurious/ogma-annotations";

const label = createText(50, 50, 150, 40, "Important Node", {
  fontSize: 16,
  color: "#2c3e50",
  background: "#ecf0f1"
});

controller.add(label);
```

### Box

Boxes are rectangular areas used to group or highlight parts of the graph.

<!--
TODO - Alex:
- [ ] Create image: Box highlighting a group of nodes
- [ ] Create image: Transparent box with border
-->

[**API**](/typescript/api/interfaces/Box)

**Default Behavior:**

- Boxes have a light gray background by default
- No border by default (`strokeWidth: 0`)
- Positioned by top-left corner
- Boxes scale with graph zoom by default
- Can be resized by dragging corner handles

**Example:**

```typescript
import { createBox } from "@linkurious/ogma-annotations";

const highlight = createBox(0, 0, 200, 150, {
  background: "rgba(52, 152, 219, 0.2)",
  strokeColor: "#3498db",
  strokeWidth: 2
});

controller.add(highlight);
```

### Polygon

Polygons are multi-point shapes that can highlight irregular areas on the graph.

<!--
TODO - Alex:
- [ ] Create image: Polygon highlighting an irregular area
- [ ] Create image: Polygon with transparent fill and colored border
-->

[**API**](/typescript/api/interfaces/Polygon)

**Default Behavior:**

- Transparent background by default
- Black border with 2px width
- Automatically closes the polygon (connects last point to first)
- Click to add vertices during interactive creation
- Press Escape to finish drawing
- Can be edited by dragging vertices

**Example:**

```typescript
import { createPolygon } from "@linkurious/ogma-annotations";

const area = createPolygon(
  [
    [
      [0, 0],
      [100, 0],
      [100, 100],
      [50, 150],
      [0, 100],
      [0, 0] // Closes the polygon
    ]
  ],
  {
    style: {
      background: "rgba(46, 204, 113, 0.3)",
      strokeColor: "#27ae60",
      strokeWidth: 2
    }
  }
);

controller.add(area);
```

### Comment

Comments are special annotations that combine a text box with an arrow pointing to a specific location. They're perfect for annotating specific nodes or areas with detailed notes.

<!--
TODO - Alex:
- [ ] Create image: Comment in collapsed mode
- [ ] Create image: Comment in expanded mode with text visible
-->

[**API**](/typescript/api/interfaces/Comment)

**Default Behavior:**

- Comments can be collapsed to show just an icon or expanded to show full text
- The arrow automatically points from the comment box to the target location
- Comments always have an arrow attached (unlike standalone text)
- Double-click to toggle between collapsed and expanded modes
- Moving a comment updates both the text box and arrow positions

**Interactive Creation Example:**

```typescript
// For interactive creation (user clicks to place)
controller.enableCommentDrawing({
  offsetX: 200,
  offsetY: -150,
  commentStyle: {
    content: "This node is important because...",
    style: {
      color: "#2c3e50",
      background: "#ffffff",
      fontSize: 14,
      font: "Arial"
    }
  },
  arrowStyle: {
    style: {
      strokeColor: "#3498db",
      strokeWidth: 2,
      head: "arrow"
    }
  }
});
```

**Programmatic Creation Example:**

```typescript
import { createCommentWithArrow } from "@linkurious/ogma-annotations";

// Create a comment pointing to a specific location
const { comment, arrow } = createCommentWithArrow(
  100,
  100, // Target position (where arrow starts)
  300,
  50, // Comment position (where arrow points to)
  "Important node!", // Comment text
  {
    commentStyle: {
      style: {
        background: "#FFFACD",
        color: "#333"
      }
    },
    arrowStyle: {
      strokeColor: "#3498db",
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
Always use `createCommentWithArrow()` for programmatic creation, as comments require at least one arrow. The arrow automatically points from the target TO the comment and is linked to it.
:::

## Links

Links are a powerful feature that connect arrows to other annotations or graph elements. When you create a link, the arrow automatically follows the linked target. They are encoded within the annotation arrows themselves.

<!--
TODO - Alex:
- [ ] Create image: Arrow linked to a text annotation (moving text moves arrow)
- [ ] Create image: Arrow linked to a node (moving node moves arrow)
-->

### How Links Work

When an arrow is linked to a target:

1. The arrow's start or end point automatically attaches to the target
2. If the target moves, the arrow updates to maintain the connection
3. If the target is deleted, the link is removed (arrow remains but becomes unlinked)
4. Links are stored in the `arrow.properties.link` property

### What Can Be Linked?

Arrows can link to:

- **Text annotations**: Arrow points to the text box
- **Graph nodes**: Arrow follows node position
- **Comments**: Arrow connects to comment box
- **Boxes**: Arrow attaches to box edges
- **Polygons**: Arrow attaches to polygon edges

### Creating Links

Links are created by setting the `link` property on arrow annotations. This can happen:

1. Automatically during interactive drawing when you click on an annotation or node
2. Programmatically by setting `arrow.properties.link` when creating the arrow

**Example:**

```typescript
import { createArrow, createText } from "@linkurious/ogma-annotations";

// Create a text annotation
const label = createText(100, 100, 150, 40, "Important");
controller.add(label);

// Create an arrow with a link to the text annotation
const arrow = createArrow(0, 0, 100, 120, {
  strokeColor: "#3498db",
  head: "arrow"
});

// Set up the link on the arrow's end point
arrow.properties.link = {
  end: {
    id: label.id,
    side: "end",
    type: "text",
    magnet: { x: 0, y: 0 } // Relative position on the target
  }
};

controller.add(arrow);

// Now when you move the text, the arrow's end follows!
```

::: tip
You can link both the start and end points of an arrow by setting both `arrow.properties.link.start` and `arrow.properties.link.end`.
:::

### Breaking Links

To remove a link, update the arrow and remove the link property:

```typescript
const arrow = controller.getFeature(arrowId);

// Remove the end link
if (arrow.properties.link) {
  delete arrow.properties.link.end;
}

// Or remove all links
arrow.properties.link = undefined;

// Update the annotation
controller.update(arrow);
```

### Detecting Links

Check if an arrow has links by inspecting its properties:

```typescript
const arrow = controller.getFeature(arrowId);

if (arrow.properties.link?.end) {
  console.log("Arrow end is linked to:", arrow.properties.link.end.id);
}

if (arrow.properties.link?.start) {
  console.log("Arrow start is linked to:", arrow.properties.link.start.id);
}
```

## GeoJSON Structure

All annotations follow the GeoJSON Feature format:

```typescript
{
  id: "unique-id",
  type: "Feature",
  geometry: {
    type: "Point" | "LineString" | "Polygon",
    coordinates: [...],
    bbox: [minX, minY, maxX, maxY]  // Optional bounding box
  },
  properties: {
    type: "arrow" | "text" | "box" | "polygon" | "comment",
    style: { /* style properties */ },
    // ... type-specific properties
  }
}
```

This structure makes annotations:

- Easy to serialize to JSON
- Compatible with GIS tools
- Simple to store in databases
- Portable across systems

## Best Practices

### 1. Use the Right Annotation Type

Choose the annotation that best fits your use case:

- **Arrows**: Show direction, relationships, or flows
- **Text**: Label specific items or add notes
- **Boxes**: Group related items or highlight areas
- **Polygons**: Highlight irregular shapes or custom regions
- **Comments**: Add detailed explanations with context

### 2. Consider Zoom Behavior

For labels that should remain readable at all zoom levels:

```typescript
const label = createText(50, 50, 150, 40, "Always Readable", {
  fixedSize: true // Maintains size regardless of zoom
});
```

### 4. Use Transparent Backgrounds for Subtle Highlights

```typescript
const highlight = createBox(0, 0, 200, 150, {
  background: "rgba(52, 152, 219, 0.1)", // Very subtle blue tint
  strokeColor: "#3498db",
  strokeWidth: 2
});
```

## Next Steps

- [Events](/typescript/core-concepts/events) - Listen to annotation changes
- [Creating Annotations](/typescript/creating-annotations/programmatic) - Add annotations programmatically
- [Interactive Creation](/typescript/creating-annotations/interactive) - Let users draw annotations
- [Styling](/typescript/styling/arrow-styles) - Customize annotation appearance
