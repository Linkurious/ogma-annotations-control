# Ogma Annotations - TypeScript Reference

> Core TypeScript API, usage patterns, and examples for @linkurious/ogma-annotations
> Auto-generated: 2026-02-19 | Version: 2.x

---

## Installation & Setup

# Installation & Setup

This guide covers how to install and set up Ogma Annotations in your TypeScript or JavaScript project.

## Prerequisites

Before installing Ogma Annotations, you need:

- **Ogma** (version 5.3.8 or higher) installed in your project - [Ogma installation guide](https://doc.linkurious.com/ogma/latest/tutorials/getting-started/install.html))
- A modern JavaScript environment with ES6 module support
- For TypeScript users: TypeScript 4.5 or higher (optional but recommended)

## Installation

Install the package using your preferred package manager:


```bash [npm]
npm install -S @linkurious/ogma-annotations
```

```bash [yarn]
yarn add @linkurious/ogma-annotations
```

```bash [pnpm]
pnpm add @linkurious/ogma-annotations
```


## Basic Setup

### 1. Import the Library

```typescript
import { Ogma } from "@linkurious/ogma";
import { Control } from "@linkurious/ogma-annotations";
// CSS for styling the comment inputs and handles
import "@linkurious/ogma-annotations/style.css";
```

### 2. Create a Controller

The `Control` class is the main entry point to the annotations system:

```typescript
// First, create your Ogma instance
const ogma = new Ogma({
  container: "graph-container"
  // ... other Ogma options
});

// Then create the annotations controller
const controller = new Control(ogma);
```

That's it! Your annotations system is now ready to use.

## TypeScript Configuration

If you're using TypeScript, the package includes full type definitions out of the box. No additional configuration is needed.

## Integration with Existing Ogma Setup

### Adding to an Existing Project

If you already have an Ogma graph, simply create a controller and start adding annotations:

```typescript
// Your existing Ogma setup
const ogma = new Ogma({ container: "graph-container" });

ogma.addNodes([
  { id: 1, x: -100, y: 0 },
  { id: 2, x: 100, y: 0 }
]);

ogma.addEdges([{ id: "e1", source: 1, target: 2 }]);

// Add annotations controller
const controller = new Control(ogma);

// Now you can add annotations
const arrow = createArrow(-100, 0, 100, 0, { stroke: "#3498db" });
controller.add(arrow);
```

## Cleanup

When you're done with annotations (e.g., when unmounting a component or destroying the graph), clean up the controller:

```typescript
// Remove all annotations and event listeners
controller.destroy();

// Or if you're also destroying Ogma
controller.destroy();
ogma.destroy();
```

## Troubleshooting

### Ogma Peer Dependency

Ogma Annotations requires Ogma as a peer dependency. If you see warnings:

- [Ogma installation guide](https://doc.linkurious.com/ogma/latest/tutorials/getting-started/install.html)

## Next Steps

Now that you have Ogma Annotations installed:

- [Learn Core Concepts](/typescript/core-concepts/controller) - Understand the Controller, Annotations, and Events
- [Create Annotations](/typescript/creating-annotations/programmatic) - Start adding arrows and text
- [Explore Examples](/examples/typescript/basic) - See complete working examples
- [API Reference](/api/classes/Control) - Detailed API documentation

## React Users

If you're building with React, check out the React-specific guide:

- [React Installation](/react/installation) - Set up the React wrapper
- [React Core Concepts](/react/core-concepts/provider) - Learn about hooks and context

---

## Controller

# Controller

The **Controller** (implemented as the `Control` class) is the central management system for all annotations in your Ogma graph. It provides methods to add, remove, select, and interact with annotations, as well as an event system to respond to changes.

## Overview

Every Ogma Annotations setup starts with creating a Controller instance:

```typescript
import { Ogma } from "@linkurious/ogma";
import { Control } from "@linkurious/ogma-annotations";

const ogma = new Ogma({ container: "graph-container" });
const controller = new Control(ogma);
```

The controller maintains the state of all annotations and coordinates their rendering with the Ogma instance.

<!--
TODO - Alex:
- [ ] Create Controller lifecycle diagram: Initialization → Adding annotations → Events → Cleanup
-->

## Core Responsibilities

The Controller handles:

1. **Annotation Management** - Adding, removing, and tracking all annotations
2. **Selection State** - Managing which annotation is currently selected
3. **Event Dispatching** - Notifying your code when annotations change
4. **User Interaction** - Handling interactive creation and editing
5. **Rendering Coordination** - Working with Ogma to display annotations

## Basic Usage

### Adding Annotations

Use the `add()` method to add annotations to the controller:

```typescript
import { createArrow, createText } from "@linkurious/ogma-annotations";

const arrow = createArrow(0, 0, 100, 100, { stroke: "#ff6b6b" });
controller.add(arrow);

const text = createText(50, 50, "Label", { fontSize: 16 });
controller.add(text);
```

You can also add multiple annotations at once:

```typescript
const annotations = [
  createArrow(0, 0, 100, 100),
  createArrow(0, 0, -100, -100),
  createText(0, 0, "Center")
];

annotations.forEach((annotation) => controller.add(annotation));
```

### Accessing Annotations

Get all annotations managed by the controller:

```typescript
const allAnnotations = controller.getAnnotations();
console.log(`Total annotations: ${allAnnotations.length}`);
```

Get a specific annotation by ID:

```typescript
const annotation = controller.getAnnotation(annotationId);
if (annotation) {
  console.log("Found:", annotation);
}
```

### Removing Annotations

Remove an annotation by reference:

```typescript
controller.remove(arrow);
```

Remove by ID:

```typescript
controller.removeById(annotationId);
```

Remove all annotations:

```typescript
controller.clear();
```

## Selection

The controller maintains a selection state - at most one annotation can be selected at a time.

### Getting Selection

```typescript
const selected = controller.getSelectedAnnotation();
if (selected) {
  console.log("Selected annotation:", selected.id);
} else {
  console.log("No annotation selected");
}
```

### Setting Selection

```typescript
// Select an annotation
controller.select(arrow);

// Or select by ID
controller.selectById(annotationId);

// Deselect
controller.deselect();
```

### Selection Events

Listen for selection changes:

```typescript
controller.on("select", (annotation) => {
  console.log("Selected:", annotation.id);
});

controller.on("deselect", (annotation) => {
  console.log("Deselected:", annotation.id);
});
```

## Event System

The controller emits events for all significant changes. This allows you to react to user interactions and update your UI accordingly.

### Available Events

| Event      | Description                  | Payload                   |
| ---------- | ---------------------------- | ------------------------- |
| `add`      | An annotation was added      | The added annotation      |
| `remove`   | An annotation was removed    | The removed annotation    |
| `update`   | An annotation was modified   | The updated annotation    |
| `select`   | An annotation was selected   | The selected annotation   |
| `deselect` | An annotation was deselected | The deselected annotation |
| `clear`    | All annotations were removed | `undefined`               |

### Listening to Events

```typescript
// Listen for additions
controller.on("add", (annotation) => {
  console.log("New annotation:", annotation);
  updateAnnotationList();
});

// Listen for updates
controller.on("update", (annotation) => {
  console.log("Modified:", annotation);
  refreshUI();
});

// Listen for removals
controller.on("remove", (annotation) => {
  console.log("Removed:", annotation.id);
  updateCount();
});
```

### One-Time Listeners

For events you only need to hear once:

```typescript
controller.once("add", (annotation) => {
  console.log("First annotation added!");
  showWelcomeMessage();
});
```

### Removing Listeners

```typescript
const handler = (annotation) => {
  console.log("Added:", annotation);
};

// Add listener
controller.on("add", handler);

// Remove listener
controller.off("add", handler);
```

Remove all listeners for an event:

```typescript
controller.off("add"); // Removes all 'add' listeners
```

## Interactive Creation

The controller provides methods to enable user-driven annotation creation:

### Enable Arrow Drawing

Use `enableArrowDrawing()` to let users draw arrows by clicking and dragging:

```typescript
// Enable arrow drawing mode
controller.enableArrowDrawing({
  strokeType: "plain",
  strokeColor: "#3498db",
  strokeWidth: 2,
  head: "arrow"
});

// Listen for completion
controller.once("completeDrawing", (annotation) => {
  console.log("Arrow created:", annotation);
});

// Listen for cancellation (e.g., user pressed Escape)
controller.once("cancelDrawing", () => {
  console.log("Drawing cancelled");
});
```

When this method is called, the user can:

1. Click on the graph to set the arrow's start point
2. Drag to set the arrow's end point
3. Release to complete the arrow
4. Press Escape to cancel

### Enable Text Drawing

Use `enableTextDrawing()` to let users create text annotations:

```typescript
// Enable text drawing mode
controller.enableTextDrawing({
  font: "Arial",
  fontSize: 16,
  color: "#2c3e50",
  background: "#ffffff",
  borderRadius: 4,
  padding: 8
});

// Listen for completion
controller.once("completeDrawing", (annotation) => {
  console.log("Text created:", annotation);
});

// Listen for cancellation
controller.once("cancelDrawing", () => {
  console.log("Drawing cancelled");
});
```

When this method is called, the user can:

1. Click on the graph to place the text
2. Drag to size the text box
3. Type to edit the content
4. Click outside or press Enter to complete
5. Press Escape to cancel

### Cancel Drawing

To programmatically cancel an ongoing drawing operation:

```typescript
controller.cancelDrawing();
```

This will trigger the `cancelDrawing` event.

## Controller Options

When creating a controller, you can pass options:

```typescript
const controller = new Control(ogma, {
  // Options will be added here in future versions
});
```

Currently, the controller uses sensible defaults and doesn't require configuration.

## Advanced: Controller State

The controller maintains internal state about:

- **All annotations** - The complete list of managed annotations
- **Selection** - The currently selected annotation (if any)
- **Interaction mode** - Whether the user is currently creating/editing an annotation

You generally don't need to access this state directly, but it's useful to understand:

```typescript
// Check if something is selected
if (controller.getSelectedAnnotation()) {
  console.log("User has selected an annotation");
}

// Check annotation count
const count = controller.getAnnotations().length;
console.log(`Managing ${count} annotations`);
```

## Lifecycle and Cleanup

### Initialization

The controller is ready to use immediately after creation:

```typescript
const controller = new Control(ogma);
// Ready to use!
```

### Cleanup

When you're done with the controller (e.g., unmounting a component or destroying the graph):

```typescript
// Remove all annotations and clean up
controller.destroy();
```

This will:

- Remove all annotations from the display
- Remove all event listeners
- Clean up internal state

If you're also destroying the Ogma instance, destroy the controller first:

```typescript
controller.destroy();
ogma.destroy();
```


## Best Practices

### 1. One Controller Per Ogma Instance

```typescript
// ✅ Good: One controller per Ogma instance
const ogma = new Ogma({ container: "graph" });
const controller = new Control(ogma);

// ❌ Avoid: Multiple controllers for the same Ogma instance
const controller1 = new Control(ogma);
const controller2 = new Control(ogma); // Don't do this!
```

### 2. Use Events for UI Updates

```typescript
// ✅ Good: React to events
controller.on("add", () => {
  updateAnnotationCount();
  refreshUI();
});

// ❌ Avoid: Polling
setInterval(() => {
  const count = controller.getAnnotations().length;
  // This is inefficient
}, 1000);
```

### 3. Clean Up When Done

```typescript
// ✅ Good: Clean up properly
function cleanup() {
  controller.destroy();
  ogma.destroy();
}

// In a React component
useEffect(() => {
  const controller = new Control(ogma);
  return () => controller.destroy(); // Cleanup on unmount
}, [ogma]);
```

### 4. Separate Concerns

```typescript
// ✅ Good: Keep UI logic separate
controller.on("select", (annotation) => {
  updateStylePanel(annotation);
  highlightInList(annotation);
});

// Business logic
controller.on("add", (annotation) => {
  logAnalytics("annotation_created", annotation.type);
  saveToBackend(annotation);
});
```

## Examples

### Complete Setup with Events

```typescript
import { Ogma } from "@linkurious/ogma";
import { Control, createArrow, createText } from "@linkurious/ogma-annotations";

// Initialize
const ogma = new Ogma({ container: "graph-container" });
const controller = new Control(ogma);

// Set up event handlers
controller.on("add", (annotation) => {
  console.log("Added:", annotation.type, annotation.id);
  document.getElementById("count").textContent = String(
    controller.getAnnotations().length
  );
});

controller.on("select", (annotation) => {
  console.log("Selected:", annotation.id);
  showStylePanel(annotation);
});

controller.on("remove", (annotation) => {
  console.log("Removed:", annotation.id);
  hideStylePanelIfEmpty();
});

// Add some annotations
controller.add(createArrow(0, 0, 100, 100, { stroke: "#e74c3c" }));
controller.add(createText(50, 50, "Example", { fontSize: 16 }));

// Cleanup function
function cleanup() {
  controller.destroy();
  ogma.destroy();
}
```

### Interactive Annotation Creation

```typescript
function enableDrawingMode(type: "arrow" | "text") {
  if (type === "arrow") {
    controller.enableArrowDrawing({
      strokeType: "plain",
      strokeColor: "#3498db",
      strokeWidth: 2,
      head: "arrow"
    });
  } else {
    controller.enableTextDrawing({
      font: "Arial",
      fontSize: 14,
      color: "#2c3e50",
      background: "#ffffff",
      padding: 8
    });
  }

  // Handle completion or cancellation
  const cleanup = () => {
    console.log("Drawing finished");
  };

  controller.once("completeDrawing", cleanup);
  controller.once("cancelDrawing", cleanup);
}

// Usage with buttons
document.getElementById("add-arrow-btn").addEventListener("click", () => {
  enableDrawingMode("arrow");
});

document.getElementById("add-text-btn").addEventListener("click", () => {
  enableDrawingMode("text");
});

// Cancel with Escape key
document.addEventListener("keydown", (evt) => {
  if (evt.key === "Escape") {
    controller.cancelDrawing();
  }
});
```

## API Reference

For complete API documentation including all methods, parameters, and return types, see:

- [Control Class API Reference](/api/classes/Control)

## Next Steps

- [Learn about Annotations](/typescript/core-concepts/annotations) - Understand Arrow and Text types
- [Events Deep Dive](/typescript/core-concepts/events) - Master the event system
- [Creating Annotations](/typescript/creating-annotations/programmatic) - Add annotations programmatically and interactively

---

## Annotation Types

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

Always use `createCommentWithArrow()` for programmatic creation, as comments require at least one arrow. The arrow automatically points from the target TO the comment and is linked to it.


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

You can link both the start and end points of an arrow by setting both `arrow.properties.link.start` and `arrow.properties.link.end`.


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

---

## Creating Annotations Programmatically

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

Polygons use GeoJSON coordinate format: `[[[x1, y1], [x2, y2], ...]]`. Note the triple array nesting - this allows for polygons with holes (not currently supported).


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

Always use `createCommentWithArrow()` rather than creating comments manually. This ensures the arrow is properly linked to the comment, which is required for comments to work correctly.


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

---

## Interactive Drawing

# Interactive creation of Annotations

Learn how to let users draw annotations interactively by clicking and dragging on the graph. This is the recommended approach for most user-facing annotation tools.

## Overview

Interactive creation enables users to:

- Click to place annotations
- Drag to size boxes and arrows
- Click multiple points for polygons
- Draw arrows that automatically link to targets

All annotation types support interactive creation through dedicated `enable*Drawing()` methods.

## Drawing Workflow

The typical workflow for interactive annotation creation:

1. User clicks a toolbar button (e.g., "Add Arrow")
2. Your code calls `controller.enableArrowDrawing()`
3. User clicks on the graph to start drawing
4. User drags/clicks to complete the annotation
5. Annotation is automatically added to the controller

## Drawing Arrows

Enable arrow drawing mode with `enableArrowDrawing()`:

```typescript
// Basic arrow drawing
addArrowButton.addEventListener("click", () => {
  controller.enableArrowDrawing();
});
```

### With Custom Styling

```typescript
addArrowButton.addEventListener("click", () => {
  controller.enableArrowDrawing({
    strokeColor: "#3498db",
    strokeWidth: 2,
    strokeType: "plain",
    head: "arrow",
    tail: "none"
  });
});
```

### Interactive Behavior

When arrow drawing is enabled:

1. User clicks to set the arrow's start point
2. User drags to position the end point
3. Arrow renders in real-time during drag
4. User releases mouse to complete
5. If the end point is over another annotation or node, the arrow automatically links to it

### Automatic Linking

Arrows automatically link when you release the mouse over a target:

```typescript
controller.enableArrowDrawing({ head: "arrow" });

// When user releases mouse over a text annotation:
// - Arrow end automatically links to the text
// - Moving the text will now move the arrow's end point
```

## Drawing Text

Enable text drawing mode with `enableTextDrawing()`:

```typescript
addTextButton.addEventListener("click", () => {
  controller.enableTextDrawing();
});
```

### With Custom Styling

```typescript
addTextButton.addEventListener("click", () => {
  controller.enableTextDrawing({
    fontSize: 16,
    color: "#2c3e50",
    background: "#ecf0f1",
    padding: 12,
    borderRadius: 8
  });
});
```

### Interactive Behavior

When text drawing is enabled:

1. User clicks to place the text box
2. Text box appears with placeholder text
3. User can immediately start typing
4. Box auto-sizes to fit content
5. User presses Enter or clicks outside to finish

## Drawing Boxes

Enable box drawing mode with `enableBoxDrawing()`:

```typescript
addBoxButton.addEventListener("click", () => {
  controller.enableBoxDrawing();
});
```

### With Custom Styling

```typescript
addBoxButton.addEventListener("click", () => {
  controller.enableBoxDrawing({
    background: "rgba(52, 152, 219, 0.2)",
    strokeColor: "#3498db",
    strokeWidth: 2,
    borderRadius: 8
  });
});
```

### Interactive Behavior

When box drawing is enabled:

1. User clicks to set the box's top-left corner
2. User drags to size the box
3. Box renders in real-time during drag
4. User releases mouse to complete

## Drawing Polygons

Enable polygon drawing mode with `enablePolygonDrawing()`:

```typescript
addPolygonButton.addEventListener("click", () => {
  controller.enablePolygonDrawing();
});
```

### With Custom Styling

```typescript
addPolygonButton.addEventListener("click", () => {
  controller.enablePolygonDrawing({
    background: "rgba(46, 204, 113, 0.3)",
    strokeColor: "#27ae60",
    strokeWidth: 2
  });
});
```

### Interactive Behavior

When polygon drawing is enabled:

1. User clicks to place the first vertex
2. User moves mouse (polygon edge follows cursor)
3. User clicks to place additional vertices
4. Polygon closes automatically when user double-clicks or presses Enter
5. Press Escape to cancel

Polygons require at least 3 points. The system automatically closes the polygon by connecting the last point to the first.


## Drawing Comments

Enable comment drawing mode with `enableCommentDrawing()`:

```typescript
addCommentButton.addEventListener("click", () => {
  controller.enableCommentDrawing();
});
```

### With Custom Styling

```typescript
addCommentButton.addEventListener("click", () => {
  controller.enableCommentDrawing({
    commentStyle: {
      content: "Add your comment here...",
      style: {
        background: "#FFFACD",
        color: "#333",
        fontSize: 14,
        padding: 12
      }
    },
    arrowStyle: {
      strokeColor: "#666",
      strokeWidth: 2,
      head: "arrow"
    }
  });
});
```

### Smart Positioning

Comments automatically position themselves to avoid overlapping with other content:

```typescript
// Automatic smart positioning (default)
controller.enableCommentDrawing();

// Manual offset from target
controller.enableCommentDrawing({
  offsetX: 200, // Comment box 200px right of target
  offsetY: -150 // Comment box 150px above target
});
```

### Interactive Behavior

When comment drawing is enabled:

1. User clicks on the target (node, annotation, or empty space)
2. Comment box appears at an optimal position
3. Arrow automatically connects target to comment
4. User can immediately start typing
5. User presses Enter or clicks outside to finish

## Canceling Drawing

Cancel the current drawing operation programmatically:

```typescript
// User clicks cancel button
cancelButton.addEventListener("click", () => {
  controller.cancelDrawing();
});

// Or listen for Escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    controller.cancelDrawing();
  }
});
```

## Drawing Events

Listen to drawing lifecycle events:

```typescript
// Drawing completed
controller.on("completeDrawing", ({ annotation }) => {
  console.log("Created:", annotation);
  // Show success message, update UI, etc.
});

// Drawing canceled
controller.on("cancelDrawing", () => {
  console.log("Drawing canceled");
  // Reset toolbar state
});

// Annotation added
controller.on("add", ({ annotation }) => {
  console.log("Annotation added:", annotation.id);
});
```

## Building a Toolbar

Complete example of an annotation toolbar:

```typescript
import { Control } from "@linkurious/ogma-annotations";

// Create toolbar
const toolbar = document.createElement("div");
toolbar.className = "annotation-toolbar";

// Drawing mode buttons
const buttons = [
  {
    label: "Arrow",
    action: () => controller.enableArrowDrawing({ head: "arrow" })
  },
  {
    label: "Text",
    action: () => controller.enableTextDrawing()
  },
  {
    label: "Box",
    action: () => controller.enableBoxDrawing()
  },
  {
    label: "Polygon",
    action: () => controller.enablePolygonDrawing()
  },
  {
    label: "Comment",
    action: () => controller.enableCommentDrawing()
  },
  {
    label: "Cancel",
    action: () => controller.cancelDrawing()
  }
];

// Create buttons
buttons.forEach(({ label, action }) => {
  const button = document.createElement("button");
  button.textContent = label;
  button.addEventListener("click", action);
  toolbar.appendChild(button);
});

document.body.appendChild(toolbar);
```

### With Active State

Track which drawing mode is active:

```typescript
let activeButton = null;

buttons.forEach(({ label, action }) => {
  const button = document.createElement("button");
  button.textContent = label;

  button.addEventListener("click", () => {
    // Remove active state from previous button
    if (activeButton) {
      activeButton.classList.remove("active");
    }

    // Set active state
    if (label !== "Cancel") {
      button.classList.add("active");
      activeButton = button;
    }

    action();
  });

  toolbar.appendChild(button);
});

// Clear active state when drawing completes
controller.on("completeDrawing", () => {
  if (activeButton) {
    activeButton.classList.remove("active");
    activeButton = null;
  }
});

controller.on("cancelDrawing", () => {
  if (activeButton) {
    activeButton.classList.remove("active");
    activeButton = null;
  }
});
```

## Style Picker Integration

Let users choose annotation styles before drawing:

```typescript
const styleOptions = {
  arrow: {
    color: "#3498db",
    width: 2,
    head: "arrow"
  },
  text: {
    fontSize: 14,
    color: "#2c3e50",
    background: "#ecf0f1"
  }
};

// Color picker
colorPicker.addEventListener("change", (e) => {
  styleOptions.arrow.color = e.target.value;
  styleOptions.text.color = e.target.value;
});

// Width slider
widthSlider.addEventListener("input", (e) => {
  styleOptions.arrow.width = parseInt(e.target.value);
});

// Apply current styles when drawing
addArrowButton.addEventListener("click", () => {
  controller.enableArrowDrawing({
    strokeColor: styleOptions.arrow.color,
    strokeWidth: styleOptions.arrow.width,
    head: styleOptions.arrow.head
  });
});

addTextButton.addEventListener("click", () => {
  controller.enableTextDrawing({
    fontSize: styleOptions.text.fontSize,
    color: styleOptions.text.color,
    background: styleOptions.text.background
  });
});
```

## Advanced: Custom Mouse Handling

For advanced use cases, you can implement custom mouse handling:

```typescript
import { createArrow } from "@linkurious/ogma-annotations";

// Custom click handler
ogma.events.on("click", (evt) => {
  const { x, y } = ogma.view.screenToGraphCoordinates(evt);

  // Create annotation at clicked position
  const arrow = createArrow(x, y, x + 100, y + 100, {
    strokeColor: "#3498db",
    head: "arrow"
  });

  controller.add(arrow);
});
```

Using custom mouse handling means you're responsible for handling all edge cases, cancellation, and cleanup. For most use cases, use the built-in `enable*Drawing()` methods instead.


## Best Practices

### 1. Provide Visual Feedback

Show which drawing mode is active:

```typescript
const enableDrawing = (mode, styleOptions) => {
  // Update cursor
  ogma.view.getContainer().style.cursor = "crosshair";

  // Update toolbar
  updateActiveButton(mode);

  // Enable drawing
  controller[`enable${mode}Drawing`](styleOptions);
};

controller.on("completeDrawing", () => {
  // Reset cursor
  ogma.view.getContainer().style.cursor = "default";
});
```

### 2. Support Keyboard Shortcuts

```typescript
document.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey) {
    switch (e.key) {
      case "a":
        e.preventDefault();
        controller.enableArrowDrawing();
        break;
      case "t":
        e.preventDefault();
        controller.enableTextDrawing();
        break;
      case "b":
        e.preventDefault();
        controller.enableBoxDrawing();
        break;
    }
  }

  if (e.key === "Escape") {
    controller.cancelDrawing();
  }
});
```

### 3. Handle Drawing Completion

```typescript
controller.on("completeDrawing", ({ annotation }) => {
  // Auto-select newly created annotation
  controller.select(annotation.id);

  // Show properties panel
  showPropertiesPanel(annotation);

  // Log for undo/redo UI
  console.log("Created:", annotation.properties.type);
});
```

### 4. Prevent Mode Conflicts

```typescript
let currentMode = null;

const setDrawingMode = (mode, styleOptions) => {
  // Cancel previous mode
  if (currentMode) {
    controller.cancelDrawing();
  }

  // Set new mode
  currentMode = mode;
  controller[`enable${mode}Drawing`](styleOptions);
};

controller.on("completeDrawing", () => {
  currentMode = null;
});

controller.on("cancelDrawing", () => {
  currentMode = null;
});
```

## Next Steps

- [Programmatic Creation](/typescript/creating-annotations/programmatic) - Create annotations from code
- [Styling](/typescript/styling/arrow-styles) - Customize annotation appearance
- [Managing Annotations](/typescript/managing/modification) - Update and modify annotations
- [Events](/typescript/core-concepts/events) - Listen to annotation changes

---

## Quick Reference

### Installation

```bash
npm install @linkurious/ogma-annotations
```

### Basic Setup

```typescript
import Ogma from "@linkurious/ogma";
import { Control, createArrow, createText } from "@linkurious/ogma-annotations";
import "@linkurious/ogma-annotations/style.css";

const ogma = new Ogma({ container: "graph-container" });
const controller = new Control(ogma);
```

### Interactive Drawing (Recommended)

```typescript
// Arrow - click and drag
controller.enableArrowDrawing({ head: "arrow", strokeColor: "#3498db" });

// Text - click to place
controller.enableTextDrawing({ fontSize: 16, color: "#2c3e50" });

// Box - click and drag
controller.enableBoxDrawing({ background: "rgba(52,152,219,0.2)" });

// Polygon - click points, double-click to finish
controller.enablePolygonDrawing({ strokeColor: "#27ae60" });

// Comment - click target, auto-positions
controller.enableCommentDrawing({ commentStyle: { style: { background: "#FFFACD" } } });

// Cancel
controller.cancelDrawing();
```

### Programmatic Creation

```typescript
import { createArrow, createText, createBox, createPolygon, createCommentWithArrow } from "@linkurious/ogma-annotations";

const arrow = createArrow(0, 0, 100, 100, { head: "arrow", strokeColor: "#3498db" });
const text = createText(50, 50, 150, 40, "Label", { fontSize: 16 });
const box = createBox(0, 0, 200, 150, { background: "rgba(52,152,219,0.2)" });
const polygon = createPolygon([[[0,0], [100,0], [50,100], [0,0]]], { style: { strokeColor: "#27ae60" } });
const { comment, arrow: commentArrow } = createCommentWithArrow(100, 100, 250, 50, "Note", {});

controller.add(arrow);
controller.add(text);
```

### History

```typescript
controller.undo();
controller.redo();
controller.canUndo(); // boolean
controller.canRedo(); // boolean
controller.clearHistory();
```

### Selection

```typescript
controller.select(id);
controller.select([id1, id2]);
controller.unselect();
controller.getSelected();
controller.getSelectedAnnotations();
```

### Events

```typescript
controller.on("add", ({ annotation }) => {});
controller.on("remove", ({ annotation }) => {});
controller.on("update", ({ annotation }) => {});
controller.on("select", ({ annotation }) => {});
controller.on("unselect", ({ annotation }) => {});
controller.on("completeDrawing", ({ annotation }) => {});
controller.on("cancelDrawing", () => {});
controller.on("history", ({ canUndo, canRedo }) => {});
```

### Persistence

```typescript
// Save
localStorage.setItem("annotations", JSON.stringify(controller.getAnnotations()));

// Load
const saved = localStorage.getItem("annotations");
if (saved) controller.add(JSON.parse(saved));
```

### Arrow Extremity Types

`"none"` | `"arrow"` | `"arrow-plain"` | `"dot"` | `"halo-dot"`

### Type Guards

```typescript
import { isArrow, isText, isBox, isPolygon, isComment } from "@linkurious/ogma-annotations";
if (isArrow(annotation)) { /* Arrow */ }
```

### Cleanup

```typescript
controller.destroy();
ogma.destroy();
```
