# `@linkurious/ogma-annotations-react`

This package provides a set of React components to create and manage annotations in an Ogma graph. It doesn't depend on your UI components library, but provides the utilities to deal with the annotations in React way.

## Installation

```bash
npm install @linkurious/ogma @linkurious/ogma-react @linkurious/ogma-annotations @linkurious/ogma-annotations-react
```

## Usage

The package provides a context provider and a set of hooks to interact with the annotations. The context provider should be placed at the top of your component tree, and the hooks can be used in any component that needs to interact with the annotations.

```tsx
import { useState } from "react";
import { RawGraph } from "@linkurious/ogma";
import { Ogma } from "@linkurious/ogma-react";
import { AnnotationsContextProvider } from "@linkurious/ogma-annotations-react";
import "@linkurious/ogma-annotations/style.css";
import { UI } from "./UI";
import "./App.css";

export default function App() {
  const [graph] = useState<RawGraph>({
    nodes: [
      { id: 0, attributes: { x: 0, y: 0 } },
      { id: 1, attributes: { x: 100, y: 100 } },
    ],
    edges: [],
  });
  return (
    <div className="App">
      <Ogma graph={graph}>
        <AnnotationsContextProvider>
          {/* Your UI components applying the settings and drawing logic */}
          <UI ... />
        </AnnotationsContextProvider>
      </Ogma>
    </div>
  );
}
```

## License

Apache-2.0
