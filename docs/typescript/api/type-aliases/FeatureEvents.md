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
click: () => void;
```

Event triggered when a click completes on an annotation (mouseup without drag)

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
dragend: () => void;
```

Event triggered when a drag operation ends on an annotation

#### Returns

`void`

***

### dragstart()

```ts
dragstart: () => void;
```

Event triggered when a drag operation starts on an annotation

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
