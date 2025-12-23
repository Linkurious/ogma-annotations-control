# Text and Shape Styles

Learn how to style text, boxes, polygons, and comments in React using the annotations context.

## Overview

In React, you access the annotation controller through the `useAnnotationsContext` hook to update styles for text annotations, boxes, polygons, and comments.

## Updating Text Styles

```tsx
import React from "react";
import { useAnnotationsContext } from "@linkurious/ogma-annotations-react";

function TextStyleControls({ textId }: { textId: string }) {
  const { editor } = useAnnotationsContext();

  const updateStyle = React.useCallback(
    (updates: any) => {
      const text = editor.getAnnotation(textId);

      if (text && text.properties.type === "text") {
        Object.assign(text.properties.style, updates);
        editor.update(text);
      }
    },
    [editor, textId]
  );

  return (
    <div className="text-controls">
      <label>
        Font Size:
        <input
          type="number"
          min="8"
          max="32"
          onChange={(e) =>
            updateStyle({ fontSize: Number(e.target.value) })
          }
        />
      </label>

      <label>
        Text Color:
        <input
          type="color"
          onChange={(e) => updateStyle({ color: e.target.value })}
        />
      </label>

      <label>
        Background:
        <input
          type="color"
          onChange={(e) => updateStyle({ background: e.target.value })}
        />
      </label>

      <label>
        Border Radius:
        <input
          type="range"
          min="0"
          max="20"
          onChange={(e) =>
            updateStyle({ borderRadius: Number(e.target.value) })
          }
        />
      </label>
    </div>
  );
}
```

## Styling Multiple Annotations

```tsx
import React from "react";
import { useAnnotationsContext } from "@linkurious/ogma-annotations-react";

function BulkStyleControls() {
  const { editor } = useAnnotationsContext();

  const applyTheme = React.useCallback(
    (theme: any) => {
      const selected = editor.getSelectedAnnotations();

      selected.features.forEach((feature) => {
        if (feature.properties.style) {
          Object.assign(feature.properties.style, theme);
          editor.update(feature);
        }
      });
    },
    [editor]
  );

  const themes = {
    primary: {
      color: "#2c3e50",
      background: "#ecf0f1",
      strokeColor: "#3498db",
      strokeWidth: 2
    },
    highlight: {
      color: "#ffffff",
      background: "#f39c12",
      strokeColor: "#e67e22",
      strokeWidth: 2
    },
    success: {
      color: "#ffffff",
      background: "#27ae60",
      strokeColor: "#229954",
      strokeWidth: 2
    }
  };

  return (
    <div className="theme-controls">
      <button onClick={() => applyTheme(themes.primary)}>
        Primary Theme
      </button>
      <button onClick={() => applyTheme(themes.highlight)}>
        Highlight Theme
      </button>
      <button onClick={() => applyTheme(themes.success)}>
        Success Theme
      </button>
    </div>
  );
}
```

## Updating Box Styles

```tsx
import React from "react";
import { useAnnotationsContext } from "@linkurious/ogma-annotations-react";

function BoxStyleControls({ boxId }: { boxId: string }) {
  const { editor } = useAnnotationsContext();

  const updateOpacity = React.useCallback(
    (opacity: number) => {
      const box = editor.getAnnotation(boxId);

      if (box && box.properties.type === "box") {
        // Convert opacity to rgba background
        const baseColor = "52, 152, 219"; // RGB for #3498db
        box.properties.style.background = `rgba(${baseColor}, ${opacity})`;
        editor.update(box);
      }
    },
    [editor, boxId]
  );

  return (
    <label>
      Opacity:
      <input
        type="range"
        min="0"
        max="1"
        step="0.1"
        onChange={(e) => updateOpacity(Number(e.target.value))}
      />
    </label>
  );
}
```

## Detailed Documentation

For comprehensive information about styling text, boxes, polygons, and comments, including all available style options, typography settings, color formats, and best practices, see the [TypeScript Text and Shape Styles guide](/typescript/styling/text-styles).

The TypeScript documentation covers:
- Text typography (font family, size, weight, alignment)
- Background and border styling
- Fixed-size text annotations
- Box and polygon styling
- Comment styling
- Color format options
- Default styles for all annotation types
- Theme-based styling patterns
- Best practices for readability and consistency

## See Also

- [Arrow Styles](/react/styling/arrow-styles) - Style arrows
- [TypeScript Text Styles](/typescript/styling/text-styles) - Detailed styling guide
- [`useAnnotationsContext`](/react/core-concepts/hooks) - Access the annotation controller
- [`TextStyle`](/typescript/api/interfaces/TextStyle) - Text style interface reference
- [`BoxStyle`](/typescript/api/interfaces/BoxStyle) - Box style interface reference
