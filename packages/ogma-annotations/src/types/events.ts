import { Annotation, Arrow, Id, Link, Side } from "./features";
import {
  EVT_HOVER,
  EVT_UNHOVER,
  EVT_SELECT,
  EVT_UNSELECT,
  EVT_DRAG_START,
  EVT_DRAG,
  EVT_DRAG_END,
  EVT_ADD,
  EVT_REMOVE,
  EVT_LINK,
  EVT_UPDATE,
  EVT_CANCEL_DRAWING,
  EVT_HISTORY
} from "../constants";

export type Events<T> = {
  [EVT_HOVER]: (evt: T) => void;
  [EVT_UNHOVER]: (evt: T) => void;
  [EVT_SELECT]: (evt: T) => void;
  [EVT_UNSELECT]: (evt: T) => void;
  [EVT_DRAG_START]: (evt: T) => void;
  [EVT_DRAG]: (evt: T, key: "line" | Side | "text") => void;
  [EVT_DRAG_END]: (evt: T) => void;
  [EVT_REMOVE]: (evt: T) => void;
  [EVT_ADD]: (evt: T) => void;
  [EVT_UPDATE]: (evt: T) => void;
};

export type FeatureEvents = {
  /**
   * Event trigerred when selecting an annotation
   * @param evt The annotation selected
   */
  [EVT_SELECT]: (evt: { ids: Id[] }) => void;
  /**
   * Event trigerred when unselecting an annotation
   * @param evt The annotation unselected
   */
  [EVT_UNSELECT]: (evt: { ids: Id[] }) => void;
  /**
   * Event trigerred when removing an annotation
   * @param evt The annotation removed
   */
  [EVT_REMOVE]: (evt: { id: Id }) => void;
  /**
   * Event trigerred when adding an annotation
   * @param evt The annotation added
   */
  [EVT_ADD]: (evt: { id: Id }) => void;
  [EVT_CANCEL_DRAWING]: () => void;
  /**
   * Event trigerred when updating an annotation
   * @returns The annotation updated
   */
  [EVT_UPDATE]: (evt: Annotation) => void;
  /**
   * Event trigerred when linking an arrow to a text or node
   */
  [EVT_LINK]: (evt: { arrow: Arrow; link: Link }) => void;
  /**
   * Event trigerred when starting to drag an arrow or a text
   */
  [EVT_DRAG_START]: (evt: Annotation) => void;
  /**
   * Event trigerred when dragging an arrow or a text
   */
  [EVT_DRAG]: (evt: Annotation, key: "line" | Side | "text") => void;
  /**
   * Event trigerred when stopped dragging an arrow or a text
   */
  [EVT_DRAG_END]: (evt: Annotation) => void;

  /** History state change */
  [EVT_HISTORY]: (evt: { canUndo: boolean; canRedo: boolean }) => void;
};
