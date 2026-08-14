import type { Ogma } from "@linkurious/ogma";
import { MouseButtonEvent } from "@linkurious/ogma";
import { cursors, EVT_ADD, EVT_CLICK } from "../constants";
import type { Control } from "../Control";
import { AnnotationEditor } from "../handlers";
import { ArrowHandler } from "../handlers/arrow";
import { CommentDrawingHandler } from "../handlers/commentDrawing";
import { Links } from "../handlers/links";
import { PolygonHandler } from "../handlers/polygon";
import { TextHandler } from "../handlers/text";
import { InteractionController } from "../interaction/index";
import { Index } from "../interaction/spatialIndex";
import { Store } from "../store";
import {
  Arrow,
  ArrowProperties,
  Box,
  Comment,
  CommentProps,
  Id,
  Polygon,
  Text,
  createArrow,
  createBox,
  createComment,
  createPolygon,
  createText
} from "../types";
import { findPlace } from "../utils/place-finder";

/** Default width/height (square) a sticky note is dropped at - resizable
 * afterward via the usual text drag handles. */
const STICKY_NOTE_SIZE = 160;

/** Miro-style yellow note look: padded, borderless, lightly rounded. Not
 * `fixedSize`, so it keeps its corner/edge resize handles once selected. */
const defaultStickyNoteStyle: Partial<Text["properties"]["style"]> = {
  font: "IBM Plex Sans",
  fontSize: 18,
  color: "#4A3B00",
  background: "#FFEB99",
  strokeWidth: 0,
  strokeType: "plain",
  borderRadius: 4,
  padding: 16,
  fixedSize: false,
  // Ghost text via the textarea's native placeholder - shown while content
  // is empty, gone the instant the user types. No selection/focus tricks
  // needed, unlike pre-filling real content the user has to overwrite.
  placeholder: "Quick note…"
};

/**
 * Handles drawing interactions for annotations.
 * Contains both high-level enable*Drawing methods and low-level start* methods.
 */
export class Drawing {
  private ogma: Ogma;
  private store: Store;
  private editor: AnnotationEditor;
  private interactions: InteractionController;
  private links: Links;
  private control: Control;
  private index: Index;

  // Track pending drawing listener to clean up on cancel
  private pendingDrawingListener:
    | (<T extends MouseButtonEvent<unknown, unknown>>(evt: T) => void)
    | null = null;

  // Track placement mode listeners for cleanup
  private placementCleanup: (() => void) | null = null;

  // Whether erase mode (click an annotation to delete it) is armed
  private eraseModeActive = false;

  constructor(
    ogma: Ogma,
    store: Store,
    editor: AnnotationEditor,
    interactions: InteractionController,
    links: Links,
    control: Control,
    index: Index
  ) {
    this.ogma = ogma;
    this.store = store;
    this.editor = editor;
    this.interactions = interactions;
    this.links = links;
    this.control = control;
    this.index = index;
  }

  /**
   * Cancel the current drawing operation
   * @internal
   */
  public cancelPendingDrawing(): void {
    // Remove any pending drawing listener
    if (this.pendingDrawingListener) {
      this.ogma.events.off(this.pendingDrawingListener);
      this.pendingDrawingListener = null;
    }
    // Clean up placement mode
    if (this.placementCleanup) {
      this.placementCleanup();
      this.placementCleanup = null;
    }
    // Exit erase mode, if active
    this.disableEraseMode();
  }

  public isDrawing(): boolean {
    return this.store.getState().drawingFeature !== null;
  }

  public isEraseModeActive(): boolean {
    return this.eraseModeActive;
  }

  // Bound once so on/off reference the same function
  private onEraseClick = (evt: { id?: Id }) => {
    if (evt.id === undefined || evt.id === null) return;
    const feature = this.store.getState().features[evt.id];
    if (feature) this.control.remove(feature);
  };

  /**
   * Enable erase mode: every subsequent click on an annotation deletes it
   * immediately. Stays armed across multiple clicks until `disableEraseMode()`
   * is called, or another tool/drawing mode is enabled (which cancels it via
   * `cancelPendingDrawing()`).
   */
  public enableEraseMode(): Control {
    if (this.eraseModeActive) return this.control;
    this.control.unselect().cancelDrawing();
    this.eraseModeActive = true;
    this.control.on(EVT_CLICK, this.onEraseClick);
    this.interactions.setCursor(cursors.crosshair);
    return this.control;
  }

  public disableEraseMode(): Control {
    if (!this.eraseModeActive) return this.control;
    this.eraseModeActive = false;
    this.control.off(EVT_CLICK, this.onEraseClick);
    this.interactions.setCursor(cursors.default);
    return this.control;
  }

  /**
   * Helper method to enable drawing mode with proper cleanup
   * @private
   */
  private enableDrawingMode(
    drawCallback: (x: number, y: number) => void
  ): Control {
    this.control.unselect().cancelDrawing();

    const handler = (evt: MouseButtonEvent<unknown, unknown>) => {
      // Remove the listener and clear reference
      this.ogma.events.off(handler);
      this.pendingDrawingListener = null;

      const { x, y } = this.ogma.view.screenToGraphCoordinates(evt);
      drawCallback(x, y);
    };

    this.pendingDrawingListener = handler;
    this.ogma.events.once("mousedown", handler);
    return this.control;
  }

  public enableArrowDrawing(
    style?: Partial<Arrow["properties"]["style"]>
  ): Control {
    return this.enableDrawingMode((x, y) => {
      const arrow = createArrow(x, y, x, y, style);
      this.startArrow(x, y, arrow);
    });
  }

  public enableTextDrawing(
    style?: Partial<Text["properties"]["style"]>
  ): Control {
    return this.enableDrawingMode((x, y) => {
      const text = createText(x, y, 0, 0, undefined, style);
      this.startText(x, y, text);
    });
  }

  /**
   * @param style Box style options
   * @returns Control instance for chaining
   * @see startBox for low-level programmatic control
   */
  public enableBoxDrawing(
    style?: Partial<Box["properties"]["style"]>
  ): Control {
    return this.enableDrawingMode((x, y) => {
      const box = createBox(x, y, 0, 0, style);
      this.startBox(x, y, box);
    });
  }

  /**
   * @param style Polygon style options
   * @returns Control instance for chaining
   * @see startPolygon for low-level programmatic control
   */
  public enablePolygonDrawing(
    style?: Partial<Polygon["properties"]["style"]>
  ): Control {
    return this.enableDrawingMode((x, y) => {
      const polygon = createPolygon([[[x, y]]], { style });
      this.startPolygon(x, y, polygon);
    });
  }

  /**
   * @param options Drawing options including offsets and styles
   * @param options.offsetX Manual X offset for comment placement (overrides smart positioning)
   * @param options.offsetY Manual Y offset for comment placement (overrides smart positioning)
   * @param options.commentStyle Style options for the comment box
   * @param options.arrowStyle Style options for the arrow
   * @returns Control instance for chaining
   * @see startComment for low-level programmatic control
   */
  public enableCommentDrawing(
    options: {
      offsetX?: number;
      offsetY?: number;
      commentStyle?: Partial<CommentProps>;
      arrowStyle?: Partial<ArrowProperties>;
    } = {}
  ): Control {
    return this.enableDrawingMode((x, y) => {
      let offsetX = options.offsetX;
      let offsetY = options.offsetY;

      if (offsetX === undefined && offsetY === undefined) {
        const bestPoint = findPlace(x, y, this.index, this.ogma);
        offsetX = bestPoint.x;
        offsetY = bestPoint.y;
      }
      const comment = createComment(x, y, "", options?.commentStyle);
      this.startComment(x, y, comment, {
        ...options,
        offsetX,
        offsetY
      });
    });
  }

  /**
   * @param style Sticky note style options (merged over the sticky note defaults)
   * @returns Control instance for chaining
   * @see startStickyNote for low-level programmatic control
   */
  public enableStickyNoteDrawing(
    style?: Partial<Text["properties"]["style"]>
  ): Control {
    return this.enableDrawingMode((x, y) => {
      this.startStickyNote(x, y, style);
    });
  }

  /**
   * Place a plain sticky note - a resizable text box with no connector arrow,
   * like a Miro sticky note - at the given position and select it. It's a
   * regular `text` annotation (not `fixedSize`), so it gets the usual
   * corner/edge drag handles once selected: see `TextHandler.detectHandle`
   * and `renderBoxHandles`.
   */
  public startStickyNote(
    x: number,
    y: number,
    style?: Partial<Text["properties"]["style"]>
  ): Control {
    if (this.editor.getActiveHandler())
      this.editor.getActiveHandler()!.stopEditing();
    this.control.cancelDrawing();

    // Box/arrow/text/polygon suppress Ogma's own pan-on-drag through their
    // interactive Handler.startDrawing() (see Handler.disablePanning in
    // handlers/base.ts). Sticky notes place in one click with no handler
    // drag phase, so without this the same mousedown that places the note
    // would also start panning the viewport as the user's held-down mouse
    // moves. Restore on the very next mouseup - there's nothing further to
    // track.
    this.ogma.setOptions({
      interactions: { pan: { enabled: false }, drag: { enabled: false } }
    });
    this.ogma.events.once("mouseup", () => {
      this.ogma.setOptions({
        interactions: { pan: { enabled: true }, drag: { enabled: true } }
      });
    });

    // Empty content: shows the `placeholder` ghost text (see
    // defaultStickyNoteStyle) via the textarea's native placeholder
    // attribute until the user types, instead of pre-filled content they'd
    // have to select and overwrite.
    const note = createText(
      x - STICKY_NOTE_SIZE / 2,
      y - STICKY_NOTE_SIZE / 2,
      STICKY_NOTE_SIZE,
      STICKY_NOTE_SIZE,
      "",
      {
        ...defaultStickyNoteStyle,
        ...style
      }
    );

    // Mark this feature as being drawn, then immediately complete the
    // drawing - sticky notes are dropped at a fixed default size in one
    // click (resize afterward via the drag handles), no interactive
    // draw-out step is needed. Setting drawingFeature back to null makes
    // Control auto-emit EVT_COMPLETE_DRAWING for this id.
    this.store.setState({ drawingFeature: note.id });
    this.control.add(note);
    this.interactions.suppressClicksTemporarily(200);
    this.control.select(note.id);
    this.store.setState({ drawingFeature: null });

    // Drop straight into editing - otherwise the user has to click the note
    // again just to start typing.
    (this.editor.getActiveHandler() as TextHandler)?.startEditingText();
    return this.control;
  }

  /**
   * Place a pre-created annotation by moving it with the cursor.
   * The annotation follows the mouse until the user clicks to place it.
   * Press Escape to cancel.
   */
  public enablePlacement(annotation: Text | Box): Control {
    this.control.unselect().cancelDrawing();

    // Add the annotation and mark as being drawn
    this.store.setState({ drawingFeature: annotation.id });
    this.control.add(annotation);

    const container = this.ogma.getContainer();
    if (!container) return this.control;

    const onMouseMove = (evt: MouseEvent) => {
      const { x, y } = this.ogma.view.screenToGraphCoordinates(evt);
      const w = annotation.properties.width;
      const h = annotation.properties.height;
      this.store.getState().applyLiveUpdate(annotation.id, {
        geometry: {
          ...annotation.geometry,
          coordinates: [x, y],
          bbox: [x - w / 2, y - h / 2, x + w / 2, y + h / 2]
        }
      } as Partial<Text>);
    };

    const onMouseDown = (evt: MouseButtonEvent<unknown, unknown>) => {
      cleanup();
      const { x, y } = this.ogma.view.screenToGraphCoordinates(evt);
      const w = annotation.properties.width;
      const h = annotation.properties.height;
      // Commit final position
      this.store.getState().updateFeature(annotation.id, {
        geometry: {
          ...annotation.geometry,
          coordinates: [x, y],
          bbox: [x - w / 2, y - h / 2, x + w / 2, y + h / 2]
        }
      } as Partial<Text>);
      this.store.setState({ drawingFeature: null });
      this.interactions.suppressClicksTemporarily(200);
      this.control.select(annotation.id);
    };

    const onKeyDown = (evt: KeyboardEvent) => {
      if (evt.key === "Escape") {
        cleanup();
        this.control.remove(annotation);
        this.store.setState({ drawingFeature: null });
      }
    };

    const cleanup = () => {
      container.removeEventListener("mousemove", onMouseMove);
      this.ogma.events.off(onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
      this.placementCleanup = null;
    };

    container.addEventListener("mousemove", onMouseMove, { passive: true });
    this.ogma.events.once("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    this.placementCleanup = cleanup;

    return this.control;
  }

  public startComment(
    x: number,
    y: number,
    comment: Comment,
    options?: {
      offsetX?: number;
      offsetY?: number;
      commentStyle?: Partial<CommentProps>;
      arrowStyle?: Partial<ArrowProperties>;
    }
  ): Control {
    // stop editing any current feature
    if (this.editor.getActiveHandler())
      this.editor.getActiveHandler()!.stopEditing();
    this.control.cancelDrawing();

    // Mark this feature as being drawn
    this.store.setState({ drawingFeature: comment.id });

    this.interactions.suppressClicksTemporarily(200);
    // Create and use the comment drawing handler
    const drawingHandler = new CommentDrawingHandler(
      this.ogma,
      this.store,
      this.links,
      this.editor.getSnapping(),
      this.editor.getArrowHandler(),
      comment,
      options
    );
    const onCommentCreated = (evt: { id: Id }) => {
      if (evt.id === comment.id) {
        this.control.select(evt.id);
        this.control.off(EVT_ADD, onCommentCreated);
        (this.editor.getActiveHandler() as TextHandler)?.startEditingText();
      }
    };
    this.control.on(EVT_ADD, onCommentCreated);
    drawingHandler.startDrawing(comment.id, x, y);
    return this.control;
  }

  public startBox(x: number, y: number, box?: Box): Control {
    if (!box) box = createBox(x, y);
    // Mark this feature as being drawn
    this.store.setState({ drawingFeature: box.id });

    // Add the box annotation
    this.control.add(box);
    this.interactions.suppressClicksTemporarily(200);
    this.control.select(box.id);

    // Get the text handler (box uses the same handler as text)
    const handler = this.editor.getActiveHandler()!;
    (handler as TextHandler).startDrawing(box.id, x, y);
    return this.control;
  }

  public startArrow(x: number, y: number, arrow?: Arrow): Control {
    if (!arrow) arrow = createArrow(x, y);
    // stop editing any current feature
    if (this.editor.getActiveHandler())
      this.editor.getActiveHandler()!.stopEditing();
    this.control.cancelDrawing();

    // Mark this feature as being drawn
    this.store.setState({ drawingFeature: arrow.id });

    // Add the arrow annotation
    this.control.add(arrow);
    this.interactions.suppressClicksTemporarily(200);
    this.control.select(arrow.id);

    // Get the arrow handler
    const handler = this.editor.getActiveHandler()!;
    (handler as ArrowHandler).startDrawing(arrow.id, x, y);
    return this.control;
  }

  public startText(x: number, y: number, text?: Text): Control {
    if (!text) text = createText(x, y);
    // Mark this feature as being drawn
    this.store.setState({ drawingFeature: text.id });

    // Add the text annotation
    this.control.add(text);
    this.interactions.suppressClicksTemporarily(200);
    this.control.select(text.id);

    // Get the text handler
    const handler = this.editor.getActiveHandler()!;
    (handler as TextHandler).startDrawing(text.id, x, y);
    return this.control;
  }

  public startPolygon(x: number, y: number, polygon: Polygon): Control {
    // Mark this feature as being drawn
    this.store.setState({ drawingFeature: polygon.id });

    // Add the polygon annotation
    this.control.add(polygon);
    this.interactions.suppressClicksTemporarily(200);
    this.control.select(polygon.id);

    // Get the polygon handler
    const handler = this.editor.getActiveHandler()!;
    (handler as PolygonHandler).startDrawing(polygon.id, x, y);
    return this.control;
  }
}
