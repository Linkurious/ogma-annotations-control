# Ogma Annotations - API Reference

> Complete API reference: Control class, interfaces, factory functions, types, and events
> Auto-generated: 2026-02-20 | Version: 2.x

---

## Control Class

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

### enablePlacement()

```ts
enablePlacement(annotation): this;
```

Place a pre-created annotation by moving it with the cursor.
The annotation follows the mouse until the user clicks to place it.
Press Escape to cancel.

#### Parameters

##### annotation

The text or box annotation to place

[`Box`](../interfaces/Box.md) | [`Text`](../interfaces/Text.md)

#### Returns

`this`

this for chaining

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

### isDrawing()

```ts
isDrawing(): boolean;
```

#### Returns

`boolean`

***

### link()

#### Call Signature

```ts
link(
   arrowId, 
   targetNode, 
   side): this;
```

Attach an arrow to a node at the specified side

##### Parameters

###### arrowId

[`Id`](../type-aliases/Id.md)

###### targetNode

`Node$1`

###### side

[`Side`](../type-aliases/Side.md)

##### Returns

`this`

#### Call Signature

```ts
link(
   arrowId, 
   target, 
   side): this;
```

Attach an arrow to an annotation at the specified side

##### Parameters

###### arrowId

[`Id`](../type-aliases/Id.md)

###### target

[`Id`](../type-aliases/Id.md)

###### side

[`Side`](../type-aliases/Side.md)

##### Returns

`this`

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

##### editButtonIcon

```ts
editButtonIcon: string;
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

##### showEditButton

```ts
showEditButton: boolean;
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
   arrow?): Control;
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

##### arrow?

[`Arrow`](../interfaces/Arrow.md)

The arrow annotation to add (optional, will be created if not provided)

#### Returns

`Control`

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
   box?): Control;
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

##### box?

[`Box`](../interfaces/Box.md)

The box annotation to add (optional, will be created if not provided)

#### Returns

`Control`

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
   text?): Control;
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

##### text?

[`Text`](../interfaces/Text.md)

The text annotation to add (optional, will be created if not provided)

#### Returns

`Control`

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

Toggle a comment between collapsed and expanded mode

#### Parameters

##### id

[`Id`](../type-aliases/Id.md)

The id of the comment to toggle

#### Returns

`this`

this for chaining

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

---

## Interfaces

### Arrow

# Interface: Arrow

Arrow annotation feature. Represents a directed line between two points,
can connect a textbox to a shape.

## Extends

- [`AnnotationFeature`](AnnotationFeature.md)\<`LineString`, [`ArrowProperties`](ArrowProperties.md)\>

## Properties

### bbox?

```ts
optional bbox: BBox;
```

Bounding box of the coordinate range of the object's Geometries, Features, or Feature Collections.
The value of the bbox member is an array of length 2*n where n is the number of dimensions
represented in the contained geometries, with all axes of the most southwesterly point
followed by all axes of the more northeasterly point.
The axes order of a bbox follows the axes order of geometries.
https://tools.ietf.org/html/rfc7946#section-5

### geometry

```ts
geometry: LineString;
```

The feature's geometry

### id

```ts
id: Id;
```

Unique identifier for the annotation

### properties

```ts
properties: ArrowProperties;
```

Properties associated with this feature.

### type

```ts
type: "Feature";
```

Specifies the type of GeoJSON object.

---

# Interface: ArrowProperties

Base properties for all annotations.

## Extends

- [`AnnotationProps`](AnnotationProps.md)

## Properties

### link?

```ts
optional link: Partial<Record<Side, ExportedLink>>;
```

***

### style?

```ts
optional style: ArrowStyles;
```

Optional style configuration

### type

```ts
type: "arrow";
```

Type of annotation

---

# Interface: ArrowStyles

Styles specific to arrow annotations.

## Extends

- [`StrokeOptions`](../type-aliases/StrokeOptions.md)

## Properties

### head?

```ts
optional head: Extremity;
```

Head extremity style

***

### strokeColor?

```ts
optional strokeColor: string;
```

Stroke color: #f00, yellow...

### strokeType?

```ts
optional strokeType: StrokeType;
```

Type of stroke: plain, dashed, or none

### strokeWidth?

```ts
optional strokeWidth: number;
```

Stroke width

### tail?

```ts
optional tail: Extremity;
```

Tail extremity style

---

### Text

# Interface: Text

Text annotation feature, represents a text box at a specific position

## Extends

- [`AnnotationFeature`](AnnotationFeature.md)\<`GeoJSONPoint`, [`TextProperties`](TextProperties.md)\>

## Properties

### bbox?

```ts
optional bbox: BBox;
```

Bounding box of the coordinate range of the object's Geometries, Features, or Feature Collections.
The value of the bbox member is an array of length 2*n where n is the number of dimensions
represented in the contained geometries, with all axes of the most southwesterly point
followed by all axes of the more northeasterly point.
The axes order of a bbox follows the axes order of geometries.
https://tools.ietf.org/html/rfc7946#section-5

### geometry

```ts
geometry: Point;
```

The feature's geometry

### id

```ts
id: Id;
```

Unique identifier for the annotation

### properties

```ts
properties: TextProperties;
```

Properties associated with this feature.

### type

```ts
type: "Feature";
```

Specifies the type of GeoJSON object.

---

# Interface: TextStyle

Styles specific to box annotations.

## Extends

- [`BoxStyle`](BoxStyle.md)

## Extended by

- [`CommentStyle`](CommentStyle.md)

## Properties

### background?

```ts
optional background: string;
```

background color: empty for transparent #f00, yellow...

### borderRadius?

```ts
optional borderRadius: number;
```

Text box border radius

### boxShadow?

```ts
optional boxShadow: string;
```

box shadow in CSS format, e.g. "0px 4px 6px rgba(0, 0, 0, 0.1)"

### color?

```ts
optional color: string;
```

text color: #f00, yellow...

***

### fixedSize?

```ts
optional fixedSize: boolean;
```

When true, text maintains constant size regardless of zoom level

***

### font?

```ts
optional font: string;
```

Helvetica, sans-serif...

***

### fontSize?

```ts
optional fontSize: string | number;
```

Font size, in pixels

***

### padding?

```ts
optional padding: number;
```

padding around the text

### scaled?

```ts
optional scaled: boolean;
```

if true, the box scales with zoom. Default is true

### strokeColor?

```ts
optional strokeColor: string;
```

Stroke color: #f00, yellow...

### strokeType?

```ts
optional strokeType: StrokeType;
```

Type of stroke: plain, dashed, or none

### strokeWidth?

```ts
optional strokeWidth: number;
```

Stroke width

---

### Box

# Interface: Box

Box annotation feature

## Extends

- [`AnnotationFeature`](AnnotationFeature.md)\<`GeoJSONPoint`, [`BoxProperties`](BoxProperties.md)\>

## Properties

### bbox?

```ts
optional bbox: BBox;
```

Bounding box of the coordinate range of the object's Geometries, Features, or Feature Collections.
The value of the bbox member is an array of length 2*n where n is the number of dimensions
represented in the contained geometries, with all axes of the most southwesterly point
followed by all axes of the more northeasterly point.
The axes order of a bbox follows the axes order of geometries.
https://tools.ietf.org/html/rfc7946#section-5

### geometry

```ts
geometry: Point;
```

The feature's geometry

### id

```ts
id: Id;
```

Unique identifier for the annotation

### properties

```ts
properties: BoxProperties;
```

Properties associated with this feature.

### type

```ts
type: "Feature";
```

Specifies the type of GeoJSON object.

---

# Interface: BoxStyle

Styles specific to box annotations.

## Extends

- [`StrokeOptions`](../type-aliases/StrokeOptions.md)

## Extended by

- [`PolygonStyle`](PolygonStyle.md)
- [`TextStyle`](TextStyle.md)

## Properties

### background?

```ts
optional background: string;
```

background color: empty for transparent #f00, yellow...

***

### borderRadius?

```ts
optional borderRadius: number;
```

border radius

***

### boxShadow?

```ts
optional boxShadow: string;
```

box shadow in CSS format, e.g. "0px 4px 6px rgba(0, 0, 0, 0.1)"

***

### padding?

```ts
optional padding: number;
```

padding around the box

***

### scaled?

```ts
optional scaled: boolean;
```

if true, the box scales with zoom. Default is true

***

### strokeColor?

```ts
optional strokeColor: string;
```

Stroke color: #f00, yellow...

### strokeType?

```ts
optional strokeType: StrokeType;
```

Type of stroke: plain, dashed, or none

### strokeWidth?

```ts
optional strokeWidth: number;
```

Stroke width

---

# Interface: BoxProperties

Properties specific to box annotations.

## Extends

- [`AnnotationProps`](AnnotationProps.md)

## Properties

### height

```ts
height: number;
```

Height of the box

***

### style?

```ts
optional style: BoxStyle;
```

Style options for the box

### type

```ts
type: "box";
```

Type of annotation

### width

```ts
width: number;
```

Width of the box

---

### Polygon

# Interface: Polygon

Polygon placed on the graph, use it to highlight areas

## Extends

- [`AnnotationFeature`](AnnotationFeature.md)\<`GeoJSONPolygon`, [`PolygonProperties`](PolygonProperties.md)\>

## Properties

### bbox?

```ts
optional bbox: BBox;
```

Bounding box of the coordinate range of the object's Geometries, Features, or Feature Collections.
The value of the bbox member is an array of length 2*n where n is the number of dimensions
represented in the contained geometries, with all axes of the most southwesterly point
followed by all axes of the more northeasterly point.
The axes order of a bbox follows the axes order of geometries.
https://tools.ietf.org/html/rfc7946#section-5

### geometry

```ts
geometry: Polygon;
```

The feature's geometry

### id

```ts
id: Id;
```

Unique identifier for the annotation

### properties

```ts
properties: PolygonProperties;
```

Properties associated with this feature.

### type

```ts
type: "Feature";
```

Specifies the type of GeoJSON object.

---

# Interface: PolygonStyle

Styles specific to box annotations.

## Extends

- [`BoxStyle`](BoxStyle.md)

## Properties

### background?

```ts
optional background: string;
```

background color: empty for transparent #f00, yellow...

### borderRadius?

```ts
optional borderRadius: number;
```

border radius

### boxShadow?

```ts
optional boxShadow: string;
```

box shadow in CSS format, e.g. "0px 4px 6px rgba(0, 0, 0, 0.1)"

### padding?

```ts
optional padding: number;
```

padding around the box

### scaled?

```ts
optional scaled: boolean;
```

if true, the box scales with zoom. Default is true

### strokeColor?

```ts
optional strokeColor: string;
```

Stroke color: #f00, yellow...

### strokeType?

```ts
optional strokeType: StrokeType;
```

Type of stroke: plain, dashed, or none

### strokeWidth?

```ts
optional strokeWidth: number;
```

Stroke width

---

# Interface: PolygonProperties

Base properties for all annotations.

## Extends

- [`AnnotationProps`](AnnotationProps.md)

## Properties

### style?

```ts
optional style: PolygonStyle;
```

Optional style configuration

### type

```ts
type: "polygon";
```

Type of annotation

---

### Comment

# Interface: Comment

Comment annotation type
Geometry: Point (center position of comment box/icon)

Note: Arrows are stored separately in Arrow features.
Arrows reference comments via their link.start or link.end properties.

## Extends

- [`AnnotationFeature`](AnnotationFeature.md)\<`GeoJSONPoint`, [`CommentProps`](CommentProps.md)\>

## Properties

### bbox?

```ts
optional bbox: BBox;
```

Bounding box of the coordinate range of the object's Geometries, Features, or Feature Collections.
The value of the bbox member is an array of length 2*n where n is the number of dimensions
represented in the contained geometries, with all axes of the most southwesterly point
followed by all axes of the more northeasterly point.
The axes order of a bbox follows the axes order of geometries.
https://tools.ietf.org/html/rfc7946#section-5

### geometry

```ts
geometry: Point;
```

The feature's geometry

### id

```ts
id: Id;
```

Unique identifier for the annotation

### properties

```ts
properties: CommentProps;
```

Properties associated with this feature.

### type

```ts
type: "Feature";
```

Specifies the type of GeoJSON object.

---

# Interface: CommentStyle

Style configuration for Comment annotations

## Extends

- [`TextStyle`](TextStyle.md)

## Properties

### autoGrow?

```ts
optional autoGrow: boolean;
```

Auto-grow height with content (default: true)

***

### background?

```ts
optional background: string;
```

background color: empty for transparent #f00, yellow...

### borderRadius?

```ts
optional borderRadius: number;
```

Text box border radius

### boxShadow?

```ts
optional boxShadow: string;
```

box shadow in CSS format, e.g. "0px 4px 6px rgba(0, 0, 0, 0.1)"

### collapseZoomThreshold?

```ts
optional collapseZoomThreshold: number;
```

Zoom threshold below which comment auto-collapses (default: 0.5)

***

### color?

```ts
optional color: string;
```

text color: #f00, yellow...

### expandOnSelect?

```ts
optional expandOnSelect: boolean;
```

Expand to full width when selected (default: false)

***

### fixedSize?

```ts
optional fixedSize: boolean;
```

When true, text maintains constant size regardless of zoom level

### font?

```ts
optional font: string;
```

Helvetica, sans-serif...

### fontSize?

```ts
optional fontSize: string | number;
```

Font size, in pixels

### iconBorderColor?

```ts
optional iconBorderColor: string;
```

Border color for collapsed icon

***

### iconBorderWidth?

```ts
optional iconBorderWidth: number;
```

Border width for collapsed icon

***

### iconColor?

```ts
optional iconColor: string;
```

Background color for collapsed icon (default: "#FFD700")

***

### iconSize?

```ts
optional iconSize: number;
```

Size when collapsed (default: 32px)

***

### iconSymbol?

```ts
optional iconSymbol: string;
```

Icon to display when collapsed (default: "💬")

***

### maxHeight?

```ts
optional maxHeight: number;
```

Maximum height before scrolling (default: 480px, undefined = no limit)

***

### minHeight?

```ts
optional minHeight: number;
```

Minimum height (default: 60px)

***

### padding?

```ts
optional padding: number;
```

padding around the text

### scaled?

```ts
optional scaled: boolean;
```

if true, the box scales with zoom. Default is true

### shadow?

```ts
optional shadow: boolean;
```

Show drop shadow on comment box (default: true)

***

### showSendButton?

```ts
optional showSendButton: boolean;
```

Show "send" button in edit mode (default: true)

***

### strokeColor?

```ts
optional strokeColor: string;
```

Stroke color: #f00, yellow...

### strokeType?

```ts
optional strokeType: StrokeType;
```

Type of stroke: plain, dashed, or none

### strokeWidth?

```ts
optional strokeWidth: number;
```

Stroke width

---

# Interface: CommentProps

Properties for Comment annotations

Comments are specialized annotations that:
- Always maintain fixed screen-space size
- Always have at least one arrow pointing TO them
- Can be collapsed (icon) or expanded (text box)
- Support multiple arrows pointing to them

## Extends

- [`AnnotationProps`](AnnotationProps.md)

## Properties

### author?

```ts
optional author: string;
```

Optional metadata

***

### content

```ts
content: string;
```

Text content (similar to text annotation)

***

### height

```ts
height: number;
```

Height (auto-grows with content, pixels)

***

### mode

```ts
mode: "collapsed" | "expanded";
```

Display mode: collapsed (icon) or expanded (text box)

***

### style?

```ts
optional style: CommentStyle;
```

Styling

### timestamp?

```ts
optional timestamp: Date;
```

***

### type

```ts
type: "comment";
```

Type of annotation

### width

```ts
width: number;
```

Width in expanded mode (pixels)

---

### Other

# Interface: AnnotationCollection

Collection of Annotations, GeoJSON FeatureCollection

## Extends

- `FeatureCollection`

## Properties

### bbox?

```ts
optional bbox: BBox;
```

Bounding box of the coordinate range of the object's Geometries, Features, or Feature Collections.
The value of the bbox member is an array of length 2*n where n is the number of dimensions
represented in the contained geometries, with all axes of the most southwesterly point
followed by all axes of the more northeasterly point.
The axes order of a bbox follows the axes order of geometries.
https://tools.ietf.org/html/rfc7946#section-5

### features

```ts
features: Annotation[];
```

### type

```ts
type: "FeatureCollection";
```

Specifies the type of GeoJSON object.

---

# Interface: Link

Link between an arrow and a text or node

## Properties

### arrow

```ts
arrow: Id;
```

arrow attached to the text or node

***

### id

```ts
id: Id;
```

id of the text the arrow is attached to

***

### magnet

```ts
magnet: Point;
```

On which point relative to topleft corner the arrow is tighten, in case of
node, a 0 vector represents the center, otherwise it can be deduced from the arrow itself

***

### side

```ts
side: Side;
```

On which end the arrow is tighten to the text

***

### target

```ts
target: Id;
```

id of the text or node  the arrow is attached to

***

### targetType

```ts
targetType: TargetType;
```

Text or node

---

## Factory Functions

# Function: createArrow()

```ts
function createArrow(
   x0, 
   y0, 
   x1, 
   y1, 
   styles): Arrow;
```

## Parameters

### x0

`number` = `0`

### y0

`number` = `0`

### x1

`number` = `0`

### y1

`number` = `0`

### styles

#### head?

[`Extremity`](../type-aliases/Extremity.md)

Head extremity style

#### strokeColor?

`string`

Stroke color: #f00, yellow...

#### strokeType?

[`StrokeType`](../type-aliases/StrokeType.md)

Type of stroke: plain, dashed, or none

#### strokeWidth?

`number`

Stroke width

#### tail?

[`Extremity`](../type-aliases/Extremity.md)

Tail extremity style

## Returns

[`Arrow`](../interfaces/Arrow.md)

---

# Function: createText()

```ts
function createText(
   x, 
   y, 
   width, 
   height, 
   content, 
   styles): Text;
```

## Parameters

### x

`number` = `0`

### y

`number` = `0`

### width

`number` = `100`

### height

`number` = `50`

### content

`string` = `""`

### styles

`Partial`\<[`TextStyle`](../interfaces/TextStyle.md)\> = `...`

## Returns

[`Text`](../interfaces/Text.md)

---

# Function: createBox()

```ts
function createBox(
   x, 
   y, 
   width, 
   height, 
   styles): Box;
```

## Parameters

### x

`number` = `0`

### y

`number` = `0`

### width

`number` = `100`

### height

`number` = `50`

### styles

`Partial`\<[`BoxStyle`](../interfaces/BoxStyle.md)\> = `...`

## Returns

[`Box`](../interfaces/Box.md)

---

# Function: createPolygon()

```ts
function createPolygon(coordinates, properties?): Polygon;
```

Create a polygon annotation

## Parameters

### coordinates

\[`number`, `number`\][][]

### properties?

`Partial`\<`Omit`\<[`PolygonProperties`](../interfaces/PolygonProperties.md), `"type"`\>\> & `object`

## Returns

[`Polygon`](../interfaces/Polygon.md)

---

# Function: createComment()

```ts
function createComment(
   x, 
   y, 
   content, 
   options?): Comment;
```

Create a new Comment annotation

## Parameters

### x

`number`

X coordinate of the comment box/icon center

### y

`number`

Y coordinate of the comment box/icon center

### content

`string`

Text content

### options?

`Partial`\<[`CommentProps`](../interfaces/CommentProps.md)\>

Optional configuration

## Returns

[`Comment`](../interfaces/Comment.md)

New Comment feature

## Important

This creates ONLY the comment box without an arrow. Since comments
require at least one arrow, you should use [createCommentWithArrow](createCommentWithArrow.md)
instead for programmatic creation. This function is primarily used internally
by the interactive drawing handlers.

## See

createCommentWithArrow for creating comments programmatically

---

# Function: createCommentWithArrow()

```ts
function createCommentWithArrow(
   targetX, 
   targetY, 
   commentX, 
   commentY, 
   content, 
   options?): object;
```

Create a comment with an arrow pointing to a target location

This is the recommended way to create comments programmatically, as it ensures
that the comment always has at least one arrow (which is required).

## Parameters

### targetX

`number`

X coordinate where the arrow points to

### targetY

`number`

Y coordinate where the arrow points to

### commentX

`number`

X coordinate of the comment box center

### commentY

`number`

Y coordinate of the comment box center

### content

`string` = `""`

Text content of the comment

### options?

Optional configuration

#### arrowStyle?

`Partial`\<[`ArrowStyles`](../interfaces/ArrowStyles.md)\>

Style options for the arrow

#### commentStyle?

`Partial`\<[`CommentProps`](../interfaces/CommentProps.md)\>

Style options for the comment

## Returns

`object`

Object containing the comment and arrow features

### arrow

```ts
arrow: Arrow;
```

### comment

```ts
comment: Comment;
```

## Example

```typescript
import { createCommentWithArrow } from '@linkurious/ogma-annotations';

// Create a comment pointing to a node at (100, 100)
const { comment, arrow } = createCommentWithArrow(
  100, 100,           // Target position (where arrow points)
  300, 50,            // Comment position
  "Important node!",  // Comment text
  {
    commentStyle: {
      style: {
        background: "#FFFACD",
        color: "#333"
      }
    },
    arrowStyle: {
      strokeColor: "#3498db",
      strokeWidth: 2,
      head: "arrow"
    }
  }
);

// Add both to the controller
controller.add(comment);
controller.add(arrow);

// The arrow is automatically linked to the comment
```

---

## Type Guards

# Function: isArrow()

```ts
function isArrow(a): a is Arrow;
```

## Parameters

### a

[`AnnotationFeature`](../interfaces/AnnotationFeature.md)\<`Geometry`, [`AnnotationProps`](../interfaces/AnnotationProps.md)\>

## Returns

`a is Arrow`

---

# Function: isText()

```ts
function isText(a): a is Text;
```

## Parameters

### a

[`AnnotationFeature`](../interfaces/AnnotationFeature.md)\<`Geometry`, [`AnnotationProps`](../interfaces/AnnotationProps.md)\>

## Returns

`a is Text`

---

# Function: isBox()

```ts
function isBox(a): a is Box;
```

## Parameters

### a

[`AnnotationFeature`](../interfaces/AnnotationFeature.md)\<`Geometry`, [`AnnotationProps`](../interfaces/AnnotationProps.md)\>

## Returns

`a is Box`

---

# Function: isPolygon()

```ts
function isPolygon(a): a is Polygon;
```

## Parameters

### a

[`AnnotationFeature`](../interfaces/AnnotationFeature.md)\<`Geometry`, [`AnnotationProps`](../interfaces/AnnotationProps.md)\>

## Returns

`a is Polygon`

---

# Function: isComment()

```ts
function isComment(a): a is Comment;
```

Type guard to check if an annotation is a Comment

## Parameters

### a

[`AnnotationFeature`](../interfaces/AnnotationFeature.md)\<`Geometry`, [`AnnotationProps`](../interfaces/AnnotationProps.md)\>

## Returns

`a is Comment`

---

# Function: isCommentArrow()

```ts
function isCommentArrow(arrow): boolean;
```

Check if an arrow is connected to a comment

## Parameters

### arrow

[`Arrow`](../interfaces/Arrow.md)

The arrow feature to check

## Returns

`boolean`

True if the arrow has a comment on either end

## Example

```typescript
if (isCommentArrow(arrow)) {
  // Handle comment arrow specially
}
```

---

## Utility Functions

# Function: getAnnotationsBounds()

```ts
function getAnnotationsBounds(annotations): Bounds;
```

Calculate the bounds of a collection of annotations

## Parameters

### annotations

[`AnnotationCollection`](../interfaces/AnnotationCollection.md)

## Returns

[`Bounds`](../type-aliases/Bounds.md)

Bounds [minX, minY, maxX, maxY]

---

# Function: getBbox()

```ts
function getBbox<T>(b): BBox;
```

## Type Parameters

### T

`T` *extends* [`Annotation`](../type-aliases/Annotation.md)

## Parameters

### b

`T`

## Returns

`BBox`

---

# Function: getArrowStart()

```ts
function getArrowStart(a): object;
```

## Parameters

### a

[`Arrow`](../interfaces/Arrow.md)

## Returns

`object`

### x

```ts
x: number;
```

### y

```ts
y: number;
```

---

# Function: getArrowEnd()

```ts
function getArrowEnd(a): object;
```

## Parameters

### a

[`Arrow`](../interfaces/Arrow.md)

## Returns

`object`

### x

```ts
x: number;
```

### y

```ts
y: number;
```

---

# Function: setArrowStart()

```ts
function setArrowStart(
   a, 
   x, 
   y): void;
```

## Parameters

### a

[`Arrow`](../interfaces/Arrow.md)

### x

`number`

### y

`number`

## Returns

`void`

---

# Function: setArrowEnd()

```ts
function setArrowEnd(
   a, 
   x, 
   y): void;
```

## Parameters

### a

[`Arrow`](../interfaces/Arrow.md)

### x

`number`

### y

`number`

## Returns

`void`

---

## Type Aliases

# Type Alias: Annotation

```ts
type Annotation = 
  | Arrow
  | Box
  | Text
  | Comment
  | Polygon;
```

Union type of all Annotation features

---

# Type Alias: AnnotationType

```ts
type AnnotationType = "arrow" | "text" | "box" | "comment" | "polygon";
```

Types of annotations supported

---

# Type Alias: FeatureEvents

```ts
type FeatureEvents = object;
```

## Properties

### add()

```ts
add: (evt) => void;
```

Event trigerred when adding an annotation

#### Parameters

##### evt

[`FeatureEvent`](../interfaces/FeatureEvent.md)

The annotation added

#### Returns

`void`

***

### cancelDrawing()

```ts
cancelDrawing: () => void;
```

Event trigerred when canceling drawing mode

#### Returns

`void`

***

### click()

```ts
click: (evt) => void;
```

Event triggered when a click completes on an annotation (mouseup without drag)

#### Parameters

##### evt

[`ClickEvent`](../interfaces/ClickEvent.md)

#### Returns

`void`

***

### completeDrawing()

```ts
completeDrawing: (evt) => void;
```

Event trigerred when completing a drawing operation

#### Parameters

##### evt

[`FeatureEvent`](../interfaces/FeatureEvent.md)

Contains the ID of the completed annotation

#### Returns

`void`

***

### dragend()

```ts
dragend: (evt) => void;
```

Event triggered when a drag operation ends on an annotation

#### Parameters

##### evt

[`DragEvent`](../interfaces/DragEvent.md)

#### Returns

`void`

***

### dragstart()

```ts
dragstart: (evt) => void;
```

Event triggered when a drag operation starts on an annotation

#### Parameters

##### evt

[`DragEvent`](../interfaces/DragEvent.md)

#### Returns

`void`

***

### history()

```ts
history: (evt) => void;
```

Event trigerred when history state changes (after undo/redo operations)

#### Parameters

##### evt

[`HistoryEvent`](../interfaces/HistoryEvent.md)

Contains boolean flags for undo/redo availability

#### Returns

`void`

***

### link()

```ts
link: (evt) => void;
```

Event trigerred when linking an arrow to a node or annotation

#### Parameters

##### evt

Contains the arrow and link details

###### arrow

[`Arrow`](../interfaces/Arrow.md)

###### link

[`Link`](../interfaces/Link.md)

#### Returns

`void`

***

### remove()

```ts
remove: (evt) => void;
```

Event trigerred when removing an annotation

#### Parameters

##### evt

[`FeatureEvent`](../interfaces/FeatureEvent.md)

The annotation removed

#### Returns

`void`

***

### select()

```ts
select: (evt) => void;
```

Event trigerred when selecting an annotation

#### Parameters

##### evt

[`FeaturesEvent`](../interfaces/FeaturesEvent.md)

The annotation selected

#### Returns

`void`

***

### unselect()

```ts
unselect: (evt) => void;
```

Event trigerred when unselecting an annotation

#### Parameters

##### evt

[`FeaturesEvent`](../interfaces/FeaturesEvent.md)

The annotation unselected

#### Returns

`void`

***

### update()

```ts
update: (evt) => void;
```

Event trigerred when updating an annotation.
This fires after any modification including drag operations, style changes, scaling, etc.

#### Parameters

##### evt

[`Annotation`](Annotation.md)

The updated annotation with all changes applied

#### Returns

`void`

---

# Type Alias: ControllerOptions

```ts
type ControllerOptions = object;
```

Options for the annotations control

## Properties

### detectMargin

```ts
detectMargin: number;
```

The margin in which the Texts are detected when looking for magnet points

***

### editButtonIcon

```ts
editButtonIcon: string;
```

SVG icon for the edit button in text editor
Should be a complete SVG string (e.g., '<svg>...</svg>')

***

### magnetHandleRadius

```ts
magnetHandleRadius: number;
```

Display size of the magnet point

***

### magnetRadius

```ts
magnetRadius: number;
```

The radius in which arrows are attracted

***

### maxArrowHeight

```ts
maxArrowHeight: number;
```

Maximum height of the arrow in units

***

### minArrowHeight

```ts
minArrowHeight: number;
```

Minimum height of the arrow in units

***

### sendButtonIcon

```ts
sendButtonIcon: string;
```

SVG icon for the send button in text editor
Should be a complete SVG string (e.g., '<svg>...</svg>')

***

### showEditButton

```ts
showEditButton: boolean;
```

Show edit button in text editor

***

### showSendButton

```ts
showSendButton: boolean;
```

Show send button in text editor

***

### textPlaceholder

```ts
textPlaceholder: string;
```

Placeholder for the text input

---

# Type Alias: Side

```ts
type Side = 
  | typeof SIDE_START
  | typeof SIDE_END;
```

---

# Type Alias: Extremity

```ts
type Extremity = "none" | "arrow" | "arrow-plain" | "dot" | "halo-dot";
```

Extremity types for arrow annotations.

---

# Type Alias: Color

```ts
type Color = 
  | HexColor
  | RgbColor
  | RgbaColor
  | "transparent"
  | "none"
  | string;
```

Any valid color format

---

## Default Styles

# Variable: defaultArrowStyle

```ts
const defaultArrowStyle: ArrowStyles;
```

Default style configuration for arrow annotations.

## Example

```typescript
{
  strokeType: "plain",
  strokeColor: "#202020",
  strokeWidth: 1,
  head: "none",
  tail: "none"
}
```

---

# Variable: defaultTextOptions

```ts
const defaultTextOptions: Text;
```

Default options for creating new Text annotations.
Contains the default text structure with [defaultTextStyle](defaultTextStyle.md).

---

# Variable: defaultBoxStyle

```ts
const defaultBoxStyle: BoxStyle;
```

Default style configuration for box annotations.

## Example

```typescript
{
  background: "#f5f5f5",
  strokeWidth: 0,
  borderRadius: 8,
  padding: 16,
  strokeType: "plain"
}
```

---

# Variable: defaultPolygonStyle

```ts
const defaultPolygonStyle: PolygonStyle;
```

Default style configuration for polygon annotations.

## Example

```typescript
{
  background: "transparent",
  strokeWidth: 2,
  borderRadius: 8,
  padding: 16,
  strokeType: "plain",
  strokeColor: "#000000"
}
```

---

# Variable: defaultCommentStyle

```ts
const defaultCommentStyle: CommentStyle;
```

Default style for Comment annotations

## Example

```typescript
{
  // Box styling
  background: "#FFFACD", // Light yellow (sticky note color)
  padding: 8,
  borderRadius: 4,
  strokeColor: "#DDD",
  strokeWidth: 1,
  strokeType: "plain",

  // Icon styling (collapsed mode)
  iconColor: "#FFCB2F", // Gold
  iconSymbol: "💬",
  iconBorderColor: "#aaa",
  iconBorderWidth: 2,

  // Size properties
  minHeight: 60,
  iconSize: 32,

  // Text styling
  color: "#333",
  font: "Arial, sans-serif",
  fontSize: 12,

  // Editing UI
  showSendButton: true,
  autoGrow: true,

  // Visual effects
  shadow: true,
  expandOnSelect: false,

  // Fixed size (always screen-aligned)
  fixedSize: true
}
```

---

## Event Constants

# Variable: EVT\_ADD

```ts
const EVT_ADD: "add" = "add";
```

---

# Variable: EVT\_REMOVE

```ts
const EVT_REMOVE: "remove" = "remove";
```

---

# Variable: EVT\_UPDATE

```ts
const EVT_UPDATE: "update" = "update";
```

---

# Variable: EVT\_SELECT

```ts
const EVT_SELECT: "select" = "select";
```

---

# Variable: EVT\_UNSELECT

```ts
const EVT_UNSELECT: "unselect" = "unselect";
```

---

# Variable: EVT\_HISTORY

```ts
const EVT_HISTORY: "history" = "history";
```

---

# Variable: EVT\_COMPLETE\_DRAWING

```ts
const EVT_COMPLETE_DRAWING: "completeDrawing" = "completeDrawing";
```

---

# Variable: EVT\_CANCEL\_DRAWING

```ts
const EVT_CANCEL_DRAWING: "cancelDrawing" = "cancelDrawing";
```

---

