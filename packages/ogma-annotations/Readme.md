# `@linkurious/ogma-annotations`

This package provides a set of utilities to help you annotate your Ogma graph. It's a plugin for the [Ogma](https://ogma.linkurio.us) graph visualization library.

## Installation

```bash
npm install @linkurious/ogma @linkurious/ogma-annotations
```

## Usage

The plugin comes with no UI of its own, but provides a set of tools that you can enable in your Ogma instance. Currently, it supports the following features:

- **Text boxes**: You can create text boxes on top of your visualisation. They can be moved around and resized. Styling is encoded in the feature's data.
- **Arrows**: Arrows can be drawn between nodes. They can be styled and can snap to both nodes and text annotations.

```ts
import Ogma from '@linkurious/ogma';
import {
  Control,
  createArrow,
  createText,
  AnnotationCollection,
} from "@linkurious/ogma-annotations";
// CSS required to style the controls and handles
import "@linkurious/ogma-annotations/style.css";

const ogma = new Ogma({...});
const annotationsEditor = new Control(ogma);

// we assume you have a button with the id 'add-text'
const addTexts = document.getElementById("add-text")! as HTMLButtonElement;

// user has clicked on the button to add text annotations
addTexts.addEventListener("click", () => {
  // disable the button to prevent multiple text annotations from being created
  addTexts.disabled = true;

  // create a new text annotation when user starts dragging the pointer
  ogma.events.once("mousedown", (evt) => {
    // annotations are in graph coordinates
    const { x, y } = ogma.view.screenToGraphCoordinates(evt);
    // create a text annotation feature
    const text = createText(x, y, 0, 0);

    // start drawing
    annotationsEditor.startText(x, y, text);
    // finish drawing
    annotationsEditor.once('dragend', (annotation) => {
      if (annotation.id !== text.id) return;
      addTexts.disabled = false;
    });
  });
});

// also stop drawing but pressing the escape key
document.addEventListener("keydown", (evt) => {
  if (evt.key === "Escape") annotationsEditor.cancelDrawing();
});
```

## API

### `Control`

The `Control` class is the main entry point for the plugin. It provides a set of methods to create and manage annotations.

#### `new Control(ogma: Ogma)`

Creates a new control instance.

#### `.add(annotation: AnnotationCollection | Text | Arrow)`

Adds an annotation to the graph.

#### `.remove(annotation: AnnotationCollection | Text | Arrow)`

Removes an annotation from the graph.

#### `.startText(x: number, y: number, text: Text)`

Starts drawing a text annotation at the given coordinates.

#### `.startArrow(x: number, y: number, arrow: Arrow)`

Starts drawing an arrow annotation at the given coordinates.

#### `.cancelDrawing()`

Cancels the current drawing operation.

#### `.on(event: 'dragend' | 'dragstart' | 'drag' | 'click', listener: (annotation: AnnotationCollection) => void)`

Registers an event listener.

#### `.once(event: 'dragend' | 'dragstart' | 'drag' | 'click', listener: (annotation: AnnotationCollection) => void)`

Registers a one-time event listener.

## `createText(x[=0], y[=0], width[=100], height[=50], content = '', styles?: TextStyles): Text`

Creates a new text annotation.

## `createArrow(x0: number, y0: number, x1: number, y1: number, styles?: ArrowStyles): Arrow`

Creates a new arrow annotation.

## `AnnotationCollection`

An annotation collection is a group of annotations that are related to each other. It can be a text annotation or an arrow annotation. It follows GeoJSON's feature collection format.

## `Text`

A text annotation is a feature that represents a text box on the graph. It has the following properties:

- `id`: a unique identifier for the text annotation.
- `type`: the type of the feature, which is always `text`.
- `properties`: an object that contains the text content and the style of the text.
  - `properties.content: string`: the content of the text.
  - `properties.style: TextStyle`: the style of the text.

## `Arrow`

An arrow annotation is a feature that represents an arrow on the graph. It has the following properties:

- `id`: a unique identifier for the arrow annotation.
- `type`: the type of the feature, which is always `arrow`.
- `properties`: an object that contains the style of the arrow.
  - `properties.style: ArrowStyle`: the style of the arrow.
  - `properties.links: { ['start'| 'end']: Link }`: Encoded connections of the arrow to nodes or text annotations.

## [`TextStyle`](src/types.ts)

## [`ArrowStyle`](src/types.ts)

## License

Apache-2.0
