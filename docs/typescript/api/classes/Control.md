# Control

Main controller class for managing annotations.
It manages rendering and editing of annotations.

## Extends

- `EventEmitter`\<[`FeatureEvents`](../type-aliases/FeatureEvents.md)\>

## Constructors

### Constructor

```ts
new Control(ogma, options): Control;
```

#### Parameters

##### ogma

`Ogma`

##### options

`Partial`\<[`ControllerOptions`](../type-aliases/ControllerOptions.md)\> = `{}`

#### Returns

`Control`

## Properties

### prefixed

```ts
static prefixed: string | boolean;
```

## Methods

### add()

```ts
add(annotation): this;
```

Add an annotation to the controller

#### Parameters

##### annotation

The annotation to add

[`Annotation`](../type-aliases/Annotation.md) | [`AnnotationCollection`](../interfaces/AnnotationCollection.md)

#### Returns

`this`

***

### addListener()

```ts
addListener<T>(
   event, 
   fn, 
   context?): this;
```

#### Type Parameters

##### T

`T` *extends* keyof [`FeatureEvents`](../type-aliases/FeatureEvents.md)

#### Parameters

##### event

`T`

##### fn

(...`args`) => `void`

##### context?

`any`

#### Returns

`this`

### cancelDrawing()

```ts
cancelDrawing(): Control;
```

Cancel the current drawing operation

#### Returns

`Control`

this for chaining

***

### canRedo()

```ts
canRedo(): boolean;
```

Check if there are changes to redo

#### Returns

`boolean`

true if redo is possible

***

### canUndo()

```ts
canUndo(): boolean;
```

Check if there are changes to undo

#### Returns

`boolean`

true if undo is possible

***

### clearHistory()

```ts
clearHistory(): void;
```

Clear the undo/redo history

#### Returns

`void`

***

### destroy()

```ts
destroy(): void;
```

Destroy the controller and its elements

#### Returns

`void`

***

### emit()

```ts
emit<T>(event, ...args): boolean;
```

Calls each of the listeners registered for a given event.

#### Type Parameters

##### T

`T` *extends* keyof [`FeatureEvents`](../type-aliases/FeatureEvents.md)

#### Parameters

##### event

`T`

##### args

...`ArgumentMap`\<[`FeatureEvents`](../type-aliases/FeatureEvents.md)\>\[`Extract`\<`T`, keyof [`FeatureEvents`](../type-aliases/FeatureEvents.md)\>\]

#### Returns

`boolean`

### enableArrowDrawing()

```ts
enableArrowDrawing(style?): this;
```

Enable arrow drawing mode - the recommended way to add arrows.

Call this method when the user clicks an "Add Arrow" button. The control will:
1. Wait for the next mousedown event
2. Create an arrow at that position with the specified style
3. Start the interactive drawing process
4. Clean up automatically when done

**This is the recommended API for 99% of use cases.** Only use `startArrow()`
if you need to implement custom mouse handling or positioning logic.

#### Parameters

##### style?

`Partial`\<[`ArrowStyles`](../interfaces/ArrowStyles.md) \| `undefined`\>

Arrow style options

#### Returns

`this`

this for chaining

#### Example

```ts
addArrowButton.addEventListener('click', () => {
  control.enableArrowDrawing({ strokeColor: '#3A03CF', strokeWidth: 2 });
});
```

#### See

startArrow for low-level programmatic control

***

### enableBoxDrawing()

```ts
enableBoxDrawing(style?): this;
```

Enable box drawing mode - the recommended way to add boxes.

Call this method when the user clicks an "Add Box" button. The control will:
1. Wait for the next mousedown event
2. Create a box at that position with the specified style
3. Start the interactive drawing process (drag to size)
4. Clean up automatically when done

**This is the recommended API for 99% of use cases.** Only use `startBox()`
if you need to implement custom mouse handling or positioning logic.

#### Parameters

##### style?

`Partial`\<[`BoxStyle`](../interfaces/BoxStyle.md) \| `undefined`\>

Box style options

#### Returns

`this`

this for chaining

#### Example

```ts
addBoxButton.addEventListener('click', () => {
  control.enableBoxDrawing({ background: '#EDE6FF', borderRadius: 8 });
});
```

#### See

startBox for low-level programmatic control

***

### enableCommentDrawing()

```ts
enableCommentDrawing(options): this;
```

Enable comment drawing mode - the recommended way to add comments.

Call this method when the user clicks an "Add Comment" button. The control will:
1. Wait for the next mousedown event
2. Create a comment with an arrow pointing to that position
3. Smart positioning: automatically finds the best placement for the comment box
4. Start the interactive editing process
5. Clean up automatically when done

**This is the recommended API for 99% of use cases.** Only use `startComment()`
if you need to implement custom mouse handling or positioning logic.

#### Parameters

##### options

Drawing options including offsets and styles

###### arrowStyle?

`Partial`\<[`ArrowProperties`](../interfaces/ArrowProperties.md)\>

Style options for the arrow

###### commentStyle?

`Partial`\<[`CommentProps`](../interfaces/CommentProps.md)\>

Style options for the comment box

###### offsetX?

`number`

Manual X offset for comment placement (overrides smart positioning)

###### offsetY?

`number`

Manual Y offset for comment placement (overrides smart positioning)

#### Returns

`this`

this for chaining

#### Example

```ts
addCommentButton.addEventListener('click', () => {
  control.enableCommentDrawing({
    commentStyle: { color: '#3A03CF', background: '#EDE6FF' },
    arrowStyle: { strokeColor: '#3A03CF', head: 'halo-dot' }
  });
});
```

#### See

startComment for low-level programmatic control

***

### enablePolygonDrawing()

```ts
enablePolygonDrawing(style?): this;
```

Enable polygon drawing mode - the recommended way to add polygons.

Call this method when the user clicks an "Add Polygon" button. The control will:
1. Wait for the next mousedown event
2. Create a polygon starting at that position with the specified style
3. Start the interactive drawing process (click points to draw shape)
4. Clean up automatically when done

**This is the recommended API for 99% of use cases.** Only use `startPolygon()`
if you need to implement custom mouse handling or positioning logic.

#### Parameters

##### style?

`Partial`\<[`PolygonStyle`](../interfaces/PolygonStyle.md) \| `undefined`\>

Polygon style options

#### Returns

`this`

this for chaining

#### Example

```ts
addPolygonButton.addEventListener('click', () => {
  control.enablePolygonDrawing({ strokeColor: '#3A03CF', background: 'rgba(58, 3, 207, 0.15)' });
});
```

#### See

startPolygon for low-level programmatic control

***

### enableTextDrawing()

```ts
enableTextDrawing(style?): this;
```

Enable text drawing mode - the recommended way to add text annotations.

Call this method when the user clicks an "Add Text" button. The control will:
1. Wait for the next mousedown event
2. Create a text box at that position with the specified style
3. Start the interactive drawing/editing process
4. Clean up automatically when done

**This is the recommended API for 99% of use cases.** Only use `startText()`
if you need to implement custom mouse handling or positioning logic.

#### Parameters

##### style?

`Partial`\<[`TextStyle`](../interfaces/TextStyle.md) \| `undefined`\>

Text style options

#### Returns

`this`

this for chaining

#### Example

```ts
addTextButton.addEventListener('click', () => {
  control.enableTextDrawing({ color: '#3A03CF', fontSize: 24 });
});
```

#### See

startText for low-level programmatic control

***

### eventNames()

```ts
eventNames(): keyof FeatureEvents[];
```

Return an array listing the events for which the emitter has registered
listeners.

#### Returns

keyof [`FeatureEvents`](../type-aliases/FeatureEvents.md)[]

### getAnnotation()

```ts
getAnnotation<T>(id): T | undefined;
```

Get a specific annotation by id

#### Type Parameters

##### T

`T` = [`Annotation`](../type-aliases/Annotation.md)

#### Parameters

##### id

[`Id`](../type-aliases/Id.md)

The id of the annotation to retrieve

#### Returns

`T` \| `undefined`

The annotation with the given id, or undefined if not found

***

### getAnnotations()

```ts
getAnnotations(): AnnotationCollection;
```

Get all annotations in the controller

#### Returns

[`AnnotationCollection`](../interfaces/AnnotationCollection.md)

A FeatureCollection containing all annotations

***

### getSelected()

```ts
getSelected(): Annotation | null;
```

Get the first selected annotation (for backwards compatibility)

#### Returns

[`Annotation`](../type-aliases/Annotation.md) \| `null`

The currently selected annotation, or null if none selected

***

### getSelectedAnnotations()

```ts
getSelectedAnnotations(): AnnotationCollection;
```

Get the currently selected annotations as a collection

#### Returns

[`AnnotationCollection`](../interfaces/AnnotationCollection.md)

A FeatureCollection of selected annotations

***

### listenerCount()

```ts
listenerCount(event): number;
```

Return the number of listeners listening to a given event.

#### Parameters

##### event

keyof [`FeatureEvents`](../type-aliases/FeatureEvents.md)

#### Returns

`number`

### listeners()

```ts
listeners<T>(event): (...args) => void[];
```

Return the listeners registered for a given event.

#### Type Parameters

##### T

`T` *extends* keyof [`FeatureEvents`](../type-aliases/FeatureEvents.md)

#### Parameters

##### event

`T`

#### Returns

(...`args`) => `void`[]

### off()

```ts
off<T>(
   event, 
   fn?, 
   context?, 
   once?): this;
```

#### Type Parameters

##### T

`T` *extends* keyof [`FeatureEvents`](../type-aliases/FeatureEvents.md)

#### Parameters

##### event

`T`

##### fn?

(...`args`) => `void`

##### context?

`any`

##### once?

`boolean`

#### Returns

`this`

### on()

```ts
on<T>(
   event, 
   fn, 
   context?): this;
```

Add a listener for a given event.

#### Type Parameters

##### T

`T` *extends* keyof [`FeatureEvents`](../type-aliases/FeatureEvents.md)

#### Parameters

##### event

`T`

##### fn

(...`args`) => `void`

##### context?

`any`

#### Returns

`this`

### once()

```ts
once<T>(
   event, 
   fn, 
   context?): this;
```

Add a one-time listener for a given event.

#### Type Parameters

##### T

`T` *extends* keyof [`FeatureEvents`](../type-aliases/FeatureEvents.md)

#### Parameters

##### event

`T`

##### fn

(...`args`) => `void`

##### context?

`any`

#### Returns

`this`

### redo()

```ts
redo(): boolean;
```

Redo the last undone change

#### Returns

`boolean`

true if redo was successful, false if no changes to redo

***

### remove()

```ts
remove(annotation): this;
```

Remove an annotation or an array of annotations from the controller

#### Parameters

##### annotation

The annotation(s) to remove

[`Annotation`](../type-aliases/Annotation.md) | [`AnnotationCollection`](../interfaces/AnnotationCollection.md)

#### Returns

`this`

***

### removeAllListeners()

```ts
removeAllListeners(event?): this;
```

Remove all listeners, or those of the specified event.

#### Parameters

##### event?

keyof FeatureEvents

#### Returns

`this`

### removeListener()

```ts
removeListener<T>(
   event, 
   fn?, 
   context?, 
   once?): this;
```

Remove the listeners of a given event.

#### Type Parameters

##### T

`T` *extends* keyof [`FeatureEvents`](../type-aliases/FeatureEvents.md)

#### Parameters

##### event

`T`

##### fn?

(...`args`) => `void`

##### context?

`any`

##### once?

`boolean`

#### Returns

`this`

### select()

```ts
select(annotations): this;
```

Select one or more annotations by id

#### Parameters

##### annotations

The id(s) of the annotation(s) to select

[`Id`](../type-aliases/Id.md) | [`Id`](../type-aliases/Id.md)[]

#### Returns

`this`

this for chaining

***

### setOptions()

```ts
setOptions(options): object;
```

Set the options for the controller

#### Parameters

##### options

`Partial`\<[`ControllerOptions`](../type-aliases/ControllerOptions.md)\> = `{}`

new Options

#### Returns

`object`

the updated options

##### detectMargin

```ts
detectMargin: number;
```

##### magnetHandleRadius

```ts
magnetHandleRadius: number;
```

##### magnetRadius

```ts
magnetRadius: number;
```

##### maxArrowHeight

```ts
maxArrowHeight: number;
```

##### minArrowHeight

```ts
minArrowHeight: number;
```

##### sendButtonIcon

```ts
sendButtonIcon: string;
```

##### showSendButton

```ts
showSendButton: boolean;
```

##### textPlaceholder

```ts
textPlaceholder: string;
```

***

### setScale()

```ts
setScale(
   id, 
   scale, 
   ox, 
   oy): this;
```

Scale an annotation by a given factor around an origin point

#### Parameters

##### id

[`Id`](../type-aliases/Id.md)

The id of the annotation to scale

##### scale

`number`

The scale factor

##### ox

`number`

Origin x coordinate

##### oy

`number`

Origin y coordinate

#### Returns

`this`

this for chaining

***

### startArrow()

```ts
startArrow(
   x, 
   y, 
   arrow): void;
```

**Advanced API:** Programmatically start drawing an arrow at specific coordinates.

This is a low-level method that gives you full control over the drawing process.
You must handle mouse events and optionally create the arrow object yourself.

**For most use cases, use `enableArrowDrawing()` instead** - it handles all
mouse events and annotation creation automatically.

Use this method only when you need:
- Custom mouse event handling (e.g., custom cursors, right-click menus)
- Programmatic placement without user interaction
- Integration with custom UI frameworks

#### Parameters

##### x

`number`

X coordinate for the arrow start

##### y

`number`

Y coordinate for the arrow start

##### arrow

[`Arrow`](../interfaces/Arrow.md) = `...`

The arrow annotation to add (optional, will be created if not provided)

#### Returns

`void`

this for chaining

#### Example

```ts
// Custom cursor example
ogma.setOptions({ cursor: { default: 'crosshair' } });
ogma.events.once('mousedown', (evt) => {
  const { x, y } = ogma.view.screenToGraphCoordinates(evt);
  const arrow = createArrow(x, y, x, y, { strokeColor: '#3A03CF' });
  control.startArrow(x, y, arrow);
});
```

#### See

enableArrowDrawing for the recommended high-level API

***

### startBox()

```ts
startBox(
   x, 
   y, 
   box): void;
```

**Advanced API:** Programmatically start drawing a box at specific coordinates.

This is a low-level method that gives you full control over the drawing process.
You must handle mouse events and optionally create the box object yourself.

**For most use cases, use `enableBoxDrawing()` instead** - it handles all
mouse events and annotation creation automatically.

Use this method only when you need:
- Custom mouse event handling (e.g., custom cursors, right-click menus)
- Programmatic placement without user interaction
- Integration with custom UI frameworks

#### Parameters

##### x

`number`

X coordinate for the box origin

##### y

`number`

Y coordinate for the box origin

##### box

[`Box`](../interfaces/Box.md) = `...`

The box annotation to add (optional, will be created if not provided)

#### Returns

`void`

this for chaining

#### Example

```ts
// Custom cursor example
ogma.setOptions({ cursor: { default: 'crosshair' } });
ogma.events.once('mousedown', (evt) => {
  const { x, y } = ogma.view.screenToGraphCoordinates(evt);
  const box = createBox(x, y, 100, 50, { background: '#EDE6FF' });
  control.startBox(x, y, box);
});
```

#### See

enableBoxDrawing for the recommended high-level API

***

### startComment()

```ts
startComment(
   x, 
   y, 
   comment, 
   options?): this;
```

**Advanced API:** Programmatically start drawing a comment at specific coordinates.

This is a low-level method that gives you full control over the drawing process.
You must handle mouse events and create the comment object yourself.

**For most use cases, use `enableCommentDrawing()` instead** - it handles all
mouse events and annotation creation automatically.

Use this method only when you need:
- Custom mouse event handling (e.g., custom cursors, right-click menus)
- Programmatic placement without user interaction
- Integration with custom UI frameworks

#### Parameters

##### x

`number`

X coordinate to start drawing

##### y

`number`

Y coordinate to start drawing

##### comment

[`Comment`](../interfaces/Comment.md)

The comment annotation to add

##### options?

Drawing options including offsets and styles

###### arrowStyle?

`Partial`\<[`ArrowProperties`](../interfaces/ArrowProperties.md)\>

###### commentStyle?

`Partial`\<[`CommentProps`](../interfaces/CommentProps.md)\>

###### offsetX?

`number`

###### offsetY?

`number`

#### Returns

`this`

this for chaining

#### Example

```ts
// Custom cursor example
ogma.setOptions({ cursor: { default: 'crosshair' } });
ogma.events.once('mousedown', (evt) => {
  const { x, y } = ogma.view.screenToGraphCoordinates(evt);
  const comment = createComment(x, y, 'My comment', { color: '#3A03CF' });
  control.startComment(x, y, comment);
});
```

#### See

enableCommentDrawing for the recommended high-level API

***

### startPolygon()

```ts
startPolygon(
   x, 
   y, 
   polygon): this;
```

**Advanced API:** Programmatically start drawing a polygon at specific coordinates.

This is a low-level method that gives you full control over the drawing process.
You must handle mouse events and create the polygon object yourself.

**For most use cases, use `enablePolygonDrawing()` instead** - it handles all
mouse events and annotation creation automatically.

Use this method only when you need:
- Custom mouse event handling (e.g., custom cursors, right-click menus)
- Programmatic placement without user interaction
- Integration with custom UI frameworks

#### Parameters

##### x

`number`

X coordinate to start drawing

##### y

`number`

Y coordinate to start drawing

##### polygon

[`Polygon`](../interfaces/Polygon.md)

The polygon annotation to add

#### Returns

`this`

this for chaining

#### Example

```ts
// Custom cursor example
ogma.setOptions({ cursor: { default: 'crosshair' } });
ogma.events.once('mousedown', (evt) => {
  const { x, y } = ogma.view.screenToGraphCoordinates(evt);
  const polygon = createPolygon([[[x, y]]], { strokeColor: '#3A03CF' });
  control.startPolygon(x, y, polygon);
});
```

#### See

enablePolygonDrawing for the recommended high-level API

***

### startText()

```ts
startText(
   x, 
   y, 
   text): void;
```

**Advanced API:** Programmatically start drawing a text annotation at specific coordinates.

This is a low-level method that gives you full control over the drawing process.
You must handle mouse events and optionally create the text object yourself.

**For most use cases, use `enableTextDrawing()` instead** - it handles all
mouse events and annotation creation automatically.

Use this method only when you need:
- Custom mouse event handling (e.g., custom cursors, right-click menus)
- Programmatic placement without user interaction
- Integration with custom UI frameworks

#### Parameters

##### x

`number`

X coordinate for the text

##### y

`number`

Y coordinate for the text

##### text

[`Text`](../interfaces/Text.md) = `...`

The text annotation to add (optional, will be created if not provided)

#### Returns

`void`

this for chaining

#### Example

```ts
// Custom cursor example
ogma.setOptions({ cursor: { default: 'crosshair' } });
ogma.events.once('mousedown', (evt) => {
  const { x, y } = ogma.view.screenToGraphCoordinates(evt);
  const text = createText(x, y, 0, 0, 'Hello', { color: '#3A03CF' });
  control.startText(x, y, text);
});
```

#### See

enableTextDrawing for the recommended high-level API

***

### toggleComment()

```ts
toggleComment(id): this;
```

#### Parameters

##### id

[`Id`](../type-aliases/Id.md)

#### Returns

`this`

***

### undo()

```ts
undo(): boolean;
```

Undo the last change

#### Returns

`boolean`

true if undo was successful, false if no changes to undo

***

### unselect()

```ts
unselect(annotations?): this;
```

Unselect one or more annotations, or all if no ids provided

#### Parameters

##### annotations?

The id(s) of the annotation(s) to unselect, or undefined to unselect all

[`Id`](../type-aliases/Id.md) | [`Id`](../type-aliases/Id.md)[]

#### Returns

`this`

this for chaining

***

### update()

```ts
update<A>(annotation): this;
```

Update an annotation with partial updates

This method allows you to update any properties of an annotation, including
geometry, properties, and style. Updates are merged with existing data.

#### Type Parameters

##### A

`A` *extends* [`Annotation`](../type-aliases/Annotation.md)

#### Parameters

##### annotation

[`DeepPartial`](../type-aliases/DeepPartial.md)\<`A`\> & `object`

Partial annotation object with id and properties to update

#### Returns

`this`

this for chaining

#### Example

```ts
// Update arrow geometry
controller.update({
  id: arrowId,
  geometry: {
    type: 'LineString',
    coordinates: [[0, 0], [200, 200]]
  }
});

// Update text content and position
controller.update({
  id: textId,
  geometry: {
    type: 'Point',
    coordinates: [100, 100]
  },
  properties: {
    content: 'Updated text'
  }
});

// Update style only (prefer updateStyle for style-only updates)
controller.update({
  id: boxId,
  properties: {
    style: {
      background: '#ff0000'
    }
  }
});
```

***

### updateStyle()

```ts
updateStyle<A>(id, style): this;
```

Update the style of the annotation with the given id

#### Type Parameters

##### A

`A` *extends* [`Annotation`](../type-aliases/Annotation.md)

#### Parameters

##### id

[`Id`](../type-aliases/Id.md)

The id of the annotation to update

##### style

`A`\[`"properties"`\]\[`"style"`\]

The new style

#### Returns

`this`
