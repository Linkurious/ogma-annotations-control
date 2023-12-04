# Getting Started

You want to draw arrows and texts on top of Ogma? This is the right place!
This plugin provides a simple API to add/remove, style, interact with annotations,
as well as a [React wrapper](react-guide) to use it in React applications.

## Installation

```bash
npm i @linkurious/ogma-annotations
```

## Usage

First you will to create a [Controller](classes/Control.md) instance, which will be your entry point to the plugin.

```js
import { Control } from "@linkurious/ogma-annotations";

const controller = new Control(ogma);
```

Then you can add annotations to your graph:

```js
const arrow = createArrow(0, 0, 100, 100);
const text = createText(50, 50, "Hello world!");
control.add(arrow);
control.add(text);
```

## How to make user create annotations?

The Controller class provides a [startArrow](annotations/classes/Control.html#startarrow) and [startText](annotations/classes/Control.html#startarrow) methods to start the creation of an annotation.
You need to provide a start point for the creation of your annotation, and then the user will be able to drag the mouse to create the annotation.

```ts
const type = "arrow";
// save options
const opts = ogma.getOptions();
// set the cursor to crosshair
ogma.setOptions({ cursor: { default: "crosshair" } });
// on next user's click on the graph, create an annotation
ogma.events.once("click", (evt) => {
  const { x, y } = ogma.view.screenToGraphCoordinates(evt);
  const annotation =
    type === "arrow"
      ? createArrow(x, y, x, y, { ...defaultArrowStyle })
      : createText(x, y, 0, 0, "...", { ...defaultTextStyle });
  // wait for the next frame to start the creation of the annotation
  setTimeout(() => {
    if (isArrow(annotation)) {
      editor.startArrow(x, y, annotation);
    }
    if (isText(annotation)) {
      editor.startText(x, y, annotation);
    }
  }, 50);
  // once the annotation is created, restore the cursor and options
  editor.once("add", () => {
    ogma.setOptions(opts);
  });
});
```
