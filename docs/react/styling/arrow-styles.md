# Arrow Styles

Learn how to style arrows in React using the annotations context.

## Overview

In React, you access the annotation controller through the `useAnnotationsContext` hook to update arrow styles dynamically.

## Updating Arrow Styles

```tsx
import React from "react";
import { useAnnotationsContext } from "@linkurious/ogma-annotations-react";

function ArrowStyleControls({ arrowId }: { arrowId: string }) {
  const { editor } = useAnnotationsContext();

  const updateColor = React.useCallback(
    (color: string) => {
      const arrow = editor.getAnnotation(arrowId);

      if (arrow && arrow.properties.type === "arrow") {
        arrow.properties.style.strokeColor = color;
        editor.update(arrow);
      }
    },
    [editor, arrowId]
  );

  const updateWidth = React.useCallback(
    (width: number) => {
      const arrow = editor.getAnnotation(arrowId);

      if (arrow && arrow.properties.type === "arrow") {
        arrow.properties.style.strokeWidth = width;
        editor.update(arrow);
      }
    },
    [editor, arrowId]
  );

  const toggleBidirectional = React.useCallback(() => {
    const arrow = editor.getAnnotation(arrowId);

    if (arrow && arrow.properties.type === "arrow") {
      const hasTail = arrow.properties.style.tail !== "none";
      arrow.properties.style.tail = hasTail ? "none" : "arrow";
      editor.update(arrow);
    }
  }, [editor, arrowId]);

  return (
    <div className="arrow-controls">
      <label>
        Color:
        <input
          type="color"
          onChange={(e) => updateColor(e.target.value)}
        />
      </label>

      <label>
        Width:
        <input
          type="range"
          min="1"
          max="10"
          onChange={(e) => updateWidth(Number(e.target.value))}
        />
      </label>

      <button onClick={toggleBidirectional}>
        Toggle Bidirectional
      </button>
    </div>
  );
}
```

## Styling Selected Arrows

```tsx
import React from "react";
import { useAnnotationsContext } from "@linkurious/ogma-annotations-react";

function StyleSelectedArrows() {
  const { editor } = useAnnotationsContext();

  const applyStyle = React.useCallback(
    (style: any) => {
      const selected = editor.getSelectedAnnotations();

      selected.features.forEach((feature) => {
        if (feature.properties.type === "arrow") {
          Object.assign(feature.properties.style, style);
          editor.update(feature);
        }
      });
    },
    [editor]
  );

  return (
    <div className="style-controls">
      <button
        onClick={() =>
          applyStyle({
            strokeColor: "#3498db",
            strokeWidth: 2,
            head: "arrow"
          })
        }
      >
        Primary Style
      </button>

      <button
        onClick={() =>
          applyStyle({
            strokeColor: "#e74c3c",
            strokeWidth: 3,
            strokeType: "dashed"
          })
        }
      >
        Highlight Style
      </button>
    </div>
  );
}
```

## Detailed Documentation

For comprehensive information about arrow styling, including all available style options, extremity types, color formats, and best practices, see the [TypeScript Arrow Styles guide](/typescript/styling/arrow-styles).

The TypeScript documentation covers:
- All stroke types and their visual appearance
- Extremity styles (arrow heads, tails, dots, halo-dots)
- Color options and formats
- Default arrow styles
- Theme-based styling patterns
- Best practices for consistency and visibility

## See Also

- [Text Styles](/react/styling/text-styles) - Style text, boxes, and other shapes
- [TypeScript Arrow Styles](/typescript/styling/arrow-styles) - Detailed styling guide
- [`useAnnotationsContext`](/react/core-concepts/hooks) - Access the annotation controller
- [`ArrowStyles`](/typescript/api/interfaces/ArrowStyles) - Arrow style interface reference
