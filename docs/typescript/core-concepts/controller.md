# Controller

The **Controller** (implemented as the `Control` class) is the central management system for all annotations in your Ogma graph. It provides methods to add, remove, select, and interact with annotations, as well as an event system to respond to changes.

## Overview

Every Ogma Annotations setup starts with creating a Controller instance:

```typescript
import Ogma from "@linkurious/ogma";
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

::: warning Destroy Before Ogma
If you're also destroying the Ogma instance, destroy the controller first:

```typescript
controller.destroy();
ogma.destroy();
```

:::

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
import Ogma from "@linkurious/ogma";
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
