# Building a Toolbar

Learn how to build a toolbar component for creating and managing annotations using the React context.

## Overview

A toolbar provides buttons to enable different drawing modes and manage annotations. Use the `useAnnotationsContext` hook to access drawing methods and annotation state.

## Basic Toolbar Example

```tsx
import React from "react";
import { useAnnotationsContext } from "@linkurious/ogma-annotations-react";

function AnnotationToolbar() {
  const { editor } = useAnnotationsContext();

  const enableTextDrawing = React.useCallback(() => {
    editor.enableTextDrawing({
      fontSize: 14,
      color: "#2c3e50",
      background: "#ecf0f1",
      padding: 10
    });
  }, [editor]);

  const enableArrowDrawing = React.useCallback(() => {
    editor.enableArrowDrawing({
      strokeColor: "#3498db",
      strokeWidth: 2,
      head: "arrow"
    });
  }, [editor]);

  const enableBoxDrawing = React.useCallback(() => {
    editor.enableBoxDrawing({
      background: "rgba(52, 152, 219, 0.2)",
      strokeColor: "#3498db",
      strokeWidth: 2
    });
  }, [editor]);

  const enablePolygonDrawing = React.useCallback(() => {
    editor.enablePolygonDrawing({
      style: {
        background: "rgba(46, 204, 113, 0.3)",
        strokeColor: "#27ae60",
        strokeWidth: 2
      }
    });
  }, [editor]);

  const cancelDrawing = React.useCallback(() => {
    editor.cancelDrawing();
  }, [editor]);

  const deleteSelected = React.useCallback(() => {
    const selected = editor.getSelectedAnnotations();
    if (selected.features.length > 0) {
      editor.remove(selected);
    }
  }, [editor]);

  return (
    <div className="toolbar">
      <button onClick={enableTextDrawing} title="Add Text">
        T
      </button>
      <button onClick={enableArrowDrawing} title="Add Arrow">
        →
      </button>
      <button onClick={enableBoxDrawing} title="Add Box">
        ▢
      </button>
      <button onClick={enablePolygonDrawing} title="Add Polygon">
        ◇
      </button>
      <button onClick={cancelDrawing} title="Cancel">
        ✕
      </button>
      <button onClick={deleteSelected} title="Delete">
        🗑
      </button>
    </div>
  );
}

export default AnnotationToolbar;
```

## Toolbar with Active State

Track which drawing mode is active:

```tsx
import React from "react";
import { useAnnotationsContext } from "@linkurious/ogma-annotations-react";

function AnnotationToolbar() {
  const { editor } = useAnnotationsContext();
  const [activeMode, setActiveMode] = React.useState<string | null>(null);

  const enableMode = React.useCallback((mode: string, enableFn: () => void) => {
    enableFn();
    setActiveMode(mode);
  }, []);

  React.useEffect(() => {
    // Reset active mode when drawing is cancelled
    const handleCancel = () => setActiveMode(null);
    const handleComplete = () => setActiveMode(null);

    editor.on("cancelDrawing", handleCancel);
    editor.on("completeDrawing", handleComplete);

    return () => {
      editor.off("cancelDrawing", handleCancel);
      editor.off("completeDrawing", handleComplete);
    };
  }, [editor]);

  return (
    <div className="toolbar">
      <button
        className={activeMode === "text" ? "active" : ""}
        onClick={() =>
          enableMode("text", () =>
            editor.enableTextDrawing({
              fontSize: 14,
              color: "#2c3e50"
            })
          )
        }
      >
        Text
      </button>

      <button
        className={activeMode === "arrow" ? "active" : ""}
        onClick={() =>
          enableMode("arrow", () =>
            editor.enableArrowDrawing({
              strokeColor: "#3498db",
              head: "arrow"
            })
          )
        }
      >
        Arrow
      </button>

      <button
        className={activeMode === "box" ? "active" : ""}
        onClick={() =>
          enableMode("box", () =>
            editor.enableBoxDrawing({
              background: "rgba(52, 152, 219, 0.2)"
            })
          )
        }
      >
        Box
      </button>
    </div>
  );
}
```

## Toolbar with Undo/Redo

Add undo and redo functionality:

```tsx
import React from "react";
import { useAnnotationsContext } from "@linkurious/ogma-annotations-react";

function AnnotationToolbar() {
  const { editor } = useAnnotationsContext();
  const [canUndo, setCanUndo] = React.useState(false);
  const [canRedo, setCanRedo] = React.useState(false);

  React.useEffect(() => {
    const updateHistory = () => {
      setCanUndo(editor.canUndo());
      setCanRedo(editor.canRedo());
    };

    editor.on("history", updateHistory);
    updateHistory();

    return () => {
      editor.off("history", updateHistory);
    };
  }, [editor]);

  const handleUndo = React.useCallback(() => {
    if (editor.canUndo()) {
      editor.undo();
    }
  }, [editor]);

  const handleRedo = React.useCallback(() => {
    if (editor.canRedo()) {
      editor.redo();
    }
  }, [editor]);

  return (
    <div className="toolbar">
      {/* Drawing tools... */}

      <div className="history-controls">
        <button onClick={handleUndo} disabled={!canUndo} title="Undo">
          ↶
        </button>
        <button onClick={handleRedo} disabled={!canRedo} title="Redo">
          ↷
        </button>
      </div>
    </div>
  );
}
```

## See Also

- [Style Panel](/react/ui-components/style-panel) - Build a style editing panel
- [Annotation List](/react/ui-components/annotation-list) - Display and manage annotations
- [Interactive Creation](/react/creating-annotations/interactive) - Drawing mode details
- [`useAnnotationsContext`](/react/core-concepts/hooks) - Context hook reference
- [TypeScript State Management](/typescript/managing/modification) - Undo/redo details
