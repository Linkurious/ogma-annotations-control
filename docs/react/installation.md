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

::: code-group

```bash [npm]
npm install @linkurious/ogma-annotations @linkurious/ogma-annotations-react
```

```bash [yarn]
yarn add @linkurious/ogma-annotations @linkurious/ogma-annotations-react
```

```bash [pnpm]
pnpm add @linkurious/ogma-annotations @linkurious/ogma-annotations-react
```

:::

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
