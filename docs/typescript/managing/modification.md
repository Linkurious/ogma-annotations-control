# Modification and State Management

Learn how to update annotations, track changes with undo/redo, and manage annotation state throughout your application's lifecycle.

## Updating Annotations

The `update()` method allows you to modify existing annotations:

```typescript
// Get an annotation
const annotation = controller.getAnnotation("text-id");

if (annotation && annotation.properties.type === "text") {
  // Modify properties
  annotation.properties.content = "Updated text";
  annotation.properties.style.color = "#e74c3c";
  annotation.properties.style.fontSize = 18;

  // Apply the changes
  controller.update(annotation);
}
```

The update method triggers an `update` event and records the change in the history stack for undo/redo.

### Update Event

Listen for updates to react to annotation changes:

```typescript
controller.on("update", (event) => {
  console.log("Updated:", event.feature);
  console.log("Type:", event.feature.properties.type);
});
```

## Undo and Redo

The controller maintains a history stack of all changes, enabling undo and redo functionality.

### Basic Undo/Redo

```typescript
// Undo the last change
controller.undo();

// Redo the last undone change
controller.redo();
```

### Check Undo/Redo Availability

Before calling undo or redo, check if operations are available:

```typescript
if (controller.canUndo()) {
  controller.undo();
  console.log("Undid last change");
} else {
  console.log("Nothing to undo");
}

if (controller.canRedo()) {
  controller.redo();
  console.log("Redid last change");
} else {
  console.log("Nothing to redo");
}
```

### Clear History

Reset the undo/redo history:

```typescript
// Clear all history
controller.clearHistory();

console.log(controller.canUndo()); // false
console.log(controller.canRedo()); // false
```

### History Events

Track history changes:

```typescript
controller.on("history", (event) => {
  console.log("History changed");
  console.log("Can undo:", controller.canUndo());
  console.log("Can redo:", controller.canRedo());
});
```

See [`HistoryEvent`](/typescript/api/interfaces/HistoryEvent) for event details.

## Complete State Management Example

Build a full-featured annotation editor with undo/redo:

```typescript
import { Control } from "@linkurious/ogma-annotations";

class AnnotationEditor {
  private controller: Control;
  private undoButton: HTMLButtonElement;
  private redoButton: HTMLButtonElement;

  constructor(ogma: Ogma) {
    this.controller = new Control(ogma);

    // Get UI buttons
    this.undoButton = document.getElementById("undo") as HTMLButtonElement;
    this.redoButton = document.getElementById("redo") as HTMLButtonElement;

    this.setupEventListeners();
    this.updateHistoryButtons();
  }

  private setupEventListeners() {
    // Update history buttons on any change
    this.controller.on("history", () => {
      this.updateHistoryButtons();
    });

    // Undo button
    this.undoButton.addEventListener("click", () => {
      if (this.controller.canUndo()) {
        this.controller.undo();
      }
    });

    // Redo button
    this.redoButton.addEventListener("click", () => {
      if (this.controller.canRedo()) {
        this.controller.redo();
      }
    });

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      // Ctrl/Cmd + Z: Undo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (this.controller.canUndo()) {
          this.controller.undo();
        }
      }

      // Ctrl/Cmd + Shift + Z: Redo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        if (this.controller.canRedo()) {
          this.controller.redo();
        }
      }

      // Ctrl/Cmd + Y: Redo (alternative)
      if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        if (this.controller.canRedo()) {
          this.controller.redo();
        }
      }
    });
  }

  private updateHistoryButtons() {
    this.undoButton.disabled = !this.controller.canUndo();
    this.redoButton.disabled = !this.controller.canRedo();
  }

  // Modify annotation with undo support
  updateAnnotationText(id: string, newText: string) {
    const annotation = this.controller.getAnnotation(id);

    if (annotation && annotation.properties.type === "text") {
      annotation.properties.content = newText;
      this.controller.update(annotation);
    }
  }

  // Modify annotation style with undo support
  updateAnnotationStyle(id: string, style: Partial<any>) {
    const annotation = this.controller.getAnnotation(id);

    if (annotation) {
      Object.assign(annotation.properties.style, style);
      this.controller.update(annotation);
    }
  }
}
```

## Updating Specific Annotation Types

### Update Text Content and Style

```typescript
const textAnnotation = controller.getAnnotation("text-id");

if (textAnnotation && textAnnotation.properties.type === "text") {
  // Update content
  textAnnotation.properties.content = "New text content";

  // Update style
  textAnnotation.properties.style.fontSize = 18;
  textAnnotation.properties.style.color = "#3498db";
  textAnnotation.properties.style.background = "#ecf0f1";

  // Apply changes
  controller.update(textAnnotation);
}
```

### Update Arrow Endpoints

```typescript
const arrow = controller.getAnnotation("arrow-id");

if (arrow && arrow.properties.type === "arrow") {
  // Move arrow endpoints
  arrow.geometry.coordinates = [
    [10, 10], // Start point
    [200, 200] // End point
  ];

  // Update arrow style
  arrow.properties.style.strokeColor = "#e74c3c";
  arrow.properties.style.head = "arrow";

  controller.update(arrow);
}
```

### Update Box Dimensions

```typescript
const box = controller.getAnnotation("box-id");

if (box && box.properties.type === "box") {
  // Update position and size
  box.geometry.coordinates = [
    [
      [50, 50], // Top-left
      [250, 50], // Top-right
      [250, 200], // Bottom-right
      [50, 200], // Bottom-left
      [50, 50] // Close polygon
    ]
  ];

  // Update style
  box.properties.style.background = "rgba(52, 152, 219, 0.3)";
  box.properties.style.strokeColor = "#3498db";

  controller.update(box);
}
```

### Update Polygon Shape

```typescript
const polygon = controller.getAnnotation("polygon-id");

if (polygon && polygon.properties.type === "polygon") {
  // Update polygon points
  polygon.geometry.coordinates = [
    [
      [0, 0],
      [150, 20],
      [180, 120],
      [80, 200],
      [0, 150],
      [0, 0]
    ]
  ];

  // Update style
  polygon.properties.style.background = "rgba(155, 89, 182, 0.3)";

  controller.update(polygon);
}
```

## Batch Updates

Update multiple annotations efficiently:

```typescript
// Get all text annotations
const all = controller.getAnnotations();
const textAnnotations = all.features.filter(
  (f) => f.properties.type === "text"
);

// Update all text annotations
textAnnotations.forEach((annotation) => {
  if (annotation.properties.type === "text") {
    annotation.properties.style.fontFamily = "Arial, sans-serif";
    annotation.properties.style.fontSize = 14;
    controller.update(annotation);
  }
});
```

## State Persistence

Save and restore annotation state:

```typescript
// Export current state
function saveAnnotations(): string {
  const annotations = controller.getAnnotations();
  return JSON.stringify(annotations);
}

// Restore state
function loadAnnotations(json: string) {
  // Clear existing annotations
  const current = controller.getAnnotations();
  controller.remove(current);

  // Clear history
  controller.clearHistory();

  // Load saved annotations
  const annotations = JSON.parse(json);
  controller.add(annotations);
}

// Usage
const savedState = saveAnnotations();
localStorage.setItem("annotations", savedState);

// Later...
const loadedState = localStorage.getItem("annotations");
if (loadedState) {
  loadAnnotations(loadedState);
}
```

## Best Practices

### 1. Always Use update() for Changes

Don't modify annotation objects without calling `update()`:

```typescript
// Good: Changes are tracked in history
const annotation = controller.getAnnotation(id);
if (annotation) {
  annotation.properties.style.color = "#e74c3c";
  controller.update(annotation); // Tracked in history
}

// Bad: Changes won't be tracked or rendered
const annotation = controller.getAnnotation(id);
if (annotation) {
  annotation.properties.style.color = "#e74c3c";
  // Missing update() call!
}
```

## See Also

- [`Control.update()`](/typescript/api/classes/Control#update) - Update method documentation
- [`Control.undo()`](/typescript/api/classes/Control#undo) - Undo changes
- [`Control.redo()`](/typescript/api/classes/Control#redo) - Redo changes
- [`HistoryEvent`](/typescript/api/interfaces/HistoryEvent) - History event interface
- [Selection](/typescript/managing/selection) - Select annotations
- [Deletion](/typescript/managing/deletion) - Delete annotations
