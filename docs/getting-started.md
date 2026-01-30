# Getting Started

Welcome to Ogma Annotations! This guide will help you add interactive arrows and text annotations to your Ogma graphs in just a few minutes.

## What is Ogma Annotations?

Ogma Annotations is a plugin that adds a drawing layer on top of [Ogma](https://doc.linkurious.com/ogma/latest/) graphs. It allows you to:

- Draw **arrows** to connect or point at graph elements
- Add **text labels** to annotate and explain parts of your graph
- Create annotations **programmatically** or let **users draw them interactively**
- Fully **customize the appearance** of all annotations
- Handle **user interactions** through a rich event system

## Installation

::: code-group

```bash [npm]
npm install @linkurious/ogma-annotations
```

```bash [yarn]
yarn add @linkurious/ogma-annotations
```

```bash [pnpm]
pnpm add @linkurious/ogma-annotations
```

:::

::: tip React Users
If you're building a React application, you'll also want to install the React wrapper:

```bash
npm install @linkurious/ogma-annotations-react
```

See the [React Integration Guide](/react/installation) for React-specific instructions.
:::

## Quick Start

Let's create your first annotation in just a few steps!

### Step 1: Import and Initialize

First, import Ogma Annotations and create a Controller instance:

```typescript
import { Ogma } from "@linkurious/ogma";
import { Control } from "@linkurious/ogma-annotations";

// Create your Ogma instance
const ogma = new Ogma({ container: "graph-container" });

// Create the annotations controller
const controller = new Control(ogma);
```

The `Control` instance is your main entry point for managing all annotations.

### Step 2: Create Your First Annotations

Now let's add an arrow and a text annotation:

```typescript
import { createArrow, createText } from "@linkurious/ogma-annotations";

// Create an arrow from (0, 0) to (100, 100)
const arrow = createArrow(0, 0, 100, 100, {
  stroke: "#ff6b6b",
  strokeWidth: 3,
  ext: "end" // Arrow head at the end
});

// Create a text annotation at (50, 50)
const text = createText(50, 50, "Hello Annotations!", {
  color: "#2c3e50",
  fontSize: 16,
  background: "#ffffff",
  padding: 8
});

// Add them to the controller
controller.add(arrow);
controller.add(text);
```

::: tip Coordinates
The coordinates you provide are in **graph space**, not screen pixels. Use `ogma.view.screenToGraphCoordinates()` to convert mouse positions to graph coordinates.
:::

### Step 3: Try It Out!

Here's a complete working example:

```html
<!doctype html>
<html>
  <head>
    <style>
      #graph-container {
        width: 800px;
        height: 600px;
      }
    </style>
  </head>
  <body>
    <div id="graph-container"></div>

    <script type="module">
      import { Ogma } from "@linkurious/ogma";
      import {
        Control,
        createArrow,
        createText
      } from "@linkurious/ogma-annotations";

      const ogma = new Ogma({ container: "graph-container" });
      const controller = new Control(ogma);

      // Add some nodes to make it interesting
      ogma.addNodes([
        { id: 0, x: -100, y: 0 },
        { id: 1, x: 100, y: 0 }
      ]);

      // Create arrow pointing from first to second node
      const arrow = createArrow(-100, 0, 100, 0, {
        stroke: "#ff6b6b",
        strokeWidth: 3,
        ext: "end"
      });
      controller.add(arrow);

      // Add explanatory text
      const text = createText(0, -50, "Connection", {
        color: "#2c3e50",
        fontSize: 14
      });
      controller.add(text);
    </script>
  </body>
</html>
```

<!--
TODO - Alex:
- [ ] Create "Quick Start Result" GIF showing the output of this code
-->

## Basic Concepts

Before diving deeper, let's understand the key concepts:

### Controller

The **Controller** (`Control` class) is the central management system for all annotations. It handles:

- Adding and removing annotations
- Managing selection state
- Dispatching events
- Coordinating with the Ogma instance

You typically create one controller per Ogma instance.

### Annotations

There are two types of annotations:

- **Arrow**: A line with optional arrow heads at either or both ends
- **Text**: A text label with optional background and styling

Both types share some common properties:

- Unique `id` for identification
- Position in graph coordinates
- Customizable styles
- Selection state

### Coordinate System

Annotations use **graph coordinates** (the same coordinate system as Ogma nodes), not screen pixels:

- **Graph coordinates**: Position in the logical graph space (e.g., where nodes are placed)
- **Screen coordinates**: Pixel position on the screen (e.g., mouse position)

Convert between them using:

```typescript
// Screen to graph
const { x, y } = ogma.view.screenToGraphCoordinates({ x: screenX, y: screenY });

// Graph to screen
const { x, y } = ogma.view.graphToScreenCoordinates({ x: graphX, y: graphY });
```

<!--
TODO - Alex:
- [ ] Create coordinate system diagram showing the difference
- [ ] Create architecture diagram: Controller → Annotations → Ogma
-->

### Events

The controller emits events when annotations change:

```typescript
// Listen for new annotations
controller.on("add", (annotation) => {
  console.log("Annotation added:", annotation);
});

// Listen for selection changes
controller.on("select", (annotation) => {
  console.log("Annotation selected:", annotation);
});

// Listen for deletions
controller.on("remove", (annotation) => {
  console.log("Annotation removed:", annotation);
});
```

## Interactive Annotations

Want to let users create annotations by clicking and dragging? Use the `startArrow()` and `startText()` methods:

```typescript
import { createArrow, isArrow } from "@linkurious/ogma-annotations";

// Change cursor to indicate drawing mode
const savedOptions = ogma.getOptions();
ogma.setOptions({ cursor: { default: "crosshair" } });

// Wait for user click
ogma.events.once("click", (evt) => {
  // Convert click position to graph coordinates
  const { x, y } = ogma.view.screenToGraphCoordinates(evt);

  // Create an arrow at that position
  const annotation = createArrow(x, y, x, y, {
    stroke: "#3498db",
    strokeWidth: 2,
    ext: "end"
  });

  // Start interactive creation (user drags to set endpoint)
  setTimeout(() => {
    controller.startArrow(x, y, annotation);
  }, 50);

  // Restore cursor when done
  controller.once("add", () => {
    ogma.setOptions(savedOptions);
  });
});
```

::: warning Timing
Note the `setTimeout` - it's necessary to wait for the next frame before starting interactive creation, otherwise the initial click event may interfere.
:::

## What's Next?

Now that you understand the basics, explore more advanced topics:

### For TypeScript/JavaScript Users:

- [Installation & Setup](/typescript/installation) - Detailed setup instructions
- [Controller Deep Dive](/typescript/core-concepts/controller) - Learn about all controller features
- [Creating Annotations](/typescript/creating-annotations/programmatic) - Master both programmatic and interactive creation
- [Styling Guide](/typescript/styling/arrow-styles) - Customize the appearance of your annotations
- [API Reference](/api/classes/Control) - Complete API documentation

### For React Users:

- [React Installation](/react/installation) - Set up the React integration
- [React Core Concepts](/react/core-concepts/provider) - Learn about the Context Provider and hooks
- [Building UI Components](/react/ui-components/toolbar) - Create toolbars and style panels
- [React Examples](/examples/react/simple-toolbar) - See complete React examples

### Examples & Inspiration:

- [TypeScript Examples](/examples/typescript/basic) - Ready-to-use TypeScript examples
- [React Examples](/examples/react/simple-toolbar) - Complete React component examples
- [Live Demos](/demo/index.html) - Try the interactive demos

## Need Help?

- Check the [API Reference](/api/classes/Control) for detailed method documentation
- Browse the [Examples](/examples/typescript/basic) for common patterns
- Report issues on [GitHub](https://github.com/Linkurious/ogma-annotations-control/issues)
