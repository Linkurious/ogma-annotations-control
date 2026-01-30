# Building a Style Panel

Learn how to build a style editing panel for updating annotation styles using the React context.

## Overview

A style panel allows users to modify the appearance of selected annotations. Use the `useAnnotationsContext` hook to access and update annotation styles.

## Basic Style Panel Example

```tsx
import React from "react";
import { useAnnotationsContext } from "@linkurious/ogma-annotations-react";

function StylePanel() {
  const { editor } = useAnnotationsContext();
  const [selected, setSelected] = React.useState<any[]>([]);

  React.useEffect(() => {
    const updateSelection = () => {
      const selectedAnnotations = editor.getSelectedAnnotations();
      setSelected(selectedAnnotations.features);
    };

    editor.on("select", updateSelection);
    editor.on("unselect", updateSelection);

    return () => {
      editor.off("select", updateSelection);
      editor.off("unselect", updateSelection);
    };
  }, [editor]);

  const updateStyle = React.useCallback(
    (styleUpdates: any) => {
      selected.forEach((annotation) => {
        Object.assign(annotation.properties.style, styleUpdates);
        editor.update(annotation);
      });
    },
    [editor, selected]
  );

  if (selected.length === 0) {
    return <div className="style-panel">No annotation selected</div>;
  }

  const firstAnnotation = selected[0];
  const style = firstAnnotation.properties.style;

  return (
    <div className="style-panel">
      <h3>
        Style {selected.length > 1 ? `(${selected.length} selected)` : ""}
      </h3>

      {/* Color controls */}
      {style.strokeColor !== undefined && (
        <label>
          Stroke Color:
          <input
            type="color"
            value={style.strokeColor}
            onChange={(e) => updateStyle({ strokeColor: e.target.value })}
          />
        </label>
      )}

      {style.strokeWidth !== undefined && (
        <label>
          Stroke Width:
          <input
            type="range"
            min="1"
            max="10"
            value={style.strokeWidth}
            onChange={(e) =>
              updateStyle({ strokeWidth: Number(e.target.value) })
            }
          />
        </label>
      )}

      {/* Text-specific controls */}
      {firstAnnotation.properties.type === "text" && (
        <>
          <label>
            Font Size:
            <input
              type="number"
              min="8"
              max="48"
              value={style.fontSize}
              onChange={(e) =>
                updateStyle({ fontSize: Number(e.target.value) })
              }
            />
          </label>

          <label>
            Text Color:
            <input
              type="color"
              value={style.color}
              onChange={(e) => updateStyle({ color: e.target.value })}
            />
          </label>

          <label>
            Background:
            <input
              type="color"
              value={style.background}
              onChange={(e) => updateStyle({ background: e.target.value })}
            />
          </label>
        </>
      )}

      {/* Arrow-specific controls */}
      {firstAnnotation.properties.type === "arrow" && (
        <label>
          Arrow Head:
          <select
            value={style.head}
            onChange={(e) => updateStyle({ head: e.target.value })}
          >
            <option value="none">None</option>
            <option value="arrow">Arrow</option>
            <option value="arrow-plain">Arrow (filled)</option>
            <option value="dot">Dot</option>
            <option value="halo-dot">Halo Dot</option>
          </select>
        </label>
      )}
    </div>
  );
}

export default StylePanel;
```

## Type-Safe Style Panel

Use TypeScript for better type safety:

```tsx
import React from "react";
import { useAnnotationsContext } from "@linkurious/ogma-annotations-react";
import type {
  Annotation,
  ArrowStyles,
  TextStyle
} from "@linkurious/ogma-annotations";

function StylePanel() {
  const { editor } = useAnnotationsContext();
  const [selected, setSelected] = React.useState<Annotation[]>([]);

  React.useEffect(() => {
    const updateSelection = () => {
      const selectedAnnotations = editor.getSelectedAnnotations();
      setSelected(selectedAnnotations.features as Annotation[]);
    };

    editor.on("select", updateSelection);
    editor.on("unselect", updateSelection);

    return () => {
      editor.off("select", updateSelection);
      editor.off("unselect", updateSelection);
    };
  }, [editor]);

  const updateStyle = React.useCallback(
    (styleUpdates: Partial<ArrowStyles | TextStyle>) => {
      selected.forEach((annotation) => {
        Object.assign(annotation.properties.style, styleUpdates);
        editor.update(annotation);
      });
    },
    [editor, selected]
  );

  if (selected.length === 0) {
    return null;
  }

  return <div className="style-panel">{/* Style controls */}</div>;
}
```

## Style Presets Panel

Provide quick style presets:

```tsx
import React from "react";
import { useAnnotationsContext } from "@linkurious/ogma-annotations-react";

const stylePresets = {
  primary: {
    strokeColor: "#3498db",
    strokeWidth: 2,
    color: "#2c3e50",
    background: "#ecf0f1"
  },
  success: {
    strokeColor: "#27ae60",
    strokeWidth: 2,
    color: "#ffffff",
    background: "#2ecc71"
  },
  warning: {
    strokeColor: "#f39c12",
    strokeWidth: 2,
    color: "#ffffff",
    background: "#f39c12"
  },
  danger: {
    strokeColor: "#e74c3c",
    strokeWidth: 3,
    color: "#ffffff",
    background: "#e74c3c"
  }
};

function StylePresets() {
  const { editor } = useAnnotationsContext();

  const applyPreset = React.useCallback(
    (preset: any) => {
      const selected = editor.getSelectedAnnotations();

      selected.features.forEach((annotation) => {
        Object.assign(annotation.properties.style, preset);
        editor.update(annotation);
      });
    },
    [editor]
  );

  return (
    <div className="style-presets">
      <h4>Quick Styles</h4>
      <div className="preset-buttons">
        {Object.entries(stylePresets).map(([name, preset]) => (
          <button
            key={name}
            onClick={() => applyPreset(preset)}
            style={{
              backgroundColor: preset.background,
              color: preset.color,
              border: `2px solid ${preset.strokeColor}`
            }}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}
```

## See Also

- [Toolbar](/react/ui-components/toolbar) - Build a toolbar component
- [Annotation List](/react/ui-components/annotation-list) - Display and manage annotations
- [Arrow Styles](/react/styling/arrow-styles) - Arrow styling in React
- [Text Styles](/react/styling/text-styles) - Text and shape styling in React
- [`useAnnotationsContext`](/react/core-concepts/hooks) - Context hook reference
- [TypeScript Styling Guide](/typescript/styling/arrow-styles) - Detailed style options
