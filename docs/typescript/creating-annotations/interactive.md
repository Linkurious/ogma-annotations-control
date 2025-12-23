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

::: tip
Polygons require at least 3 points. The system automatically closes the polygon by connecting the last point to the first.
:::

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

::: warning
Using custom mouse handling means you're responsible for handling all edge cases, cancellation, and cleanup. For most use cases, use the built-in `enable*Drawing()` methods instead.
:::

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
