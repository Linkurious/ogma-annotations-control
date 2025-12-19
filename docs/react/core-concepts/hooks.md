# useAnnotationsContext Hook

The `useAnnotationsContext` hook provides access to all annotation state and methods within components wrapped by the `AnnotationsContextProvider`.

## Basic Usage

Import and use the hook in any component inside the provider:

```tsx
import { useAnnotationsContext } from '@linkurious/ogma-annotations-react';

function MyComponent() {
  const context = useAnnotationsContext();

  return (
    <div>
      <p>Annotations: {context.annotations.features.length}</p>
    </div>
  );
}
```

## Destructuring Values

Typically, you'll destructure only the values you need:

```tsx
function Toolbar() {
  const { editor, canUndo, canRedo, undo, redo } = useAnnotationsContext();

  return (
    <>
      <button onClick={() => editor.enableArrowDrawing({})}>Add Arrow</button>
      <button onClick={undo} disabled={!canUndo}>Undo</button>
      <button onClick={redo} disabled={!canRedo}>Redo</button>
    </>
  );
}
```

## Available Values

The hook returns an object (`IAnnotationsContext`) with the following properties:

### Core State

#### annotations
- **Type:** `AnnotationCollection`
- **Description:** All annotations currently in the graph

```tsx
const { annotations } = useAnnotationsContext();

console.log(annotations.features.length); // Number of annotations
annotations.features.forEach(annotation => {
  console.log(annotation.id, annotation.properties.type);
});
```

#### editor
- **Type:** `Control`
- **Description:** The annotations editor (Control instance) for direct access to all methods

```tsx
const { editor } = useAnnotationsContext();

// Enable drawing modes
editor.enableArrowDrawing({...});
editor.enableTextDrawing({...});

// Get annotations
const all = editor.getAnnotations();
const selected = editor.getSelectedAnnotations();
```

### Selection State

#### currentAnnotation
- **Type:** `AnnotationFeature | null`
- **Description:** The currently selected annotation, or `null` if none selected

```tsx
const { currentAnnotation } = useAnnotationsContext();

if (currentAnnotation) {
  console.log('Selected:', currentAnnotation.id);
  console.log('Type:', currentAnnotation.properties.type);
}
```

#### setCurrentAnnotation
- **Type:** `(annotation: AnnotationFeature | null) => void`
- **Description:** Manually set the current annotation

```tsx
const { setCurrentAnnotation, annotations } = useAnnotationsContext();

// Select the first annotation
if (annotations.features.length > 0) {
  setCurrentAnnotation(annotations.features[0]);
}

// Deselect
setCurrentAnnotation(null);
```

### Arrow Style State

#### arrowStyle
- **Type:** `ArrowStyles`
- **Description:** Current arrow style for the selected arrow or for new arrows

```tsx
const { arrowStyle } = useAnnotationsContext();

console.log(arrowStyle.strokeColor);   // e.g., '#3498db'
console.log(arrowStyle.strokeWidth);   // e.g., 2
console.log(arrowStyle.head);          // e.g., 'arrow'
```

#### setArrowStyle
- **Type:** `(style: ArrowStyles) => void`
- **Description:** Update the arrow style (automatically applies to selected arrow)

```tsx
const { arrowStyle, setArrowStyle } = useAnnotationsContext();

// Change color
setArrowStyle({
  ...arrowStyle,
  strokeColor: '#e74c3c'
});

// Change width
setArrowStyle({
  ...arrowStyle,
  strokeWidth: 5
});

// Change arrow head
setArrowStyle({
  ...arrowStyle,
  head: 'arrow',
  tail: 'none'
});
```

::: tip Automatic Updates
When you call `setArrowStyle`, the provider automatically updates the currently selected arrow annotation!
:::

#### arrowWidthFactor
- **Type:** `number`
- **Description:** Width scaling factor for arrows (adjusted based on graph scale)

#### setArrowWidthFactor
- **Type:** `(factor: number) => void`
- **Description:** Set the arrow width scaling factor

### Text Style State

#### textStyle
- **Type:** `TextStyle`
- **Description:** Current text style for the selected text or for new text annotations

```tsx
const { textStyle } = useAnnotationsContext();

console.log(textStyle.font);         // e.g., 'Arial'
console.log(textStyle.fontSize);     // e.g., 16
console.log(textStyle.color);        // e.g., '#2c3e50'
console.log(textStyle.background);   // e.g., '#ffffff'
```

#### setTextStyle
- **Type:** `(style: TextStyle) => void`
- **Description:** Update the text style (automatically applies to selected text)

```tsx
const { textStyle, setTextStyle } = useAnnotationsContext();

// Change font
setTextStyle({
  ...textStyle,
  font: 'Arial'
});

// Change size and color
setTextStyle({
  ...textStyle,
  fontSize: 18,
  color: '#e74c3c'
});

// Change background
setTextStyle({
  ...textStyle,
  background: '#f0f0f0',
  borderRadius: 4,
  padding: 12
});
```

#### textSizeFactor
- **Type:** `number`
- **Description:** Size scaling factor for text (adjusted based on graph scale)

#### setTextSizeFactor
- **Type:** `(factor: number) => void`
- **Description:** Set the text size scaling factor

### History Management

#### canUndo
- **Type:** `boolean`
- **Description:** Whether undo operation is available

#### canRedo
- **Type:** `boolean`
- **Description:** Whether redo operation is available

#### undo
- **Type:** `() => boolean`
- **Description:** Undo the last action, returns `true` if successful

#### redo
- **Type:** `() => boolean`
- **Description:** Redo the last undone action, returns `true` if successful

#### clearHistory
- **Type:** `() => void`
- **Description:** Clear the undo/redo history

```tsx
function HistoryControls() {
  const { canUndo, canRedo, undo, redo, clearHistory } = useAnnotationsContext();

  return (
    <div>
      <button onClick={undo} disabled={!canUndo}>Undo</button>
      <button onClick={redo} disabled={!canRedo}>Redo</button>
      <button onClick={clearHistory}>Clear History</button>
    </div>
  );
}
```

### Annotation Management

#### add
- **Type:** `(annotation: Annotation | AnnotationCollection) => void`
- **Description:** Add one or more annotations

```tsx
const { add } = useAnnotationsContext();
import { createArrow, createText } from '@linkurious/ogma-annotations';

// Add single annotation
add(createArrow(0, 0, 100, 100, { strokeColor: '#3498db' }));

// Add multiple annotations
add({
  type: 'FeatureCollection',
  features: [
    createArrow(0, 0, 100, 100),
    createText(50, 50, 'Label')
  ]
});
```

#### remove
- **Type:** `(annotation: Annotation | AnnotationCollection) => void`
- **Description:** Remove one or more annotations

```tsx
const { remove, editor } = useAnnotationsContext();

// Remove selected annotations
const selected = editor.getSelectedAnnotations();
remove(selected);

// Remove all annotations
const all = editor.getAnnotations();
remove(all);
```

#### select
- **Type:** `(ids: string | string[]) => void`
- **Description:** Select annotation(s) by ID

```tsx
const { select } = useAnnotationsContext();

// Select by ID
select('annotation-123');

// Select multiple
select(['annotation-123', 'annotation-456']);
```

#### cancelDrawing
- **Type:** `() => void`
- **Description:** Cancel the current drawing operation

```tsx
const { cancelDrawing } = useAnnotationsContext();

// Cancel on Escape key
React.useEffect(() => {
  const handleKeyDown = (evt: KeyboardEvent) => {
    if (evt.key === 'Escape') {
      cancelDrawing();
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [cancelDrawing]);
```

### Drawing Methods

#### enableBoxDrawing
- **Type:** `(style?: Partial<BoxStyle>) => void`
- **Description:** Enable box drawing mode

```tsx
const { editor } = useAnnotationsContext();

editor.enableBoxDrawing({
  background: '#f0f0f0',
  borderRadius: 8,
  padding: 12
});
```

#### enablePolygonDrawing
- **Type:** `(style?: Partial<PolygonStyle>) => void`
- **Description:** Enable polygon drawing mode

```tsx
const { editor } = useAnnotationsContext();

editor.enablePolygonDrawing({
  strokeColor: '#3498db',
  strokeWidth: 2,
  background: 'rgba(52, 152, 219, 0.2)'
});
```

#### enableCommentDrawing
- **Type:** `(options?) => void`
- **Description:** Enable comment drawing mode (text with arrow)

```tsx
const { editor } = useAnnotationsContext();

editor.enableCommentDrawing({
  offsetX: 200,
  offsetY: -150,
  commentStyle: {
    content: '',
    style: {
      color: '#2c3e50',
      background: '#ffffff',
      fontSize: 16,
      font: 'Arial'
    }
  },
  arrowStyle: {
    style: {
      strokeColor: '#3498db',
      strokeWidth: 2,
      head: 'arrow'
    }
  }
});
```

## TypeScript Types

The hook returns `IAnnotationsContext`. Import the type for type safety:

```tsx
import { useAnnotationsContext, type IAnnotationsContext } from '@linkurious/ogma-annotations-react';

function MyComponent() {
  const context: IAnnotationsContext = useAnnotationsContext();
  // Fully typed!
}
```

## Common Patterns

### Conditional Rendering Based on Selection

```tsx
function StylePanel() {
  const { currentAnnotation } = useAnnotationsContext();

  if (!currentAnnotation) {
    return <div>No annotation selected</div>;
  }

  return (
    <div>
      <h3>Editing: {currentAnnotation.id}</h3>
      {isArrow(currentAnnotation) && <ArrowStyleControls />}
      {isText(currentAnnotation) && <TextStyleControls />}
    </div>
  );
}
```

### Syncing with External State

```tsx
function AnnotationsSync() {
  const { annotations } = useAnnotationsContext();

  // Save to localStorage whenever annotations change
  React.useEffect(() => {
    localStorage.setItem('annotations', JSON.stringify(annotations));
  }, [annotations]);

  // Or sync with a backend
  React.useEffect(() => {
    fetch('/api/annotations', {
      method: 'POST',
      body: JSON.stringify(annotations)
    });
  }, [annotations]);

  return null; // This component just handles syncing
}
```

### Building a Delete Button

```tsx
function DeleteButton() {
  const { editor, remove, currentAnnotation } = useAnnotationsContext();

  const handleDelete = () => {
    const selected = editor.getSelectedAnnotations();
    if (selected.features.length > 0) {
      remove(selected);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={!currentAnnotation}
    >
      Delete Selected
    </button>
  );
}
```

### Creating a Toolbar

```tsx
function Toolbar() {
  const { editor, undo, redo, canUndo, canRedo } = useAnnotationsContext();

  return (
    <div className="toolbar">
      <button onClick={() => editor.enableArrowDrawing({ strokeColor: '#3498db' })}>
        Arrow
      </button>
      <button onClick={() => editor.enableTextDrawing({ fontSize: 16 })}>
        Text
      </button>
      <button onClick={() => editor.enableBoxDrawing({})}>
        Box
      </button>
      <span className="separator" />
      <button onClick={undo} disabled={!canUndo}>Undo</button>
      <button onClick={redo} disabled={!canRedo}>Redo</button>
    </div>
  );
}
```

## Next Steps

- [Creating Annotations Interactively](/react/creating-annotations/interactive) - Enable user-driven creation
- [Managing Styles](/react/styling/arrow-styles) - Build style controls
- [Building UI Components](/react/ui-components/toolbar) - Create complete toolbars and panels
