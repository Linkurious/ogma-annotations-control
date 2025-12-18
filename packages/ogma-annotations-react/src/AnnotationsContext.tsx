import React, {
  createContext,
  useContext,
  Context,
  useState,
  ReactElement,
  useEffect
} from "react";
import {
  AnnotationCollection,
  AnnotationFeature,
  ArrowStyles,
  ArrowProperties,
  TextStyle,
  Control as AnnotationsEditor,
  Annotation,
  isArrow,
  isText,
  Box,
  Polygon,
  Comment,
  EVT_ADD,
  EVT_REMOVE,
  EVT_UPDATE,
  EVT_HISTORY,
  EVT_SELECT,
  EVT_UNSELECT
} from "@linkurious/ogma-annotations";
import { defaultArrowStyle, defaultTextStyle } from "./constants";
import { useOgma } from "@linkurious/ogma-react";
import { mean } from "./utils";

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
 * Creates a React context for managing annotations with optional type safety.
 *
 * @returns {Context<IAnnotationsContext | null>} A context for annotation-related state and operations that can be null
 */
export function createAnnotationsContext() {
  return createContext<IAnnotationsContext | null>(null);
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

interface Props {
  children: ReactElement;
  annotations?: AnnotationCollection;
}

/**
 * Provides a context provider for managing annotations in a graph visualization.
 *
 * This component handles the state and interactions for creating, selecting,
 * and styling annotations, including arrow and text annotations.
 *
 * @param {Props} props - The component props containing child elements
 * @returns {ReactElement} A context provider with annotation management capabilities
 */
export const AnnotationsContextProvider = ({
  children,
  annotations: initialAnnotations
}: Props) => {
  const ogma = useOgma();
  const [annotations, setAnnotations] = useState<AnnotationCollection>(
    initialAnnotations || {
      type: "FeatureCollection",
      features: []
    }
  );
  const [currentAnnotation, setCurrentAnnotation] =
    useState<AnnotationFeature | null>(null);
  const [arrowStyle, setArrowStyle] = useState<ArrowStyles>(defaultArrowStyle);
  const [textStyle, setTextStyle] = useState<TextStyle>(defaultTextStyle);
  const [editor, setEditor] = useState<AnnotationsEditor>();
  const [arrowWidthFactor, setArrowWidthFactor] = useState(1);
  const [textSizeFactor, setTextSizeFactor] = useState(1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    if (!ogma) return;
    const newEditor = new AnnotationsEditor(ogma, {
      minArrowHeight: 1
    });
    // adjust the default style of the annotations based on the graph
    const newTextSizeFactor =
      mean(ogma.getNodes().getAttribute("radius") as number[]) / 5;
    const newArrowWidthFactor = arrowWidthFactor;
    setArrowStyle({
      ...arrowStyle,
      strokeWidth: (arrowStyle.strokeWidth || 1) * newArrowWidthFactor
    });
    setArrowWidthFactor(newArrowWidthFactor);
    setTextSizeFactor(newTextSizeFactor);

    // Wire up Control events to React state
    newEditor
      .on(EVT_SELECT, () => {
        // read back the current options from the selected annotation
        newEditor.getSelectedAnnotations().features.forEach((annotation) => {
          if (!annotation) return;
          if (isArrow(annotation)) {
            setArrowStyle({
              ...(annotation.properties.style || {})
            });
          } else if (isText(annotation)) {
            setTextStyle({
              ...(annotation.properties.style || {})
            });
          }
          setCurrentAnnotation(annotation);
        });
      })
      .on(EVT_UNSELECT, () => {
        setCurrentAnnotation(null);
      })
      .on(EVT_ADD, () => {
        setAnnotations(newEditor.getAnnotations());
      })
      .on(EVT_REMOVE, () => {
        setAnnotations(newEditor.getAnnotations());
      })
      .on(EVT_UPDATE, () => {
        setAnnotations(newEditor.getAnnotations());
      })
      .on(EVT_HISTORY, () => {
        setCanUndo(newEditor.canUndo());
        setCanRedo(newEditor.canRedo());
      });

    setEditor(newEditor);
    // load the initial annotations into the editor
    if (initialAnnotations) {
      newEditor.add(initialAnnotations);
      newEditor.clearHistory();
    }
    return () => {
      newEditor.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ogma]);

  // update the style of the current arrow annotation when the style changes
  useEffect(() => {
    if (
      editor &&
      currentAnnotation &&
      currentAnnotation?.properties.type === "arrow"
    ) {
      editor.updateStyle(currentAnnotation.id, arrowStyle);
    }
  }, [editor, arrowStyle, currentAnnotation]);

  // update the style of the current text annotation when the style changes
  useEffect(() => {
    if (
      editor &&
      currentAnnotation &&
      currentAnnotation?.properties.type === "text"
    ) {
      editor.updateStyle(currentAnnotation.id, textStyle);
    }
  }, [editor, textStyle, currentAnnotation]);

  return (
    <AnnotationsContext.Provider
      value={
        {
          annotations,

          currentAnnotation,
          setCurrentAnnotation,

          textStyle,
          setTextStyle,
          arrowStyle,
          setArrowStyle,
          arrowWidthFactor,
          setArrowWidthFactor,
          textSizeFactor,
          setTextSizeFactor,

          editor,
          setEditor,

          // History management
          canUndo,
          canRedo,
          undo: () => editor?.undo() || false,
          redo: () => editor?.redo() || false,
          clearHistory: () => editor?.clearHistory(),

          // Annotation management
          add: (annotation: Annotation | AnnotationCollection) =>
            editor?.add(annotation),
          remove: (annotation: Annotation | AnnotationCollection) =>
            editor?.remove(annotation),
          cancelDrawing: () => editor?.cancelDrawing(),
          select: (ids: string | string[]) => editor?.select(ids),

          // Drawing methods
          enableBoxDrawing: (style?: Partial<Box["properties"]["style"]>) =>
            editor?.enableBoxDrawing(style),
          enablePolygonDrawing: (
            style?: Partial<Polygon["properties"]["style"]>
          ) => editor?.enablePolygonDrawing(style),
          enableCommentDrawing: (options?: {
            offsetX?: number;
            offsetY?: number;
            commentStyle?: Partial<Comment["properties"]>;
            arrowStyle?: Partial<ArrowProperties>;
          }) => editor?.enableCommentDrawing(options)
        } as IAnnotationsContext
      }
    >
      {children}
    </AnnotationsContext.Provider>
  );
};
