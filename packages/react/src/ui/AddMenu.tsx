import {
  EVT_COMPLETE_DRAWING,
  EVT_CANCEL_DRAWING
} from "@linkurious/ogma-annotations";
import type {
  ToolbarDrawingType,
  AnnotationToolbarStyles,
  DeleteMode
} from "@linkurious/ogma-annotations/ui";
import React from "react";
import { useAnnotationsContext } from "@linkurious/ogma-annotations-react";
import { Icon } from "./Icon";

const DEFAULT_ENABLED_TYPES: ToolbarDrawingType[] = [
  "arrow",
  "comment",
  "sticky-note",
  "box",
  "text",
  "polygon"
];

export interface AddMenuProps {
  /**
   * Which drawing tools to show, and in what order. Defaults to all six:
   * `["arrow", "comment", "sticky-note", "box", "text", "polygon"]`.
   */
  enabledTypes?: ToolbarDrawingType[];
  /** Per-type default style overrides for the drawing tool buttons. */
  styles?: AnnotationToolbarStyles;
  /**
   * Which deletion control(s) to show - the erase tool, the
   * select-then-trash button, or both. Defaults to `"erase"`.
   */
  deleteMode?: DeleteMode;
  /** Called when the SVG export button is clicked. Omit to hide the button. */
  onSvgExport?: () => void;
  /** Called when the JSON export button is clicked. Omit to hide the button. */
  onJsonExport?: () => void;
}

type DrawingMode =
  | "arrow"
  | "comment"
  | "sticky-note"
  | "box"
  | "text"
  | "polygon"
  | "erase"
  | null;

export const AddMenu = ({
  enabledTypes = DEFAULT_ENABLED_TYPES,
  styles = {},
  deleteMode = "erase",
  onSvgExport,
  onJsonExport
}: AddMenuProps) => {
  const { editor, canUndo, canRedo, undo, redo, remove } =
    useAnnotationsContext();
  const [activeMode, setActiveMode] = React.useState<DrawingMode>(null);

  React.useEffect(() => {
    if (!editor) return;
    const handleDrawingEnd = () => setActiveMode(null);
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
      head: "arrow",
      ...styles.arrow
    });
    setActiveMode("arrow");
  }, [editor, styles.arrow]);

  const handleText = React.useCallback(() => {
    editor.enableTextDrawing({
      font: "IBM Plex Sans",
      fontSize: 24,
      color: "#3A03CF",
      background: "#EDE6FF",
      borderRadius: 8,
      padding: 12,
      ...styles.text
    });
    setActiveMode("text");
  }, [editor, styles.text]);

  const handleBox = React.useCallback(() => {
    editor.enableBoxDrawing({
      background: "#EDE6FF",
      borderRadius: 8,
      padding: 12,
      ...styles.box
    });
    setActiveMode("box");
  }, [editor, styles.box]);

  const handlePolygon = React.useCallback(() => {
    editor.enablePolygonDrawing({
      strokeColor: "#3A03CF",
      strokeWidth: 2,
      background: "rgba(58, 3, 207, 0.15)",
      ...styles.polygon
    });
    setActiveMode("polygon");
  }, [editor, styles.polygon]);

  const handleComment = React.useCallback(() => {
    const commentOverride = styles.comment?.commentStyle;
    const arrowOverride = styles.comment?.arrowStyle;
    editor.enableCommentDrawing({
      offsetX: styles.comment?.offsetX ?? 200,
      offsetY: styles.comment?.offsetY ?? -150,
      commentStyle: {
        content: "",
        ...commentOverride,
        style: {
          color: "#3A03CF",
          background: "#EDE6FF",
          fontSize: 16,
          font: "IBM Plex Sans",
          ...commentOverride?.style
        }
      },
      arrowStyle: {
        ...arrowOverride,
        style: {
          strokeType: "plain",
          strokeColor: "#3A03CF",
          strokeWidth: 2,
          head: "halo-dot",
          ...arrowOverride?.style
        }
      }
    });
    setActiveMode("comment");
  }, [editor, styles.comment]);

  const handleStickyNote = React.useCallback(() => {
    editor.enableStickyNoteDrawing({
      ...styles.stickyNote
    });
    setActiveMode("sticky-note");
  }, [editor, styles.stickyNote]);

  const handleErase = React.useCallback(() => {
    if (editor.isEraseModeActive()) {
      editor.disableEraseMode();
      setActiveMode(null);
    } else {
      editor.enableEraseMode();
      setActiveMode("erase");
    }
  }, [editor]);

  const handleDelete = React.useCallback(() => {
    const selected = editor.getSelectedAnnotations();
    if (selected.features.length > 0) remove(selected);
  }, [editor, remove]);

  const stopEvent = React.useCallback((evt: React.MouseEvent) => {
    evt.stopPropagation();
    evt.preventDefault();
  }, []);

  const isEnabled = (type: ToolbarDrawingType) => enabledTypes.includes(type);

  return (
    <div className="add-menu" onClick={stopEvent} onMouseMove={stopEvent}>
      {isEnabled("arrow") && (
        <button
          data-tooltip="Add arrow"
          onClick={handleArrow}
          className={activeMode === "arrow" ? "active" : ""}
        >
          <Icon name="arrow-right" size={16} />
        </button>
      )}
      {isEnabled("comment") && (
        <button
          data-tooltip="Add comment"
          onClick={handleComment}
          className={activeMode === "comment" ? "active" : ""}
        >
          <Icon name="message-square" size={16} />
        </button>
      )}
      {isEnabled("sticky-note") && (
        <button
          data-tooltip="Add sticky note"
          onClick={handleStickyNote}
          className={activeMode === "sticky-note" ? "active" : ""}
        >
          <Icon name="sticky-note" size={16} />
        </button>
      )}
      {isEnabled("box") && (
        <button
          data-tooltip="Add box"
          onClick={handleBox}
          className={activeMode === "box" ? "active" : ""}
        >
          <Icon name="rectangle-horizontal" size={16} />
        </button>
      )}
      {isEnabled("text") && (
        <button
          data-tooltip="Add text"
          onClick={handleText}
          className={activeMode === "text" ? "active" : ""}
        >
          <Icon name="type" size={16} />
        </button>
      )}
      {isEnabled("polygon") && (
        <button
          data-tooltip="Add polygon (click points, Esc to finish)"
          onClick={handlePolygon}
          className={activeMode === "polygon" ? "active" : ""}
        >
          <Icon name="pentagon" size={16} />
        </button>
      )}
      {enabledTypes.length > 0 && <span className="separator"></span>}
      <button data-tooltip="Undo" onClick={() => undo()} disabled={!canUndo}>
        <Icon name="undo" size={16} />
      </button>
      <button data-tooltip="Redo" onClick={() => redo()} disabled={!canRedo}>
        <Icon name="redo" size={16} />
      </button>
      {(deleteMode === "erase" || deleteMode === "both") && (
        <>
          <span className="separator"></span>
          <button
            data-tooltip="Erase (click annotations to delete them)"
            onClick={handleErase}
            className={activeMode === "erase" ? "active" : ""}
          >
            <Icon name="eraser" size={16} />
          </button>
        </>
      )}
      {(deleteMode === "select" || deleteMode === "both") && (
        <>
          {deleteMode === "select" && <span className="separator"></span>}
          <button data-tooltip="Delete selected" onClick={handleDelete}>
            <Icon name="trash" size={16} />
          </button>
        </>
      )}
      {(onJsonExport || onSvgExport) && <span className="separator"></span>}
      {onJsonExport && (
        <button data-tooltip="Export annotations" onClick={onJsonExport}>
          <Icon name="download" size={16} />
        </button>
      )}
      {onSvgExport && (
        <button data-tooltip="Export SVG" onClick={onSvgExport}>
          <Icon name="camera" size={16} />
        </button>
      )}
    </div>
  );
};
