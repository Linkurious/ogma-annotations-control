# React Wrapper

We also provide a React wrapper to use this plugin in React applications.

## Installation

```bash
npm i @linkurious/ogma-react @linkurious/ogma-annotations-react
```

## Usage

The simplest way to use the plugin is to use the AnnotationsContextProvider component, which will provide the Controller instance to all its children.

```jsx
import { Ogma, useOgma } from "@linkurious/ogma-react";
import { AnnotationsContextProvider } from "@linkurious/ogma-annotations";

<Ogma graph={graph}>
  <AnnotationsContextProvider>
    <AddArrowButton />
  </AnnotationsContextProvider>
</Ogma>;
```

## How to make user create annotations?

```jsx
import { useOgma } from "@linkurious/ogma-react";
import { useAnnotations } from "@linkurious/ogma-annotations-react";

const AddArrowButton = () => {
  const { editor, arrowStyle, textStyle } = useAnnotationsContext();
  const ogma = useOgma();
  function addAnnotation(type: "arrow" | "text") {
    const opts = ogma.getOptions();
    ogma.setOptions({ cursor: { default: "crosshair" } });
    ogma.events.once("click", (evt) => {
      const { x, y } = ogma.view.screenToGraphCoordinates(evt);
      const annotation = createArrow(x, y, x, y, { ...defaultArrowStyle });
      setTimeout(() => {
        // wait for the next frame to start the creation of the annotation
        editor.startArrow(x, y, annotation);
      }, 50);
      editor.once("add", () => {
        ogma.setOptions(opts);
      });
    });
  }
  return <Button onClick={() => addAnnotation("arrow")}>Add arrow</Button>;
};
```

## How to update styles?

You might want to let your users customize their annotations.
For that, we provide usefull state in the AnnotationsContextProvider:

- currentAnnotation: The current selected annotation
- arrowStyle The style of the current selected arrow
- setArrowStyle The setter for the style of the current selected arrow
- textStyle The style of the current selected text
- setTextStyle The setter for the style of the current selected text

```jsx
const ArrowExtStyleButton = () => {
  const { arrowStyle, setArrowStyle } = useAnnotationsContext();
  return (
    <Button
      onClick={() =>
        setArrowStyle({
          ...arrowStyle,
          ext: arrowStyle.ext === "none" ? "both" : "none",
        })
      }
      icon={<DirectionNone />}
    ></Button>
  );
};
```

```jsx
const TextFontSelect = () => {
  const { textStyle, setTextStyle } = useAnnotationsContext();
  const options = [
    {value:'Roboto', label:'Roboto'},
    {value:'Arial', label:'Arial'},
    {value:'Times New Roman', label:'Times New Roman'},
  ]
  return <Select
    options={options}
    onChange={f =>  setTextStyle({ ...textStyle, font: f.value });}
     />;
};
```

```jsx
import { isArrow, isText } from "@linkurious/ogma-annotations";

const ui = () => {
  const { currentAnnotation } = useAnnotationsContext();
  return (
    <div>
      {isText(currentAnnotation) ? (
        <TextFontSelect />
      ) : isArrow(currentAnnotation) ? (
        <ArrowExtStyleButton />
      ) : null}
    </div>
  );
};
```

## API

### AnnotationsContextProvider

Here is the description of the states exported by the AnnotationsContextProvider,
that you can access with the `useAnnotationsContext` hook.

| Context           | Usage                                                                     |
| ----------------- | ------------------------------------------------------------------------- |
| annotations       | All annotations in controller                                             |
| currentAnnotation | The selected annotation in controller                                     |
| textStyle         | The style of the current selected text                                    |
| setTextStyle      | Setter for the current [text style](/annotations/interfaces/TextStyles)   |
| arrowStyle        | The Style of the current selected arrow                                   |
| setArrowStyle     | Setter for the current [arrow style](/annotations/interfaces/ArrowStyles) |
| editor            | The instance of [Controller](/annotations/classes/Control)                |
