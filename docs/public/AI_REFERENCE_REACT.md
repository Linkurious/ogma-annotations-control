# Ogma Annotations - React Reference

> React integration with hooks, context provider, and component patterns
> Auto-generated: 2026-02-20 | Version: 2.x

---

## Installation & Setup

# Installation & Setup

This guide covers how to install and set up Ogma Annotations in your React application.

## Prerequisites

Before installing the React wrapper, you need:

- **React** (version 18.0 or higher with Hooks support)
- **Ogma** (version 5.3.8 or higher) installed in your project - [Ogma installation guide](https://doc.linkurious.com/ogma/latest/tutorials/getting-started/install.html))
- **@linkurious/ogma-react** (Ogma's official React bindings)
- **@linkurious/ogma-annotations** (the core annotations package)

## Installation

Install both the core annotations package and the React wrapper:


```bash [npm]
npm install @linkurious/ogma-annotations @linkurious/ogma-annotations-react
```

```bash [yarn]
yarn add @linkurious/ogma-annotations @linkurious/ogma-annotations-react
```

```bash [pnpm]
pnpm add @linkurious/ogma-annotations @linkurious/ogma-annotations-react
```


## Basic Setup

### 1. Import the Required Styles

The annotations package includes CSS for styling comment inputs and handles. Import it in your app:

```tsx
import "@linkurious/ogma-annotations/style.css";
```

### 2. Wrap Your App with Providers

The React integration uses a Context Provider pattern:

```tsx
import { Ogma } from "@linkurious/ogma-react";
import { AnnotationsContextProvider } from "@linkurious/ogma-annotations-react";

function App() {
  return (
    <Ogma graph={graph}>
      <AnnotationsContextProvider>
        {/* Your components here */}
      </AnnotationsContextProvider>
    </Ogma>
  );
}
```

### 3. Use the Hook in Your Components

Access the annotations context with the `useAnnotationsContext` hook:

```tsx
import { useAnnotationsContext } from "@linkurious/ogma-annotations-react";

function AnnotationTools() {
  const { editor, annotations } = useAnnotationsContext();

  return (
    <div>
      <p>Total annotations: {annotations.features.length}</p>
    </div>
  );
}
```

That's it! Your React app is now ready to use annotations.

## Complete Example

Here's a complete minimal setup:

```tsx
import React from "react";
import { Ogma } from "@linkurious/ogma-react";
import {
  AnnotationsContextProvider,
  useAnnotationsContext
} from "@linkurious/ogma-annotations-react";
import "@linkurious/ogma-annotations/style.css";

// Example graph data
const graph = {
  nodes: [
    { id: 1, x: -100, y: 0 },
    { id: 2, x: 100, y: 0 }
  ],
  edges: [{ id: "e1", source: 1, target: 2 }]
};

function ToolbarButton() {
  const { editor } = useAnnotationsContext();

  const handleAddArrow = React.useCallback(() => {
    editor.enableArrowDrawing({
      strokeType: "plain",
      strokeColor: "#3498db",
      strokeWidth: 2,
      head: "arrow"
    });
  }, [editor]);

  return <button onClick={handleAddArrow}>Add Arrow</button>;
}

export default function App() {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Ogma graph={graph}>
        <AnnotationsContextProvider>
          <ToolbarButton />
        </AnnotationsContextProvider>
      </Ogma>
    </div>
  );
}
```

## Loading Initial Annotations

You can load annotations when the provider mounts:

```tsx
import React from "react";
import { AnnotationsContextProvider } from "@linkurious/ogma-annotations-react";
import { AnnotationCollection } from "@linkurious/ogma-annotations";

function App() {
  const [annotations, setAnnotations] =
    React.useState<AnnotationCollection | null>(null);

  React.useEffect(() => {
    // Load annotations from your API or storage
    fetch("/api/annotations")
      .then((res) => res.json())
      .then((data) => setAnnotations(data));
  }, []);

  if (!annotations) {
    return <div>Loading...</div>;
  }

  return (
    <Ogma graph={graph}>
      <AnnotationsContextProvider annotations={annotations}>
        {/* Your components */}
      </AnnotationsContextProvider>
    </Ogma>
  );
}
```

## TypeScript Support

The React wrapper includes full TypeScript definitions. Import types as needed:

```tsx
import type {
  AnnotationCollection,
  ArrowStyles,
  TextStyle,
  AnnotationFeature
} from "@linkurious/ogma-annotations";
import type { IAnnotationsContext } from "@linkurious/ogma-annotations-react";

function MyComponent() {
  const context: IAnnotationsContext = useAnnotationsContext();

  const arrowStyle: ArrowStyles = {
    strokeColor: "#e74c3c",
    strokeWidth: 3,
    head: "arrow"
  };

  // Type-safe!
  context.setArrowStyle(arrowStyle);
}
```

## Project Structure

Here's a recommended structure for a React project with annotations:

```
src/
├── App.tsx                    # Main app with providers
├── components/
│   ├── AnnotationToolbar.tsx  # Toolbar with add buttons
│   ├── StylePanel.tsx         # Panel for styling annotations
│   └── AnnotationList.tsx     # List of all annotations
└── styles/
    └── annotations.css        # Your custom annotation styles
```

## Troubleshooting

### Context is Undefined

If you get "Cannot read property of undefined" errors:

1. Ensure `AnnotationsContextProvider` wraps your components
2. Make sure components using the hook are **inside** the provider
3. Check that `useAnnotationsContext` is called inside a component, not at module level

**Correct:**

```tsx
<Ogma>
  <AnnotationsContextProvider>
    <MyComponent /> {/* ✅ Inside provider */}
  </AnnotationsContextProvider>
</Ogma>
```

**Incorrect:**

```tsx
<Ogma>
  <MyComponent /> {/* ❌ Outside provider */}
  <AnnotationsContextProvider>{/* ... */}</AnnotationsContextProvider>
</Ogma>
```

### Styles Not Applied

If annotations don't have proper styling:

1. Import the styles: `import '@linkurious/ogma-annotations/style.css'`
2. Ensure your bundler handles CSS imports
3. Check that the CSS file exists in `node_modules/@linkurious/ogma-annotations/style.css`

### Editor is Undefined

The `editor` becomes available after the Ogma instance is ready. If you need to use it immediately, check for its existence:

```tsx
function MyComponent() {
  const { editor } = useAnnotationsContext();

  React.useEffect(() => {
    if (!editor) return;

    // Now safe to use editor
    editor.enableArrowDrawing({...});
  }, [editor]);
}
```

## Next Steps

Now that you have the React integration set up:

- [Learn Core Concepts](/react/core-concepts/provider) - Understand the Provider and Hook
- [Creating Annotations](/react/creating-annotations/interactive) - Add interactive annotation creation
- [Building UI Components](/react/ui-components/toolbar) - Build toolbars and panels
- [Explore Examples](/examples/react/simple-toolbar) - See complete working examples

## Related

- [TypeScript Package Installation](/typescript/installation) - Learn about the core package
- [React Examples](/examples/react/simple-toolbar) - Ready-to-use React examples

---

## AnnotationsContextProvider

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

The `AnnotationsContextProvider` must be placed **inside** the `Ogma` component, as it depends on the Ogma instance.


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

When you update the style via `setArrowStyle` or `setTextStyle`, the provider automatically applies the changes to the currently selected annotation!


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

---

## useAnnotationsContext Hook

# useAnnotationsContext Hook

The `useAnnotationsContext` hook provides access to all annotation state and methods within components wrapped by the `AnnotationsContextProvider`.

## Basic Usage

Import and use the hook in any component inside the provider:

```tsx
import { useAnnotationsContext } from '@linkurious/ogma-annotations-react';

function MyComponent() {
  const context = useAnnotationsContext();

  return (
    <div>
      <p>Annotations: {context.annotations.features.length}</p>
    </div>
  );
}
```

## Destructuring Values

Typically, you'll destructure only the values you need:

```tsx
function Toolbar() {
  const { editor, canUndo, canRedo, undo, redo } = useAnnotationsContext();

  return (
    <>
      <button onClick={() => editor.enableArrowDrawing({})}>Add Arrow</button>
      <button onClick={undo} disabled={!canUndo}>Undo</button>
      <button onClick={redo} disabled={!canRedo}>Redo</button>
    </>
  );
}
```

## Available Values

The hook returns an object (`IAnnotationsContext`) with the following properties:

### Core State

#### annotations
- **Type:** `AnnotationCollection`
- **Description:** All annotations currently in the graph

```tsx
const { annotations } = useAnnotationsContext();

console.log(annotations.features.length); // Number of annotations
annotations.features.forEach(annotation => {
  console.log(annotation.id, annotation.properties.type);
});
```

#### editor
- **Type:** `Control`
- **Description:** The annotations editor (Control instance) for direct access to all methods

```tsx
const { editor } = useAnnotationsContext();

// Enable drawing modes
editor.enableArrowDrawing({...});
editor.enableTextDrawing({...});

// Get annotations
const all = editor.getAnnotations();
const selected = editor.getSelectedAnnotations();
```

### Selection State

#### currentAnnotation
- **Type:** `AnnotationFeature | null`
- **Description:** The currently selected annotation, or `null` if none selected

```tsx
const { currentAnnotation } = useAnnotationsContext();

if (currentAnnotation) {
  console.log('Selected:', currentAnnotation.id);
  console.log('Type:', currentAnnotation.properties.type);
}
```

#### setCurrentAnnotation
- **Type:** `(annotation: AnnotationFeature | null) => void`
- **Description:** Manually set the current annotation

```tsx
const { setCurrentAnnotation, annotations } = useAnnotationsContext();

// Select the first annotation
if (annotations.features.length > 0) {
  setCurrentAnnotation(annotations.features[0]);
}

// Deselect
setCurrentAnnotation(null);
```

### Arrow Style State

#### arrowStyle
- **Type:** `ArrowStyles`
- **Description:** Current arrow style for the selected arrow or for new arrows

```tsx
const { arrowStyle } = useAnnotationsContext();

console.log(arrowStyle.strokeColor);   // e.g., '#3498db'
console.log(arrowStyle.strokeWidth);   // e.g., 2
console.log(arrowStyle.head);          // e.g., 'arrow'
```

#### setArrowStyle
- **Type:** `(style: ArrowStyles) => void`
- **Description:** Update the arrow style (automatically applies to selected arrow)

```tsx
const { arrowStyle, setArrowStyle } = useAnnotationsContext();

// Change color
setArrowStyle({
  ...arrowStyle,
  strokeColor: '#e74c3c'
});

// Change width
setArrowStyle({
  ...arrowStyle,
  strokeWidth: 5
});

// Change arrow head
setArrowStyle({
  ...arrowStyle,
  head: 'arrow',
  tail: 'none'
});
```

When you call `setArrowStyle`, the provider automatically updates the currently selected arrow annotation!


#### arrowWidthFactor
- **Type:** `number`
- **Description:** Width scaling factor for arrows (adjusted based on graph scale)

#### setArrowWidthFactor
- **Type:** `(factor: number) => void`
- **Description:** Set the arrow width scaling factor

### Text Style State

#### textStyle
- **Type:** `TextStyle`
- **Description:** Current text style for the selected text or for new text annotations

```tsx
const { textStyle } = useAnnotationsContext();

console.log(textStyle.font);         // e.g., 'Arial'
console.log(textStyle.fontSize);     // e.g., 16
console.log(textStyle.color);        // e.g., '#2c3e50'
console.log(textStyle.background);   // e.g., '#ffffff'
```

#### setTextStyle
- **Type:** `(style: TextStyle) => void`
- **Description:** Update the text style (automatically applies to selected text)

```tsx
const { textStyle, setTextStyle } = useAnnotationsContext();

// Change font
setTextStyle({
  ...textStyle,
  font: 'Arial'
});

// Change size and color
setTextStyle({
  ...textStyle,
  fontSize: 18,
  color: '#e74c3c'
});

// Change background
setTextStyle({
  ...textStyle,
  background: '#f0f0f0',
  borderRadius: 4,
  padding: 12
});
```

#### textSizeFactor
- **Type:** `number`
- **Description:** Size scaling factor for text (adjusted based on graph scale)

#### setTextSizeFactor
- **Type:** `(factor: number) => void`
- **Description:** Set the text size scaling factor

### History Management

#### canUndo
- **Type:** `boolean`
- **Description:** Whether undo operation is available

#### canRedo
- **Type:** `boolean`
- **Description:** Whether redo operation is available

#### undo
- **Type:** `() => boolean`
- **Description:** Undo the last action, returns `true` if successful

#### redo
- **Type:** `() => boolean`
- **Description:** Redo the last undone action, returns `true` if successful

#### clearHistory
- **Type:** `() => void`
- **Description:** Clear the undo/redo history

```tsx
function HistoryControls() {
  const { canUndo, canRedo, undo, redo, clearHistory } = useAnnotationsContext();

  return (
    <div>
      <button onClick={undo} disabled={!canUndo}>Undo</button>
      <button onClick={redo} disabled={!canRedo}>Redo</button>
      <button onClick={clearHistory}>Clear History</button>
    </div>
  );
}
```

### Annotation Management

#### add
- **Type:** `(annotation: Annotation | AnnotationCollection) => void`
- **Description:** Add one or more annotations

```tsx
const { add } = useAnnotationsContext();
import { createArrow, createText } from '@linkurious/ogma-annotations';

// Add single annotation
add(createArrow(0, 0, 100, 100, { strokeColor: '#3498db' }));

// Add multiple annotations
add({
  type: 'FeatureCollection',
  features: [
    createArrow(0, 0, 100, 100),
    createText(50, 50, 'Label')
  ]
});
```

#### remove
- **Type:** `(annotation: Annotation | AnnotationCollection) => void`
- **Description:** Remove one or more annotations

```tsx
const { remove, editor } = useAnnotationsContext();

// Remove selected annotations
const selected = editor.getSelectedAnnotations();
remove(selected);

// Remove all annotations
const all = editor.getAnnotations();
remove(all);
```

#### select
- **Type:** `(ids: string | string[]) => void`
- **Description:** Select annotation(s) by ID

```tsx
const { select } = useAnnotationsContext();

// Select by ID
select('annotation-123');

// Select multiple
select(['annotation-123', 'annotation-456']);
```

#### cancelDrawing
- **Type:** `() => void`
- **Description:** Cancel the current drawing operation

```tsx
const { cancelDrawing } = useAnnotationsContext();

// Cancel on Escape key
React.useEffect(() => {
  const handleKeyDown = (evt: KeyboardEvent) => {
    if (evt.key === 'Escape') {
      cancelDrawing();
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [cancelDrawing]);
```

### Drawing Methods

#### enableBoxDrawing
- **Type:** `(style?: Partial<BoxStyle>) => void`
- **Description:** Enable box drawing mode

```tsx
const { editor } = useAnnotationsContext();

editor.enableBoxDrawing({
  background: '#f0f0f0',
  borderRadius: 8,
  padding: 12
});
```

#### enablePolygonDrawing
- **Type:** `(style?: Partial<PolygonStyle>) => void`
- **Description:** Enable polygon drawing mode

```tsx
const { editor } = useAnnotationsContext();

editor.enablePolygonDrawing({
  strokeColor: '#3498db',
  strokeWidth: 2,
  background: 'rgba(52, 152, 219, 0.2)'
});
```

#### enableCommentDrawing
- **Type:** `(options?) => void`
- **Description:** Enable comment drawing mode (text with arrow)

```tsx
const { editor } = useAnnotationsContext();

editor.enableCommentDrawing({
  offsetX: 200,
  offsetY: -150,
  commentStyle: {
    content: '',
    style: {
      color: '#2c3e50',
      background: '#ffffff',
      fontSize: 16,
      font: 'Arial'
    }
  },
  arrowStyle: {
    style: {
      strokeColor: '#3498db',
      strokeWidth: 2,
      head: 'arrow'
    }
  }
});
```

## TypeScript Types

The hook returns `IAnnotationsContext`. Import the type for type safety:

```tsx
import { useAnnotationsContext, type IAnnotationsContext } from '@linkurious/ogma-annotations-react';

function MyComponent() {
  const context: IAnnotationsContext = useAnnotationsContext();
  // Fully typed!
}
```

## Common Patterns

### Conditional Rendering Based on Selection

```tsx
function StylePanel() {
  const { currentAnnotation } = useAnnotationsContext();

  if (!currentAnnotation) {
    return <div>No annotation selected</div>;
  }

  return (
    <div>
      <h3>Editing: {currentAnnotation.id}</h3>
      {isArrow(currentAnnotation) && <ArrowStyleControls />}
      {isText(currentAnnotation) && <TextStyleControls />}
    </div>
  );
}
```

### Syncing with External State

```tsx
function AnnotationsSync() {
  const { annotations } = useAnnotationsContext();

  // Save to localStorage whenever annotations change
  React.useEffect(() => {
    localStorage.setItem('annotations', JSON.stringify(annotations));
  }, [annotations]);

  // Or sync with a backend
  React.useEffect(() => {
    fetch('/api/annotations', {
      method: 'POST',
      body: JSON.stringify(annotations)
    });
  }, [annotations]);

  return null; // This component just handles syncing
}
```

### Building a Delete Button

```tsx
function DeleteButton() {
  const { editor, remove, currentAnnotation } = useAnnotationsContext();

  const handleDelete = React.useCallback(() => {
    const selected = editor.getSelectedAnnotations();
    if (selected.features.length > 0) {
      remove(selected);
    }
  }, [editor, remove]);

  return (
    <button
      onClick={handleDelete}
      disabled={!currentAnnotation}
    >
      Delete Selected
    </button>
  );
}
```

### Creating a Toolbar

```tsx
function Toolbar() {
  const { editor, undo, redo, canUndo, canRedo } = useAnnotationsContext();

  const handleArrow = React.useCallback(() => {
    editor.enableArrowDrawing({ strokeColor: '#3498db' });
  }, [editor]);

  const handleText = React.useCallback(() => {
    editor.enableTextDrawing({ fontSize: 16 });
  }, [editor]);

  const handleBox = React.useCallback(() => {
    editor.enableBoxDrawing({});
  }, [editor]);

  return (
    <div className="toolbar">
      <button onClick={handleArrow}>Arrow</button>
      <button onClick={handleText}>Text</button>
      <button onClick={handleBox}>Box</button>
      <span className="separator" />
      <button onClick={undo} disabled={!canUndo}>Undo</button>
      <button onClick={redo} disabled={!canRedo}>Redo</button>
    </div>
  );
}
```

## Next Steps

- [Creating Annotations Interactively](/react/creating-annotations/interactive) - Enable user-driven creation
- [Managing Styles](/react/styling/arrow-styles) - Build style controls
- [Building UI Components](/react/ui-components/toolbar) - Create complete toolbars and panels

---

## Interactive Drawing in React

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

  const handleClick = React.useCallback(() => {
    editor.enableArrowDrawing({
      strokeType: "plain",
      strokeColor: "#3498db",
      strokeWidth: 2,
      head: "arrow"
    });
  }, [editor]);

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

  const handleClick = React.useCallback(() => {
    editor.enableTextDrawing({
      font: "Arial",
      fontSize: 16,
      color: "#2c3e50",
      background: "#ffffff",
      borderRadius: 4,
      padding: 8
    });
  }, [editor]);

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

  const handleClick = React.useCallback(() => {
    editor.enableBoxDrawing({
      background: "#f0f0f0",
      borderRadius: 8,
      padding: 12
    });
  }, [editor]);

  return <button onClick={handleClick}>Add Box</button>;
}
```

### Polygon Drawing

```tsx
function AddPolygonButton() {
  const { editor } = useAnnotationsContext();

  const handleClick = React.useCallback(() => {
    editor.enablePolygonDrawing({
      strokeColor: "#3498db",
      strokeWidth: 2,
      background: "rgba(52, 152, 219, 0.2)"
    });
  }, [editor]);

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

  const handleClick = React.useCallback(() => {
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
  }, [editor]);

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

  const enableMode = React.useCallback(
    (mode: string, enableFn: () => void) => {
      setActiveMode(mode);
      enableFn();

      const cleanup = () => setActiveMode(null);
      editor.once("completeDrawing", cleanup);
      editor.once("cancelDrawing", cleanup);
    },
    [editor]
  );

  const handleArrow = React.useCallback(() => {
    enableMode("arrow", () =>
      editor.enableArrowDrawing({ strokeColor: "#3498db" })
    );
  }, [editor, enableMode]);

  const handleText = React.useCallback(() => {
    enableMode("text", () => editor.enableTextDrawing({ fontSize: 16 }));
  }, [editor, enableMode]);

  return (
    <div className="toolbar">
      <button
        className={activeMode === "arrow" ? "active" : ""}
        onClick={handleArrow}
      >
        Add Arrow
      </button>
      <button
        className={activeMode === "text" ? "active" : ""}
        onClick={handleText}
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

  const handleArrow = React.useCallback(() => {
    // Use current arrow style
    editor.enableArrowDrawing(arrowStyle);
  }, [editor, arrowStyle]);

  const handleText = React.useCallback(() => {
    // Use current text style
    editor.enableTextDrawing(textStyle);
  }, [editor, textStyle]);

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

  const addArrow = React.useCallback(() => {
    const arrow = createArrow(0, 0, 100, 100, {
      strokeColor: "#3498db",
      strokeWidth: 2,
      head: "arrow"
    });
    add(arrow);
  }, [add]);

  const addText = React.useCallback(() => {
    const text = createText(50, 50, "Quick Label", {
      fontSize: 16,
      color: "#2c3e50"
    });
    add(text);
  }, [add]);

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

---

## Quick Reference

### Installation

```bash
npm install @linkurious/ogma-annotations @linkurious/ogma-annotations-react
```

### Basic Setup

```tsx
import { Ogma } from "@linkurious/ogma-react";
import { AnnotationsContextProvider, useAnnotationsContext } from "@linkurious/ogma-annotations-react";
import "@linkurious/ogma-annotations/style.css";

function App() {
  return (
    <Ogma graph={graph}>
      <AnnotationsContextProvider>
        <Toolbar />
      </AnnotationsContextProvider>
    </Ogma>
  );
}
```

### useAnnotationsContext Hook

```tsx
function Toolbar() {
  const {
    editor,              // Control instance
    annotations,         // AnnotationCollection
    currentAnnotation,   // Selected | null
    arrowStyle, setArrowStyle,
    textStyle, setTextStyle,
    canUndo, canRedo, undo, redo,
    add, remove, select, cancelDrawing
  } = useAnnotationsContext();

  return (
    <div>
      <button onClick={() => editor.enableArrowDrawing({ head: "arrow" })}>Arrow</button>
      <button onClick={() => editor.enableTextDrawing()}>Text</button>
      <button onClick={() => editor.enableBoxDrawing()}>Box</button>
      <button onClick={undo} disabled={!canUndo}>Undo</button>
      <button onClick={redo} disabled={!canRedo}>Redo</button>
      <button
        onClick={() => remove(editor.getSelectedAnnotations())}
        disabled={!currentAnnotation}
      >
        Delete
      </button>
    </div>
  );
}
```

### Style Updates (Auto-applied to Selection)

```tsx
const { arrowStyle, setArrowStyle, textStyle, setTextStyle } = useAnnotationsContext();

// Changes automatically apply to selected annotation
setArrowStyle({ ...arrowStyle, strokeColor: "#ff0000" });
setTextStyle({ ...textStyle, fontSize: 18 });
```

### Conditional Rendering by Type

```tsx
import { isArrow, isText } from "@linkurious/ogma-annotations";

function StylePanel() {
  const { currentAnnotation } = useAnnotationsContext();

  if (!currentAnnotation) return null;
  if (isArrow(currentAnnotation)) return <ArrowStyleControls />;
  if (isText(currentAnnotation)) return <TextStyleControls />;
  return null;
}
```

### Auto-Save Pattern

```tsx
function AutoSave() {
  const { annotations } = useAnnotationsContext();

  useEffect(() => {
    localStorage.setItem("annotations", JSON.stringify(annotations));
  }, [annotations]);

  return null;
}
```

### Load Initial Annotations

```tsx
const [initialAnnotations, setInitialAnnotations] = useState(null);

useEffect(() => {
  const saved = localStorage.getItem("annotations");
  if (saved) setInitialAnnotations(JSON.parse(saved));
}, []);

if (!initialAnnotations) return <Loading />;

return (
  <AnnotationsContextProvider annotations={initialAnnotations}>
    <App />
  </AnnotationsContextProvider>
);
```
