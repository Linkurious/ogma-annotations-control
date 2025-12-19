---
layout: home

hero:
  name: "Ogma Annotations"
  text: "Draw annotations on top of your Ogma graphs"
  tagline: "A powerful TypeScript plugin with React integration for adding interactive arrows and text annotations to your graph visualizations"
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started
    - theme: alt
      text: TypeScript API
      link: /typescript/installation
    - theme: alt
      text: React Integration
      link: /react/installation

features:
  - icon: ✏️
    title: Interactive Drawing
    details: Let users create arrows and text annotations with intuitive click-and-drag interactions

  - icon: 🎨
    title: Fully Customizable
    details: Control every aspect of your annotations - colors, fonts, line styles, arrow heads, and more

  - icon: 💾
    title: Persistence and Export
    details: You can easily save, load, and export annotations in GeoJSON format, as well as export to PNG/SVG images

  - icon: 📘
    title: TypeScript Support
    details: Built with TypeScript for complete type safety and excellent IDE autocomplete

  - icon: ⚛️
    title: React Integration
    details: Ready-to-use React hooks and context provider for seamless integration with React apps

  - icon: 🚀
    title: Production Ready
    details: Battle-tested in production applications with comprehensive documentation
---

## Why Use Ogma Annotations?

Annotations enhance graph visualizations by allowing you to:

- **Document insights** directly on the graph with arrows and labels
- **Guide users** by highlighting important nodes, edges, or patterns
- **Create presentations** with visual explanations embedded in the graph
- **Enable collaboration** by letting users mark up and comment on visualizations
- **Build interactive tools** for graph analysis and exploration

## Quick Example

::: code-group

```typescript [TypeScript]
import Ogma from "@linkurious/ogma";
import { Control, createArrow, createText } from "@linkurious/ogma-annotations";

const ogma = new Ogma({ container: "graph-container" });
const controller = new Control(ogma);

// Add an arrow annotation
const arrow = createArrow(0, 0, 100, 100, {
  stroke: "#ff6b6b",
  strokeWidth: 3
});
controller.add(arrow);

// Add a text annotation
const text = createText(50, 50, "Important Node", {
  color: "#4ecdc4",
  fontSize: 16
});
controller.add(text);
```

```tsx [React]
import { Ogma } from "@linkurious/ogma-react";
import {
  AnnotationsContextProvider,
  useAnnotationsContext
} from "@linkurious/ogma-annotations-react";
import { createArrow } from "@linkurious/ogma-annotations";

function AnnotationTools() {
  const { editor } = useAnnotationsContext();
  const ogma = useOgma();

  const addArrow = () => {
    ogma.events.once("click", (evt) => {
      const { x, y } = ogma.view.screenToGraphCoordinates(evt);
      const arrow = createArrow(x, y, x, y, { stroke: "#ff6b6b" });
      editor.startArrow(x, y, arrow);
    });
  };

  return <button onClick={addArrow}>Add Arrow</button>;
}

function App() {
  return (
    <Ogma>
      <AnnotationsContextProvider>
        <AnnotationTools />
      </AnnotationsContextProvider>
    </Ogma>
  );
}
```

:::

## What's Next?

<div class="vp-doc">

- **New to Ogma Annotations?** Start with the [Getting Started Guide](/getting-started) for a step-by-step introduction
- **Using TypeScript?** Explore the [TypeScript Documentation](/typescript/installation) and [API Reference](/api/classes/Control)
- **Building with React?** Check out the [React Integration Guide](/react/installation) with hooks and components
- **Need inspiration?** Browse the [Examples](/examples/typescript/basic) for common use cases and patterns

</div>

<!--
TODO - Alex: Add visual assets
- [ ] Hero image showing graph with annotations (replace text-only hero)
- [ ] Feature section icons (replace emoji with proper icons)
- [ ] Demo GIF or video showing annotation creation
-->
