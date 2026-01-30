# Building an Annotation List

Learn how to build a list component to display and manage annotations using the React context.

## Overview

An annotation list displays all annotations and allows users to select, filter, and manage them. Use the `useAnnotationsContext` hook to access annotation data and manage selection.

## Basic Annotation List Example

```tsx
import React from "react";
import { useAnnotationsContext } from "@linkurious/ogma-annotations-react";

function AnnotationList() {
  const { editor } = useAnnotationsContext();
  const [annotations, setAnnotations] = React.useState<any[]>([]);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    const updateList = () => {
      const all = editor.getAnnotations();
      setAnnotations(all.features);

      const selectedAnnotations = editor.getSelectedAnnotations();
      setSelected(new Set(selectedAnnotations.features.map((f) => f.id)));
    };

    // Update on any annotation change
    editor.on("add", updateList);
    editor.on("remove", updateList);
    editor.on("update", updateList);
    editor.on("select", updateList);
    editor.on("unselect", updateList);

    updateList();

    return () => {
      editor.off("add", updateList);
      editor.off("remove", updateList);
      editor.off("update", updateList);
      editor.off("select", updateList);
      editor.off("unselect", updateList);
    };
  }, [editor]);

  const handleSelect = React.useCallback(
    (id: string) => {
      editor.select(id);
    },
    [editor]
  );

  const handleDelete = React.useCallback(
    (id: string) => {
      editor.remove(id);
    },
    [editor]
  );

  return (
    <div className="annotation-list">
      <h3>Annotations ({annotations.length})</h3>
      <ul>
        {annotations.map((annotation) => (
          <li
            key={annotation.id}
            className={selected.has(annotation.id) ? "selected" : ""}
            onClick={() => handleSelect(annotation.id)}
          >
            <span className="type">{annotation.properties.type}</span>
            {annotation.properties.type === "text" && (
              <span className="content">
                {annotation.properties.content.substring(0, 30)}
              </span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(annotation.id);
              }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default AnnotationList;
```

## Filterable Annotation List

Add filtering by annotation type:

```tsx
import React from "react";
import { useAnnotationsContext } from "@linkurious/ogma-annotations-react";
import type { AnnotationType } from "@linkurious/ogma-annotations";

function AnnotationList() {
  const { editor } = useAnnotationsContext();
  const [annotations, setAnnotations] = React.useState<any[]>([]);
  const [filter, setFilter] = React.useState<AnnotationType | "all">("all");

  React.useEffect(() => {
    const updateList = () => {
      const all = editor.getAnnotations();
      setAnnotations(all.features);
    };

    editor.on("add", updateList);
    editor.on("remove", updateList);
    updateList();

    return () => {
      editor.off("add", updateList);
      editor.off("remove", updateList);
    };
  }, [editor]);

  const filteredAnnotations = React.useMemo(() => {
    if (filter === "all") return annotations;
    return annotations.filter((a) => a.properties.type === filter);
  }, [annotations, filter]);

  const counts = React.useMemo(() => {
    return {
      all: annotations.length,
      text: annotations.filter((a) => a.properties.type === "text").length,
      arrow: annotations.filter((a) => a.properties.type === "arrow").length,
      box: annotations.filter((a) => a.properties.type === "box").length,
      polygon: annotations.filter((a) => a.properties.type === "polygon").length,
      comment: annotations.filter((a) => a.properties.type === "comment").length
    };
  }, [annotations]);

  return (
    <div className="annotation-list">
      <div className="filters">
        <button
          className={filter === "all" ? "active" : ""}
          onClick={() => setFilter("all")}
        >
          All ({counts.all})
        </button>
        <button
          className={filter === "text" ? "active" : ""}
          onClick={() => setFilter("text")}
        >
          Text ({counts.text})
        </button>
        <button
          className={filter === "arrow" ? "active" : ""}
          onClick={() => setFilter("arrow")}
        >
          Arrows ({counts.arrow})
        </button>
        <button
          className={filter === "box" ? "active" : ""}
          onClick={() => setFilter("box")}
        >
          Boxes ({counts.box})
        </button>
      </div>

      <ul>
        {filteredAnnotations.map((annotation) => (
          <li key={annotation.id} onClick={() => editor.select(annotation.id)}>
            {annotation.properties.type}: {annotation.id}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## List with Bulk Actions

Add bulk delete and select all functionality:

```tsx
import React from "react";
import { useAnnotationsContext } from "@linkurious/ogma-annotations-react";

function AnnotationList() {
  const { editor } = useAnnotationsContext();
  const [annotations, setAnnotations] = React.useState<any[]>([]);

  React.useEffect(() => {
    const updateList = () => {
      const all = editor.getAnnotations();
      setAnnotations(all.features);
    };

    editor.on("add", updateList);
    editor.on("remove", updateList);
    updateList();

    return () => {
      editor.off("add", updateList);
      editor.off("remove", updateList);
    };
  }, [editor]);

  const selectAll = React.useCallback(() => {
    const ids = annotations.map((a) => a.id);
    editor.select(ids);
  }, [editor, annotations]);

  const unselectAll = React.useCallback(() => {
    editor.unselect();
  }, [editor]);

  const deleteAll = React.useCallback(() => {
    if (confirm(`Delete all ${annotations.length} annotations?`)) {
      const all = editor.getAnnotations();
      editor.remove(all);
      editor.clearHistory();
    }
  }, [editor, annotations]);

  const deleteSelected = React.useCallback(() => {
    const selected = editor.getSelectedAnnotations();
    if (selected.features.length > 0) {
      editor.remove(selected);
    }
  }, [editor]);

  return (
    <div className="annotation-list">
      <div className="bulk-actions">
        <button onClick={selectAll}>Select All</button>
        <button onClick={unselectAll}>Unselect All</button>
        <button onClick={deleteSelected}>Delete Selected</button>
        <button onClick={deleteAll} className="danger">
          Delete All
        </button>
      </div>

      <ul>
        {annotations.map((annotation) => (
          <li key={annotation.id}>
            {annotation.properties.type}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## See Also

- [Toolbar](/react/ui-components/toolbar) - Build a toolbar component
- [Style Panel](/react/ui-components/style-panel) - Build a style editing panel
- [`useAnnotationsContext`](/react/core-concepts/hooks) - Context hook reference
- [TypeScript Selection Guide](/typescript/managing/selection) - Selection details
- [TypeScript Deletion Guide](/typescript/managing/deletion) - Deletion details
