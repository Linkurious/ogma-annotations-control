import React from "react";
import { useAnnotationsContext } from "../../../src/AnnotationsContext";
import "../tooltip.css";
import "./AddMenu.css";

import {
  Trash,
  Undo,
  Redo,
  Pentagon,
  RectangleHorizontal,
  MessageSquare,
  Download,
  Type,
  ArrowRight
} from "lucide-react";

export const AddMenu = () => {
  const { editor, canUndo, canRedo, undo, redo, remove } =
    useAnnotationsContext();

  const handleArrow = React.useCallback(() => {
    editor.enableArrowDrawing({
      strokeType: "plain",
      strokeColor: "#3A03CF",
      strokeWidth: 2,
      head: "arrow"
    });
  }, [editor]);

  const handleText = React.useCallback(() => {
    editor.enableTextDrawing({
      font: "IBM Plex Sans",
      fontSize: 24,
      color: "#3A03CF",
      background: "#EDE6FF",
      borderRadius: 8,
      padding: 12
    });
  }, [editor]);

  const handleBox = React.useCallback(() => {
    editor.enableBoxDrawing({
      background: "#EDE6FF",
      borderRadius: 8,
      padding: 12
    });
  }, [editor]);

  const handlePolygon = React.useCallback(() => {
    editor.enablePolygonDrawing({
      strokeColor: "#3A03CF",
      strokeWidth: 2,
      background: "rgba(58, 3, 207, 0.15)"
    });
  }, [editor]);

  const handleComment = React.useCallback(() => {
    editor.enableCommentDrawing({
      offsetX: 200,
      offsetY: -150,
      commentStyle: {
        content: "",
        style: {
          color: "#3A03CF",
          background: "#EDE6FF",
          fontSize: 16,
          font: "IBM Plex Sans"
        }
      },
      arrowStyle: {
        style: {
          strokeType: "plain",
          strokeColor: "#3A03CF",
          strokeWidth: 2,
          head: "halo-dot"
        }
      }
    });
  }, [editor]);

  const handleDelete = React.useCallback(() => {
    const selected = editor.getSelectedAnnotations();
    if (selected.features.length > 0) {
      remove(selected);
    }
  }, [editor, remove]);

  function save() {
    // download the file
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([JSON.stringify(editor.getAnnotations(), null, 2)], {
        type: "text/plain"
      })
    );
    a.download = "annotations.json";
    a.click();
  }

  const stopEvent = React.useCallback((evt: React.MouseEvent) => {
    evt.stopPropagation();
  }, []);

  const buttonSize = 16;
  return (
    <div className="add-menu" onClick={stopEvent} onMouseMove={stopEvent}>
      <button data-tooltip="Add arrow" onClick={handleArrow}>
        <ArrowRight width={buttonSize} height={buttonSize} />
      </button>
      <button data-tooltip="Add comment" onClick={handleComment}>
        <MessageSquare width={buttonSize} height={buttonSize} />
      </button>
      <button data-tooltip="Add box" onClick={handleBox}>
        <RectangleHorizontal width={buttonSize} height={buttonSize} />
      </button>
      <button data-tooltip="Add text" onClick={handleText}>
        <Type width={buttonSize} height={buttonSize} />
      </button>
      <button
        data-tooltip="Add polygon (click points, Esc to finish)"
        onClick={handlePolygon}
      >
        <Pentagon width={buttonSize} height={buttonSize} />
      </button>
      <span className="separator"></span>
      <button data-tooltip="Undo" onClick={() => undo()} disabled={!canUndo}>
        <Undo width={buttonSize} height={buttonSize} />
      </button>
      <button data-tooltip="Redo" onClick={() => redo()} disabled={!canRedo}>
        <Redo width={buttonSize} height={buttonSize} />
      </button>
      <span className="separator"></span>
      <button data-tooltip="Delete selected" onClick={handleDelete}>
        <Trash width={buttonSize} height={buttonSize} />
      </button>
      <span className="separator"></span>
      <button data-tooltip="Export annotations" onClick={() => save()}>
        <Download width={buttonSize} height={buttonSize} />
      </button>
    </div>
  );
};
