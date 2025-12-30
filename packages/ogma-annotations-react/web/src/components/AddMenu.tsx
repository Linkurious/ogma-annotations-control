import {
  EVT_COMPLETE_DRAWING,
  EVT_CANCEL_DRAWING
} from "@linkurious/ogma-annotations";
import {
  Trash,
  Undo,
  Redo,
  Pentagon,
  RectangleHorizontal,
  MessageSquare,
  Download,
  Type,
  ArrowRight,
  Camera
} from "lucide-react";
import React from "react";
import { useAnnotationsContext } from "../../../src";
import "../tooltip.css";
import "./AddMenu.css";

interface AddMenuProps {
  onSvgExport: () => void;
}

type DrawingMode = "arrow" | "comment" | "box" | "text" | "polygon" | null;

export const AddMenu = ({ onSvgExport }: AddMenuProps) => {
  const { editor, canUndo, canRedo, undo, redo, remove } =
    useAnnotationsContext();
  const [activeMode, setActiveMode] = React.useState<DrawingMode>(null);

  // Listen to drawing completion and cancellation events to clear active mode
  React.useEffect(() => {
    if (!editor) return;

    const handleDrawingEnd = () => {
      setActiveMode(null);
    };

    editor.on(EVT_COMPLETE_DRAWING, handleDrawingEnd);
    editor.on(EVT_CANCEL_DRAWING, handleDrawingEnd);

    return () => {
      editor.off(EVT_COMPLETE_DRAWING, handleDrawingEnd);
      editor.off(EVT_CANCEL_DRAWING, handleDrawingEnd);
    };
  }, [editor]);

  const handleArrow = React.useCallback(() => {
    editor.enableArrowDrawing({
      strokeType: "plain",
      strokeColor: "#3A03CF",
      strokeWidth: 2,
      head: "arrow"
    });
    setActiveMode("arrow");
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
    setActiveMode("text");
  }, [editor]);

  const handleBox = React.useCallback(() => {
    editor.enableBoxDrawing({
      background: "#EDE6FF",
      borderRadius: 8,
      padding: 12
    });
    setActiveMode("box");
  }, [editor]);

  const handlePolygon = React.useCallback(() => {
    editor.enablePolygonDrawing({
      strokeColor: "#3A03CF",
      strokeWidth: 2,
      background: "rgba(58, 3, 207, 0.15)"
    });
    setActiveMode("polygon");
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
    setActiveMode("comment");
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
    evt.preventDefault();
  }, []);

  const buttonSize = 16;
  return (
    <div className="add-menu" onClick={stopEvent} onMouseMove={stopEvent}>
      <button
        data-tooltip="Add arrow"
        onClick={handleArrow}
        className={activeMode === "arrow" ? "active" : ""}
      >
        <ArrowRight width={buttonSize} height={buttonSize} />
      </button>
      <button
        data-tooltip="Add comment"
        onClick={handleComment}
        className={activeMode === "comment" ? "active" : ""}
      >
        <MessageSquare width={buttonSize} height={buttonSize} />
      </button>
      <button
        data-tooltip="Add box"
        onClick={handleBox}
        className={activeMode === "box" ? "active" : ""}
      >
        <RectangleHorizontal width={buttonSize} height={buttonSize} />
      </button>
      <button
        data-tooltip="Add text"
        onClick={handleText}
        className={activeMode === "text" ? "active" : ""}
      >
        <Type width={buttonSize} height={buttonSize} />
      </button>
      <button
        data-tooltip="Add polygon (click points, Esc to finish)"
        onClick={handlePolygon}
        className={activeMode === "polygon" ? "active" : ""}
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
      <button data-tooltip="Export SVG" onClick={onSvgExport}>
        <Camera width={buttonSize} height={buttonSize} />
      </button>
    </div>
  );
};
