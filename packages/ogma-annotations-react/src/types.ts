import type {
  Annotation,
  AnnotationFeature,
  AnnotationCollection,
  ArrowProperties,
  ArrowStyles,
  TextStyle,
  Box,
  Comment,
  Polygon,
  Control as AnnotationsEditor
} from "@linkurious/ogma-annotations";
import { useContext, createContext, type Context } from "react";

/**
 * Defines the context interface for managing annotations in a React application.
 *
 * @interface
 * @description Provides state and methods for handling annotation collections,
 * current annotation selection, styling, and editor control.
 */
export interface IAnnotationsContext {
  /** Current annotations in the application. */
  annotations: AnnotationCollection;
  /** The currently selected annotation in the application. */
  currentAnnotation: AnnotationFeature | null;
  /** Sets the currently selected annotation in the application. */
  setCurrentAnnotation: (annotation: AnnotationFeature | null) => void;
  /** The current arrow style for annotations. */
  arrowStyle: ArrowStyles;
  /** The current width factor for arrow annotations. */
  arrowWidthFactor: number;
  /** Sets the width factor for arrow annotations. */
  setArrowWidthFactor: (arrowWidthFactor: number) => void;
  /** Sets the current arrow style for annotations. */
  setArrowStyle: (arrowStyle: ArrowStyles) => void;
  /** The current text style for annotations. */
  textStyle: TextStyle;
  /** The current size factor for text annotations in regards to node sizes. */
  textSizeFactor: number;
  /** Sets the size factor for text annotations. */
  setTextSizeFactor: (textSizeFactor: number) => void;
  /** Sets the current text style for annotations. */
  setTextStyle: (textStyle: TextStyle) => void;

  /** The annotations editor for managing annotations. See {@link AnnotationsEditor} */
  editor: AnnotationsEditor;
  /** Sets the current annotations editor for managing annotations. */
  setEditor: (editor: AnnotationsEditor) => void;

  // History management
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
  /** Undo the last action */
  undo: () => boolean;
  /** Redo the last undone action */
  redo: () => boolean;
  /** Clear the history */
  clearHistory: () => void;

  // Annotation management
  /** Add annotations */
  add: (annotation: Annotation | AnnotationCollection) => void;
  /** Remove annotations */
  remove: (annotation: Annotation | AnnotationCollection) => void;
  /** Cancel the current drawing operation */
  cancelDrawing: () => void;
  /** Select annotations by ID */
  select: (ids: string | string[]) => void;

  // Drawing methods
  /** Enable box drawing mode */
  enableBoxDrawing: (style?: Partial<Box["properties"]["style"]>) => void;
  /** Enable polygon drawing mode */
  enablePolygonDrawing: (
    style?: Partial<Polygon["properties"]["style"]>
  ) => void;
  /** Enable comment drawing mode */
  enableCommentDrawing: (options?: {
    offsetX?: number;
    offsetY?: number;
    commentStyle?: Partial<Comment["properties"]>;
    arrowStyle?: Partial<ArrowProperties>;
  }) => void;
}

/**
 * Creates a React context for managing annotations with type safety.
 *
 * @type {Context<IAnnotationsContext>} A typed context for annotation-related
 * state and operations
 */
export const AnnotationsContext = createContext(
  undefined
) as unknown as Context<IAnnotationsContext>;

/**
 * Retrieves the current annotations context for accessing and managing annotations.
 *
 * @returns {IAnnotationsContext} The current annotations context with methods and
 * state for annotation management
 */
export const useAnnotationsContext = () =>
  useContext<IAnnotationsContext>(AnnotationsContext);

/**
 * Creates a React context for managing annotations with optional type safety.
 *
 * @returns {Context<IAnnotationsContext | null>} A context for annotation-related state and operations that can be null
 */
export function createAnnotationsContext() {
  return createContext<IAnnotationsContext | null>(null);
}
