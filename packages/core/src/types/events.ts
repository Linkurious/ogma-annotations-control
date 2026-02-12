import { Annotation, Arrow, Id, Link } from "./features";
import {
  EVT_SELECT,
  EVT_UNSELECT,
  EVT_ADD,
  EVT_REMOVE,
  EVT_LINK,
  EVT_UPDATE,
  EVT_CANCEL_DRAWING,
  EVT_HISTORY,
  EVT_COMPLETE_DRAWING,
  EVT_DRAG_START,
  EVT_DRAG_END,
  EVT_CLICK
} from "../constants";

/** Event related to multiple annotation features */
export interface FeaturesEvent {
  /** Annotation IDs involved in the event */
  ids: Id[];
}

/** Event related to a single annotation feature */
export interface FeatureEvent {
  /** Annotation ID involved in the event */
  id: Id;
}

/** Event related to a single annotation feature */
export interface ClickEvent {
  /** Annotation ID involved in the event */
  id?: Id;
  /** Mouse position in pixel coordinates */
  position: { x: number; y: number };
}


/** Event related to a single annotation feature */
export interface DragEvent {
  /** Annotation ID involved in the event */
  id: Id;
  /** Current mouse position in pixel coordinates during the drag */
  position: { x: number; y: number };
}

/** History stack change event */
export interface HistoryEvent {
  /** Indicates if undo operation is available */
  canUndo: boolean;
  /** Indicates if redo operation is available */
  canRedo: boolean;
}

export type FeatureEvents = {
  /**
   * Event trigerred when selecting an annotation
   * @param evt The annotation selected
   */
  [EVT_SELECT]: (evt: FeaturesEvent) => void;
  /**
   * Event trigerred when unselecting an annotation
   * @param evt The annotation unselected
   */
  [EVT_UNSELECT]: (evt: FeaturesEvent) => void;
  /**
   * Event trigerred when removing an annotation
   * @param evt The annotation removed
   */
  [EVT_REMOVE]: (evt: FeatureEvent) => void;
  /**
   * Event trigerred when adding an annotation
   * @param evt The annotation added
   */
  [EVT_ADD]: (evt: FeatureEvent) => void;
  /**
   * Event trigerred when canceling drawing mode
   */
  [EVT_CANCEL_DRAWING]: () => void;
  /**
   * Event trigerred when completing a drawing operation
   * @param evt Contains the ID of the completed annotation
   */
  [EVT_COMPLETE_DRAWING]: (evt: FeatureEvent) => void;
  /**
   * Event trigerred when updating an annotation.
   * This fires after any modification including drag operations, style changes, scaling, etc.
   * @param evt The updated annotation with all changes applied
   */
  [EVT_UPDATE]: (evt: Annotation) => void;
  /**
   * Event trigerred when linking an arrow to a node or annotation
   * @param evt Contains the arrow and link details
   */
  [EVT_LINK]: (evt: { arrow: Arrow; link: Link }) => void;
  /**
   * Event trigerred when history state changes (after undo/redo operations)
   * @param evt Contains boolean flags for undo/redo availability
   */
  [EVT_HISTORY]: (evt: HistoryEvent) => void;
  /**
   * Event triggered when a drag operation starts on an annotation
   */
  [EVT_DRAG_START]: (evt: DragEvent) => void;
  /**
   * Event triggered when a drag operation ends on an annotation
   */
  [EVT_DRAG_END]: (evt: DragEvent) => void;
  /**
   * Event triggered when a click completes on an annotation (mouseup without drag)
   */
  [EVT_CLICK]: (evt: ClickEvent) => void;
};
