# Deletion

Learn how to remove annotations from the controller, handle deletion events, and manage cleanup operations.

## Removing Annotations

Use the `remove()` method to delete annotations:

```typescript
// Remove by ID
controller.remove("annotation-id");

// Remove by annotation object
const annotation = controller.getAnnotation("text-id");
if (annotation) {
  controller.remove(annotation);
}

// Remove multiple annotations
controller.remove(["annotation-1", "annotation-2", "annotation-3"]);

// Remove a collection
const selected = controller.getSelectedAnnotations();
controller.remove(selected);
```

## Deletion Events

Listen for deletion events to track when annotations are removed:

```typescript
controller.on("remove", (event) => {
  console.log("Removed:", event.feature);
  console.log("Type:", event.feature.properties.type);
  console.log("ID:", event.feature.id);
});
```

See [`FeatureEvents`](/typescript/api/type-aliases/FeatureEvents) for event details.

## Delete Selected Annotations

Common pattern for deleting currently selected items:

```typescript
function deleteSelected() {
  const selected = controller.getSelectedAnnotations();

  if (selected.features.length > 0) {
    controller.remove(selected);
    console.log(`Deleted ${selected.features.length} annotations`);
  } else {
    console.log("No annotations selected");
  }
}

// Bind to Delete key
document.addEventListener("keydown", (e) => {
  if (e.key === "Delete" || e.key === "Backspace") {
    e.preventDefault();
    deleteSelected();
  }
});
```

## Delete All Annotations

Remove all annotations from the controller:

```typescript
function deleteAll() {
  const all = controller.getAnnotations();
  controller.remove(all);

  // Also clear the history
  controller.clearHistory();
}
```

## Delete by Type

Remove all annotations of a specific type:

```typescript
function deleteByType(type: "text" | "arrow" | "box" | "polygon" | "comment") {
  const all = controller.getAnnotations();
  const filtered = all.features.filter((f) => f.properties.type === type);

  if (filtered.length > 0) {
    controller.remove({ type: "FeatureCollection", features: filtered });
    console.log(`Deleted ${filtered.length} ${type} annotations`);
  }
}

// Usage
deleteByType("arrow"); // Delete all arrows
deleteByType("text"); // Delete all text annotations
```

## Delete with Confirmation

Add user confirmation before deletion:

```typescript
async function deleteWithConfirmation(ids: string | string[]) {
  const idArray = Array.isArray(ids) ? ids : [ids];
  const count = idArray.length;

  const confirmed = confirm(
    `Are you sure you want to delete ${count} annotation${count > 1 ? "s" : ""}?`
  );

  if (confirmed) {
    controller.remove(idArray);
    return true;
  }
  return false;
}

// Usage
const selected = controller.getSelectedAnnotations();
if (selected.features.length > 0) {
  await deleteWithConfirmation(selected.features.map((f) => f.id));
}
```

## Undo Deletion

Deletions are tracked in the history stack and can be undone:

```typescript
// Delete an annotation
controller.remove("annotation-id");

// Later, undo the deletion
if (controller.canUndo()) {
  controller.undo(); // Annotation is restored
}
```

## Special Cases

### Delete Linked Arrows

Comments are linked to arrows. When deleting a comment, know that all its linked arrows will also be deleted. For the rest of features, when deleting an annotation, check for linked arrows:

```typescript
function deleteWithLinks(id: string) {
  const all = controller.getAnnotations();
  const annotation = all.features.find((f) => f.id === id);

  if (!annotation) return;

  // Find arrows linked to this annotation
  const linkedArrows = all.features.filter((f) => {
    if (f.properties.type !== "arrow") return false;

    const link = f.properties.link;
    return (
      (link?.start?.id === id &&
        link?.start?.type === annotation.properties.type) ||
      (link?.end?.id === id && link?.end?.type === annotation.properties.type)
    );
  });

  // Delete the annotation
  controller.remove(annotation);

  // delete linked arrows
  linkedArrows.forEach((arrow) => controller.remove(arrow));
}
```

## Keyboard Shortcuts

Implement standard deletion shortcuts:

```typescript
document.addEventListener("keydown", (e) => {
  // Delete key
  if (e.key === "Delete") {
    e.preventDefault();
    const selected = controller.getSelectedAnnotations();
    if (selected.features.length > 0) {
      controller.remove(selected);
    }
  }

  // Backspace (with confirmation to prevent accidental deletion)
  if (e.key === "Backspace") {
    e.preventDefault();
    const selected = controller.getSelectedAnnotations();

    if (selected.features.length > 0) {
      const confirmed = confirm(
        `Delete ${selected.features.length} selected annotation(s)?`
      );
      if (confirmed) {
        controller.remove(selected);
      }
    }
  }
});
```

## See Also

- [`Control.remove()`](/typescript/api/classes/Control#remove) - Remove method documentation
- [`deleteCommentWithArrows`](/typescript/api/functions/deleteCommentWithArrows) - Delete comments with linked arrows
- [`FeatureEvents`](/typescript/api/type-aliases/FeatureEvents) - Deletion events
- [Selection](/typescript/managing/selection) - Select annotations for deletion
- [Modification](/typescript/managing/modification) - Undo deletions
