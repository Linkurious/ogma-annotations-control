# Programmatic Creation

Learn how to create annotations programmatically in React using the annotations context.

## Overview

In React, you access the annotation controller through the `useAnnotationsContext` hook. The controller provides all the methods for creating and managing annotations programmatically.

## Basic Example

```tsx
import React from "react";
import { useAnnotationsContext } from "@linkurious/ogma-annotations-react";
import {
  createText,
  createArrow,
  createBox
} from "@linkurious/ogma-annotations";

function AnnotationControls() {
  const { editor } = useAnnotationsContext();

  const handleAddText = React.useCallback(() => {
    const text = createText(100, 100, 200, 60, "Hello from React!", {
      fontSize: 16,
      color: "#2c3e50",
      background: "#ecf0f1",
      padding: 12
    });
    editor.add(text);
  }, [editor]);

  const handleAddArrow = React.useCallback(() => {
    const arrow = createArrow(50, 50, 250, 200, {
      strokeColor: "#3498db",
      strokeWidth: 2,
      head: "arrow"
    });
    editor.add(arrow);
  }, [editor]);

  const handleAddBox = React.useCallback(() => {
    const box = createBox(0, 0, 300, 200, {
      background: "rgba(52, 152, 219, 0.2)",
      strokeColor: "#3498db",
      strokeWidth: 2
    });
    editor.add(box);
  }, [editor]);

  return (
    <div className="controls">
      <button onClick={handleAddText}>Add Text</button>
      <button onClick={handleAddArrow}>Add Arrow</button>
      <button onClick={handleAddBox}>Add Box</button>
    </div>
  );
}
```

## Creating from Data

```tsx
import React from "react";
import { useAnnotationsContext } from "@linkurious/ogma-annotations-react";
import { createText, createArrow } from "@linkurious/ogma-annotations";

interface AnnotationData {
  type: "text" | "arrow";
  position: { x: number; y: number };
  content?: string;
}

function AnnotationImporter({ data }: { data: AnnotationData[] }) {
  const { editor } = useAnnotationsContext();

  const importAnnotations = React.useCallback(() => {
    data.forEach((item) => {
      let annotation;

      if (item.type === "text") {
        annotation = createText(
          item.position.x,
          item.position.y,
          200,
          60,
          item.content || ""
        );
      } else if (item.type === "arrow") {
        annotation = createArrow(
          item.position.x,
          item.position.y,
          item.position.x + 100,
          item.position.y + 100
        );
      }

      if (annotation) {
        editor.add(annotation);
      }
    });
  }, [editor, data]);

  return <button onClick={importAnnotations}>Import Annotations</button>;
}
```

## Detailed Documentation

For comprehensive information about creating annotations programmatically, including all annotation types, styling options, and advanced patterns, see the [TypeScript Programmatic Creation guide](/typescript/creating-annotations/programmatic).

The TypeScript documentation covers:

- Creating arrows with different extremity styles
- Creating text annotations with custom styling
- Creating boxes and polygons
- Creating comments with arrows
- Creating linked arrows
- Batch creation patterns
- Importing from JSON data
- Best practices and coordinate systems

## See Also

- [Interactive Creation](/react/creating-annotations/interactive) - Let users draw annotations
- [TypeScript Programmatic Creation](/typescript/creating-annotations/programmatic) - Detailed guide
- [`useAnnotationsContext`](/react/core-concepts/hooks) - Access the annotation controller
- [React API Reference](/react/api/) - Full React API documentation
