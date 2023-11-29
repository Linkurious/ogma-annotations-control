import {
  createContext,
  useContext,
  Context,
  useState,
  ReactElement,
  useReducer,
  useEffect,
} from "react";
import {
  AnnotationCollection,
  AnnotationFeature,
  ArrowStyles,
  TextStyle,
  Control as AnnotationsEditor,
  Annotation,
  isArrow,
  isText,
} from "@linkurious/ogma-annotations";
import {
  defaultArrowStyle,
  defaultTextStyle,
} from "./constants";
import { useOgma } from "@linkurious/ogma-react";
import { mean } from "./utils";

interface IAnnotationsContext {
  annotations: AnnotationCollection;
  updateAnnotations: React.Dispatch<AnnotationAction>;
  currentAnnotation: AnnotationFeature | null;
  setCurrentAnnotation: (annotation: AnnotationFeature | null) => void;
  arrowStyle: ArrowStyles;
  arrowWidthFactor: number;
  setArrowWidthFactor: (arrowWidthFactor: number) => void;
  setArrowStyle: (arrowStyle: ArrowStyles) => void;
  textStyle: TextStyle;
  textSizeFactor: number;
  setTextSizeFactor: (textSizeFactor: number) => void;
  setTextStyle: (textStyle: TextStyle) => void;

  editor: AnnotationsEditor;
  setEditor: (editor: AnnotationsEditor) => void;
}

export function createAnnotationsContext() {
  return createContext<IAnnotationsContext | null>(null);
}

export const AnnotationsContext = createContext(
  undefined
) as unknown as Context<IAnnotationsContext>;

export const useAnnotationsContext = () =>
  useContext<IAnnotationsContext>(AnnotationsContext);

interface Props {
  children: ReactElement;
}

type AnnotationActionType = "add" | "remove" | "update";
type AnnotationAction = {
  type: AnnotationActionType;
  payload: Annotation;
};

const annotationsReducer = (
  state: AnnotationCollection,
  action: AnnotationAction
) => {
  switch (action.type) {
    case "add":
      return {
        ...state,
        features: [...state.features, action.payload],
      };
    case "remove":
      return {
        ...state,
        features: state.features.filter((a) => a.id !== action.payload.id),
      };
    case "update":
      return {
        ...state,
        features: state.features.map((a) =>
          a.id === action.payload.id ? action.payload : a
        ),
      };
    default:
      return state;
  }
};

export const AnnotationsContextProvider = ({ children }: Props) => {
  const ogma = useOgma();
  const [annotations, updateAnnotations] = useReducer(annotationsReducer, {
    type: "FeatureCollection",
    features: [],
  });
  const [currentAnnotation, setCurrentAnnotation] =
    useState<AnnotationFeature | null>(null);
  const [arrowStyle, setArrowStyle] = useState<ArrowStyles>(defaultArrowStyle);
  const [textStyle, setTextStyle] = useState<TextStyle>(defaultTextStyle);
  const [editor, setEditor] = useState<AnnotationsEditor>();
  const [arrowWidthFactor, setArrowWidthFactor] = useState(1);
  const [textSizeFactor, setTextSizeFactor] = useState(1);

  useEffect(() => {
    if (!ogma) return;
    const newEditor = new AnnotationsEditor(ogma);

    // adjust the default style of the annotations based on the graph
    const newTextSizeFactor =
      mean(ogma.getNodes().getAttribute("radius") as number[]) / 5;
    const newArrowWidthFactor = arrowWidthFactor;

    // setArrowStyle({
    //   ...arrowStyle,
    //   strokeWidth: (arrowStyle.strokeWidth || 1) * newArrowWidthFactor,
    // });
    setArrowWidthFactor(newArrowWidthFactor);
    setTextSizeFactor(newTextSizeFactor);
    // setTextStyle({
    //   ...textStyle,
    //   fontSize: (+textStyle.fontSize! * newTextSizeFactor).toString(),
    // });
    newEditor
      .on("select", (annotation) => {
        // read back the current options from the selected annotation
        // if (isArrow(annotation)) {
        //   setArrowStyle({
        //     // ...arrowStyle,
        //     ...(annotation.properties.style || {}),
        //   });
        // } else if (isText(annotation)) {
        //   setTextStyle({
        //     // ...textStyle,
        //     ...(annotation.properties.style || {}),
        //   });
        // }
        setCurrentAnnotation(annotation);
      })
      .on("unselect", () => {
        console.log('unselect');
        // TODO: maybe set back the styles to the default options
        setCurrentAnnotation(null);
      });
    /*.on("add", (annotation) =>
      updateAnnotations({
        type: "add",
        payload: annotation,
      })
    )
    .on("update", (annotation) => {
      updateAnnotations({
        type: "update",
        payload: annotation,
      });
    })
    .on("remove", (annotation) =>
      updateAnnotations({
        type: "remove",
        payload: annotation,
      })
    );*/
    setEditor(newEditor);
    return () => {
      editor?.destroy();
    };
  }, [ogma]);

  // update the style of the current arrow annotation when the style changes
  // useEffect(() => {
  //   if (
  //     editor &&
  //     currentAnnotation &&
  //     currentAnnotation?.properties.type === "arrow"
  //   ) {
  //     editor.updateStyle(currentAnnotation.id, arrowStyle);
  //   }
  // }, [editor, arrowStyle]);

  // update the style of the current text annotation when the style changes
  useEffect(() => {
    if (
      editor &&
      currentAnnotation &&
      currentAnnotation?.properties.type === "text"
    ) {
      editor.updateStyle(currentAnnotation.id, textStyle);
    }
  }, [editor, textStyle]);

  return (
    <AnnotationsContext.Provider
      value={
        {
          annotations,
          updateAnnotations,

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
        } as IAnnotationsContext
      }
    >
      {children}
    </AnnotationsContext.Provider>
  );
};