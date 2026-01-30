# Installation & Setup

This guide covers how to install and set up Ogma Annotations in your TypeScript or JavaScript project.

## Prerequisites

Before installing Ogma Annotations, you need:

- **Ogma** (version 5.3.8 or higher) installed in your project - [Ogma installation guide](https://doc.linkurious.com/ogma/latest/tutorials/getting-started/install.html))
- A modern JavaScript environment with ES6 module support
- For TypeScript users: TypeScript 4.5 or higher (optional but recommended)

## Installation

Install the package using your preferred package manager:

::: code-group

```bash [npm]
npm install -S @linkurious/ogma-annotations
```

```bash [yarn]
yarn add @linkurious/ogma-annotations
```

```bash [pnpm]
pnpm add @linkurious/ogma-annotations
```

:::

## Basic Setup

### 1. Import the Library

```typescript
import { Ogma } from "@linkurious/ogma";
import { Control } from "@linkurious/ogma-annotations";
// CSS for styling the comment inputs and handles
import "@linkurious/ogma-annotations/style.css";
```

### 2. Create a Controller

The `Control` class is the main entry point to the annotations system:

```typescript
// First, create your Ogma instance
const ogma = new Ogma({
  container: "graph-container"
  // ... other Ogma options
});

// Then create the annotations controller
const controller = new Control(ogma);
```

That's it! Your annotations system is now ready to use.

## TypeScript Configuration

If you're using TypeScript, the package includes full type definitions out of the box. No additional configuration is needed.

## Integration with Existing Ogma Setup

### Adding to an Existing Project

If you already have an Ogma graph, simply create a controller and start adding annotations:

```typescript
// Your existing Ogma setup
const ogma = new Ogma({ container: "graph-container" });

ogma.addNodes([
  { id: 1, x: -100, y: 0 },
  { id: 2, x: 100, y: 0 }
]);

ogma.addEdges([{ id: "e1", source: 1, target: 2 }]);

// Add annotations controller
const controller = new Control(ogma);

// Now you can add annotations
const arrow = createArrow(-100, 0, 100, 0, { stroke: "#3498db" });
controller.add(arrow);
```

## Cleanup

When you're done with annotations (e.g., when unmounting a component or destroying the graph), clean up the controller:

```typescript
// Remove all annotations and event listeners
controller.destroy();

// Or if you're also destroying Ogma
controller.destroy();
ogma.destroy();
```

## Troubleshooting

### Ogma Peer Dependency

Ogma Annotations requires Ogma as a peer dependency. If you see warnings:

- [Ogma installation guide](https://doc.linkurious.com/ogma/latest/tutorials/getting-started/install.html)

## Next Steps

Now that you have Ogma Annotations installed:

- [Learn Core Concepts](/typescript/core-concepts/controller) - Understand the Controller, Annotations, and Events
- [Create Annotations](/typescript/creating-annotations/programmatic) - Start adding arrows and text
- [Explore Examples](/examples/typescript/basic) - See complete working examples
- [API Reference](/api/classes/Control) - Detailed API documentation

## React Users

If you're building with React, check out the React-specific guide:

- [React Installation](/react/installation) - Set up the React wrapper
- [React Core Concepts](/react/core-concepts/provider) - Learn about hooks and context
