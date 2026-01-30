# AnnotationsContextProvider

The `AnnotationsContextProvider` is a React Context Provider that manages all annotation state and provides methods to interact with annotations throughout your component tree.

## Overview

The provider wraps your components and gives them access to:

- The annotations editor (Control instance)
- All annotations in the graph
- Currently selected annotation
- Style state for arrows and text
- History management (undo/redo)
- Drawing and annotation management methods

<!--
TODO - Alex:
- [ ] Create React Component Tree diagram: Ogma → AnnotationsContextProvider → Your Components (with data flow arrows)
-->

## Basic Usage

Wrap your components with the provider inside the Ogma component:

```tsx
import { Ogma } from "@linkurious/ogma-react";
import { AnnotationsContextProvider } from "@linkurious/ogma-annotations-react";

function App() {
  return (
    <Ogma graph={graph}>
      <AnnotationsContextProvider>
        <YourComponents />
      </AnnotationsContextProvider>
    </Ogma>
  );
}
```

::: tip Component Hierarchy
The `AnnotationsContextProvider` must be placed **inside** the `Ogma` component, as it depends on the Ogma instance.
:::

## Props

### annotations (optional)

Load initial annotations when the provider mounts:

```tsx
import { AnnotationCollection } from "@linkurious/ogma-annotations";

const initialAnnotations: AnnotationCollection = {
  type: "FeatureCollection",
  features: [
    // ... your annotations
  ]
};

<AnnotationsContextProvider annotations={initialAnnotations}>
  <YourComponents />
</AnnotationsContextProvider>;
```

This is useful when loading annotations from:

- A database or API
- LocalStorage
- A file upload
- Server-side rendering

### children (required)

The React components that will have access to the annotations context:

```tsx
<AnnotationsContextProvider>
  <Toolbar />
  <StylePanel />
  <AnnotationsList />
</AnnotationsContextProvider>
```

## How It Works

### Automatic Setup

When the provider mounts, it automatically:

1. Creates a `Control` instance (the annotations editor)
2. Attaches it to the Ogma instance
3. Loads any initial annotations
4. Sets up event listeners
5. Manages internal state

### Event Synchronization

The provider keeps React state synchronized with the annotations editor by listening to events:

```typescript
// Simplified internal implementation
editor
  .on("add", () => {
    setAnnotations(editor.getAnnotations());
  })
  .on("remove", () => {
    setAnnotations(editor.getAnnotations());
  })
  .on("select", (selection) => {
    setCurrentAnnotation(selection);
    setArrowStyle(/* style from selected annotation */);
  })
  .on("history", () => {
    setCanUndo(editor.canUndo());
    setCanRedo(editor.canRedo());
  });
```

This means your React components automatically re-render when annotations change!

### Automatic Cleanup

When the component unmounts, the provider automatically:

- Destroys the Control instance
- Removes all event listeners
- Cleans up internal state

## State Management

The provider manages several pieces of state:

### Annotations State

```tsx
const { annotations } = useAnnotationsContext();

console.log(annotations); // AnnotationCollection
console.log(annotations.features.length); // Number of annotations
```

### Selection State

```tsx
const { currentAnnotation, setCurrentAnnotation } = useAnnotationsContext();

if (currentAnnotation) {
  console.log("Selected:", currentAnnotation.id);
}
```

### Style State

The provider tracks separate styles for arrows and text:

```tsx
const { arrowStyle, setArrowStyle, textStyle, setTextStyle } =
  useAnnotationsContext();

// Update arrow style
setArrowStyle({
  ...arrowStyle,
  strokeColor: "#e74c3c"
});

// Update text style
setTextStyle({
  ...textStyle,
  fontSize: 18
});
```

::: tip Automatic Style Application
When you update the style via `setArrowStyle` or `setTextStyle`, the provider automatically applies the changes to the currently selected annotation!
:::

### History State

```tsx
const { canUndo, canRedo, undo, redo } = useAnnotationsContext();

return (
  <>
    <button onClick={undo} disabled={!canUndo}>
      Undo
    </button>
    <button onClick={redo} disabled={!canRedo}>
      Redo
    </button>
  </>
);
```

## Complete Example

Here's a full example showing the provider with multiple features:

```tsx
import React from "react";
import { Ogma } from "@linkurious/ogma-react";
import { AnnotationsContextProvider } from "@linkurious/ogma-annotations-react";
import { AnnotationCollection } from "@linkurious/ogma-annotations";
import "@linkurious/ogma-annotations/style.css";

// Load annotations from storage
async function loadAnnotations(): Promise<AnnotationCollection> {
  const stored = localStorage.getItem("annotations");
  if (stored) {
    return JSON.parse(stored);
  }
  return { type: "FeatureCollection", features: [] };
}

function Toolbar() {
  const { editor, annotations, undo, redo, canUndo, canRedo } =
    useAnnotationsContext();

  // Save annotations when they change
  React.useEffect(() => {
    localStorage.setItem("annotations", JSON.stringify(annotations));
  }, [annotations]);

  const handleArrow = React.useCallback(() => {
    editor.enableArrowDrawing({ strokeColor: "#3498db" });
  }, [editor]);

  const handleText = React.useCallback(() => {
    editor.enableTextDrawing({ fontSize: 16 });
  }, [editor]);

  return (
    <div className="toolbar">
      <button onClick={handleArrow}>Add Arrow</button>
      <button onClick={handleText}>Add Text</button>
      <button onClick={undo} disabled={!canUndo}>
        Undo
      </button>
      <button onClick={redo} disabled={!canRedo}>
        Redo
      </button>
      <span>Annotations: {annotations.features.length}</span>
    </div>
  );
}

function App() {
  const [annotations, setAnnotations] =
    React.useState<AnnotationCollection | null>(null);

  React.useEffect(() => {
    loadAnnotations().then(setAnnotations);
  }, []);

  if (!annotations) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Ogma graph={graph}>
        <AnnotationsContextProvider annotations={annotations}>
          <Toolbar />
        </AnnotationsContextProvider>
      </Ogma>
    </div>
  );
}
```

## Advanced: Multiple Ogma Instances

If you have multiple Ogma instances, each needs its own provider:

```tsx
function Dashboard() {
  return (
    <div className="dashboard">
      <div className="left-panel">
        <Ogma graph={graph1}>
          <AnnotationsContextProvider>
            <Controls />
          </AnnotationsContextProvider>
        </Ogma>
      </div>
      <div className="right-panel">
        <Ogma graph={graph2}>
          <AnnotationsContextProvider>
            <Controls />
          </AnnotationsContextProvider>
        </Ogma>
      </div>
    </div>
  );
}
```

Each provider maintains independent state and editor instances.

## Best Practices

### 1. Keep Provider High in the Tree

Place the provider high enough that all components needing annotations can access it:

```tsx
// ✅ Good: Provider wraps all annotation-related components
<AnnotationsContextProvider>
  <Toolbar />
  <StylePanel />
  <AnnotationsList />
</AnnotationsContextProvider>

// ❌ Avoid: Multiple providers for the same graph
<div>
  <AnnotationsContextProvider>
    <Toolbar />
  </AnnotationsContextProvider>
  <AnnotationsContextProvider>
    <StylePanel />
  </AnnotationsContextProvider>
</div>
```

### 2. Load Initial Data Asynchronously

Load annotations before rendering the provider to avoid empty states:

```tsx
// ✅ Good: Wait for data
function App() {
  const [annotations, setAnnotations] = useState(null);

  useEffect(() => {
    fetchAnnotations().then(setAnnotations);
  }, []);

  if (!annotations) return <Loading />;

  return (
    <AnnotationsContextProvider annotations={annotations}>
      {/* ... */}
    </AnnotationsContextProvider>
  );
}
```

### 3. Don't Mutate Context Values

Always create new objects when updating styles:

```tsx
// ✅ Good: Create new object
setArrowStyle({
  ...arrowStyle,
  strokeColor: "#e74c3c"
});

// ❌ Avoid: Mutate existing object
arrowStyle.strokeColor = "#e74c3c";
setArrowStyle(arrowStyle);
```

## Next Steps

- [useAnnotationsContext Hook](/react/core-concepts/hooks) - Learn about all available context values
- [Creating Annotations](/react/creating-annotations/interactive) - Enable interactive annotation creation
- [Building UI Components](/react/ui-components/toolbar) - Create annotation toolbars
