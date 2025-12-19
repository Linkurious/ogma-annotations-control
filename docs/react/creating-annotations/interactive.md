# Interactive Annotation Creation

Learn how to enable users to create annotations by clicking and dragging on the graph.

## Overview

The React wrapper provides the same drawing methods as the core package, accessible through the `editor` from the context. Users can create annotations interactively using button clicks.

## Enable Arrow Drawing

Use `editor.enableArrowDrawing()` to let users draw arrows:

```tsx
import { useAnnotationsContext } from "@linkurious/ogma-annotations-react";

function AddArrowButton() {
  const { editor } = useAnnotationsContext();

  const handleClick = () => {
    editor.enableArrowDrawing({
      strokeType: "plain",
      strokeColor: "#3498db",
      strokeWidth: 2,
      head: "arrow"
    });
  };

  return <button onClick={handleClick}>Add Arrow</button>;
}
```

When clicked, the user can:

1. Click on the graph to set the arrow start point
2. Drag to position the end point
3. Release to complete the arrow
4. Press Escape to cancel

## Enable Text Drawing

Use `editor.enableTextDrawing()` to let users create text annotations:

```tsx
function AddTextButton() {
  const { editor } = useAnnotationsContext();

  const handleClick = () => {
    editor.enableTextDrawing({
      font: "Arial",
      fontSize: 16,
      color: "#2c3e50",
      background: "#ffffff",
      borderRadius: 4,
      padding: 8
    });
  };

  return <button onClick={handleClick}>Add Text</button>;
}
```

When clicked, the user can:

1. Click on the graph to place the text
2. Drag to size the text box
3. Type to edit the content
4. Click outside or press Enter to finish
5. Press Escape to cancel

## Other Drawing Modes

### Box Drawing

```tsx
function AddBoxButton() {
  const { editor } = useAnnotationsContext();

  const handleClick = () => {
    editor.enableBoxDrawing({
      background: "#f0f0f0",
      borderRadius: 8,
      padding: 12
    });
  };

  return <button onClick={handleClick}>Add Box</button>;
}
```

### Polygon Drawing

```tsx
function AddPolygonButton() {
  const { editor } = useAnnotationsContext();

  const handleClick = () => {
    editor.enablePolygonDrawing({
      strokeColor: "#3498db",
      strokeWidth: 2,
      background: "rgba(52, 152, 219, 0.2)"
    });
  };

  return <button onClick={handleClick}>Add Polygon</button>;
}
```

With polygons, users:

1. Click points to create vertices
2. Press Escape to finish the polygon

### Comment Drawing

Comments are text annotations with arrows:

```tsx
function AddCommentButton() {
  const { editor } = useAnnotationsContext();

  const handleClick = () => {
    editor.enableCommentDrawing({
      offsetX: 200,
      offsetY: -150,
      commentStyle: {
        content: "",
        style: {
          color: "#2c3e50",
          background: "#ffffff",
          fontSize: 16,
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
  };

  return <button onClick={handleClick}>Add Comment</button>;
}
```

## Listening to Drawing Events

The editor emits events during the drawing process:

```tsx
function DrawingControls() {
  const { editor } = useAnnotationsContext();

  const handleAddArrow = React.useCallback(() => {
    editor.enableArrowDrawing({
      strokeColor: "#3498db",
      strokeWidth: 2,
      head: "arrow"
    });

    // Listen for completion
    editor.once("completeDrawing", (annotation) => {
      console.log("Arrow created:", annotation);
    });

    // Listen for cancellation
    editor.once("cancelDrawing", () => {
      console.log("Drawing cancelled");
    });
  }, [editor]);

  return <button onClick={handleAddArrow}>Add Arrow</button>;
}
```

## Cancel Drawing

Allow users to cancel drawing with a button or keyboard shortcut:

```tsx
function DrawingControls() {
  const { cancelDrawing } = useAnnotationsContext();

  // Cancel with Escape key
  React.useEffect(() => {
    const handleKeyDown = (evt: KeyboardEvent) => {
      if (evt.key === "Escape") {
        cancelDrawing();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [cancelDrawing]);

  return <button onClick={cancelDrawing}>Cancel Drawing</button>;
}
```

## Complete Toolbar Example

Here's a complete toolbar with all drawing modes:

```tsx
import React from "react";
import { useAnnotationsContext } from "@linkurious/ogma-annotations-react";

function AnnotationToolbar() {
  const { editor, cancelDrawing } = useAnnotationsContext();

  const handleArrow = React.useCallback(() => {
    editor.enableArrowDrawing({
      strokeType: "plain",
      strokeColor: "#3498db",
      strokeWidth: 2,
      head: "arrow"
    });
  }, [editor]);

  const handleText = React.useCallback(() => {
    editor.enableTextDrawing({
      font: "Arial",
      fontSize: 16,
      color: "#2c3e50",
      background: "#ffffff",
      padding: 8
    });
  }, [editor]);

  const handleBox = React.useCallback(() => {
    editor.enableBoxDrawing({
      background: "#f0f0f0",
      borderRadius: 8
    });
  }, [editor]);

  const handlePolygon = React.useCallback(() => {
    editor.enablePolygonDrawing({
      strokeColor: "#3498db",
      strokeWidth: 2,
      background: "rgba(52, 152, 219, 0.2)"
    });
  }, [editor]);

  // Cancel drawing on Escape
  React.useEffect(() => {
    const handleKeyDown = (evt: KeyboardEvent) => {
      if (evt.key === "Escape") {
        cancelDrawing();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [cancelDrawing]);

  return (
    <div className="toolbar">
      <button onClick={handleArrow}>Add Arrow</button>
      <button onClick={handleText}>Add Text</button>
      <button onClick={handleBox}>Add Box</button>
      <button onClick={handlePolygon}>Add Polygon</button>
      <button onClick={cancelDrawing}>Cancel</button>
    </div>
  );
}

export default AnnotationToolbar;
```

<!--
TODO - Alex:
- [ ] Create "Interactive Arrow Creation" GIF: User clicking button then drawing arrow
- [ ] Create "Interactive Text Creation" GIF: User clicking button then creating text
-->

## Button States

Track drawing state to provide visual feedback:

```tsx
function SmartToolbar() {
  const { editor } = useAnnotationsContext();
  const [activeMode, setActiveMode] = React.useState<string | null>(null);

  const enableMode = (mode: string, enableFn: () => void) => {
    setActiveMode(mode);
    enableFn();

    const cleanup = () => setActiveMode(null);
    editor.once("completeDrawing", cleanup);
    editor.once("cancelDrawing", cleanup);
  };

  return (
    <div className="toolbar">
      <button
        className={activeMode === "arrow" ? "active" : ""}
        onClick={() =>
          enableMode("arrow", () =>
            editor.enableArrowDrawing({ strokeColor: "#3498db" })
          )
        }
      >
        Add Arrow
      </button>
      <button
        className={activeMode === "text" ? "active" : ""}
        onClick={() =>
          enableMode("text", () => editor.enableTextDrawing({ fontSize: 16 }))
        }
      >
        Add Text
      </button>
    </div>
  );
}
```

```css
.toolbar button.active {
  background-color: #3498db;
  color: white;
}
```

## Using Current Styles

Use the current style from context for new annotations:

```tsx
function StyledToolbar() {
  const { editor, arrowStyle, textStyle } = useAnnotationsContext();

  const handleArrow = () => {
    // Use current arrow style
    editor.enableArrowDrawing(arrowStyle);
  };

  const handleText = () => {
    // Use current text style
    editor.enableTextDrawing(textStyle);
  };

  return (
    <>
      <button onClick={handleArrow}>Add Arrow (Current Style)</button>
      <button onClick={handleText}>Add Text (Current Style)</button>
    </>
  );
}
```

## Programmatic Creation

For programmatic creation (without user interaction), use `add`:

```tsx
import { createArrow, createText } from "@linkurious/ogma-annotations";

function QuickAddButtons() {
  const { add } = useAnnotationsContext();

  const addArrow = () => {
    const arrow = createArrow(0, 0, 100, 100, {
      strokeColor: "#3498db",
      strokeWidth: 2,
      head: "arrow"
    });
    add(arrow);
  };

  const addText = () => {
    const text = createText(50, 50, "Quick Label", {
      fontSize: 16,
      color: "#2c3e50"
    });
    add(text);
  };

  return (
    <>
      <button onClick={addArrow}>Quick Arrow</button>
      <button onClick={addText}>Quick Text</button>
    </>
  );
}
```

## Best Practices

### 1. Use useCallback for Handlers

Prevent unnecessary re-renders by memoizing handlers:

```tsx
const handleArrow = React.useCallback(() => {
  editor.enableArrowDrawing({...});
}, [editor]);
```

### 2. Clean Up Event Listeners

Always clean up in useEffect:

```tsx
React.useEffect(() => {
  const handler = () => {
    /* ... */
  };
  document.addEventListener("keydown", handler);
  return () => document.removeEventListener("keydown", handler);
}, []);
```

### 3. Provide Visual Feedback

Show users when drawing mode is active:

```tsx
const [isDrawing, setIsDrawing] = useState(false);

const enableDrawing = () => {
  setIsDrawing(true);
  editor.enableArrowDrawing({...});
  editor.once('completeDrawing', () => setIsDrawing(false));
  editor.once('cancelDrawing', () => setIsDrawing(false));
};

return (
  <div className={isDrawing ? 'drawing-mode' : ''}>
    {isDrawing && <div className="hint">Click to place arrow</div>}
    <button onClick={enableDrawing}>Add Arrow</button>
  </div>
);
```

## Next Steps

- [Programmatic Creation](/react/creating-annotations/programmatic) - Create annotations in code
- [Managing Styles](/react/styling/arrow-styles) - Build style controls
- [Building a Complete Toolbar](/react/ui-components/toolbar) - Full toolbar example
- [Examples](/examples/react/simple-toolbar) - Complete working examples
