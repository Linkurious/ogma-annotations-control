# Selection

Learn how to programmatically select and unselect annotations, and handle selection events.

## Overview

The annotations controller provides methods to manage annotation selection. Selected annotations can be visually distinguished and manipulated as a group.

## Selecting Annotations

Use the `select()` method to select annotations programmatically:

```typescript
// Select a single annotation by ID
controller.select("annotation-id");

// Select multiple annotations
controller.select(["annotation-1", "annotation-2", "annotation-3"]);

// Select an annotation object
const annotation = controller.getAnnotation("text-id");
if (annotation) {
  controller.select(annotation);
}
```

## Getting Selected Annotations

Retrieve currently selected annotations using `getSelectedAnnotations()`:

```typescript
// Get the collection of selected annotations
const selected = controller.getSelectedAnnotations();

console.log(`${selected.features.length} annotations selected`);

// Iterate over selected annotations
selected.features.forEach((annotation) => {
  console.log(`Selected: ${annotation.properties.type} (${annotation.id})`);
});
```

The method returns an [`AnnotationCollection`](/typescript/api/interfaces/AnnotationCollection) containing all selected features.

## Unselecting Annotations

Use the `unselect()` method to remove selection:

```typescript
// Unselect specific annotation
controller.unselect("annotation-id");

// Unselect multiple annotations
controller.unselect(["annotation-1", "annotation-2"]);

// Unselect all annotations (no arguments)
controller.unselect();
```

## Selection Events

Listen to selection changes using event handlers:

```typescript
// Listen for selection
controller.on("select", (event) => {
  console.log("Selected:", event.feature);
  console.log("Annotation type:", event.feature.properties.type);
});

// Listen for unselection
controller.on("unselect", (event) => {
  console.log("Unselected:", event.feature);
});
```

See [`FeatureEvents`](/typescript/api/type-aliases/FeatureEvents) for all available events.

## Practical Examples

### Select All Annotations

```typescript
// Get all annotations and select them
const all = controller.getAnnotations();
const ids = all.features.map((f) => f.id);
controller.select(ids);
```

### Select by Type

```typescript
// Select all text annotations
const all = controller.getAnnotations();
const textIds = all.features
  .filter((f) => f.properties.type === "text")
  .map((f) => f.id);

controller.select(textIds);
```

### Toggle Selection

```typescript
function toggleAnnotation(id: string) {
  const selected = controller.getSelectedAnnotations();
  const isSelected = selected.features.some((f) => f.id === id);

  if (isSelected) {
    controller.unselect(id);
  } else {
    controller.select(id);
  }
}
```

### Clear Selection on Background Click

```typescript
import { Control } from "@linkurious/ogma-annotations";

const controller = new Control(ogma);

// Clear selection when clicking on empty space
ogma.events.on("click", (event) => {
  // Check if click was on empty space (not on nodes/edges/annotations)
  if (!event.target) {
    controller.unselect();
  }
});
```

### Multi-Select with Ctrl/Cmd

```typescript
let lastSelectedId: string | null = null;

controller.on("select", (event) => {
  const isMultiSelect = event.originalEvent?.ctrlKey || event.originalEvent?.metaKey;

  if (!isMultiSelect && lastSelectedId && lastSelectedId !== event.feature.id) {
    // Single select mode: unselect previous
    controller.unselect(lastSelectedId);
  }

  lastSelectedId = event.feature.id;
});
```

## Visual Feedback

Selected annotations are automatically highlighted by the controller. The default behavior adds a visual distinction to selected items, but you can customize this through the controller options.

## Best Practices

### 1. Clear Selection Before Batch Operations

```typescript
// Clear selection before importing new annotations
controller.unselect();
controller.add(newAnnotations);
```

### 2. Track Selection State

```typescript
// Keep track of selected IDs in your application state
let selectedIds: string[] = [];

controller.on("select", (event) => {
  if (!selectedIds.includes(event.feature.id)) {
    selectedIds.push(event.feature.id);
  }
});

controller.on("unselect", (event) => {
  selectedIds = selectedIds.filter((id) => id !== event.feature.id);
});
```

### 3. Validate Before Selection

```typescript
function safeSelect(id: string) {
  const annotation = controller.getAnnotation(id);
  if (annotation) {
    controller.select(id);
    return true;
  }
  console.warn(`Annotation ${id} not found`);
  return false;
}
```

## See Also

- [Modification](/typescript/managing/modification) - Update selected annotations
- [Deletion](/typescript/managing/deletion) - Delete selected annotations
- [`FeatureEvents`](/typescript/api/type-aliases/FeatureEvents) - Selection events
- [`Control`](/typescript/api/classes/Control) - Controller API reference
