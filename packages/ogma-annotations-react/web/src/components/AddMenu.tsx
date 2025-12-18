import React from "react";
import { useAnnotationsContext } from "../../../src/AnnotationsContext";
import "../tooltip.css";
import {
  Text,
  ArrowRight,
  Download,
  Square,
  Pentagon,
  ChatBubble,
  Undo,
  Redo,
  Trash
} from "iconoir-react";
import "./AddMenu.css";

export const AddMenu = () => {
  const { editor, canUndo, canRedo, undo, redo, remove } =
    useAnnotationsContext();

  const handleArrow = () => {
    editor.enableArrowDrawing({
      strokeType: "plain",
      strokeColor: "#3A03CF",
      strokeWidth: 2,
      head: "arrow"
    });
  };

  const handleText = () => {
    editor.enableTextDrawing({
      font: "IBM Plex Sans",
      fontSize: 24,
      color: "#3A03CF",
      background: "#EDE6FF",
      borderRadius: 8,
      padding: 12
    });
  };

  const handleBox = () => {
    editor.enableBoxDrawing({
      background: "#EDE6FF",
      borderRadius: 8,
      padding: 12
    });
  };

  const handlePolygon = () => {
    editor.enablePolygonDrawing({
      strokeColor: "#3A03CF",
      strokeWidth: 2,
      background: "rgba(58, 3, 207, 0.15)"
    });
  };

  const handleComment = () => {
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
  };

  const handleDelete = () => {
    const selected = editor.getSelectedAnnotations();
    if (selected.features.length > 0) {
      remove(selected);
    }
  };

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

  const buttonSize = 16;
  return (
    <div className="add-menu">
      <button data-tooltip="Add arrow" onClick={handleArrow}>
        <ArrowRight width={buttonSize} height={buttonSize} />
      </button>
      <button data-tooltip="Add comment" onClick={handleComment}>
        <ChatBubble width={buttonSize} height={buttonSize} />
      </button>
      <button data-tooltip="Add box" onClick={handleBox}>
        <Square width={buttonSize} height={buttonSize} />
      </button>
      <button data-tooltip="Add text" onClick={handleText}>
        <Text width={buttonSize} height={buttonSize} />
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
