import { FC, ReactElement, useEffect } from "react";
import {
  AnnotationCollection,
  Control as AnnotationsEditor,
  isArrow,
  isText,
} from "@linkurious/ogma-annotations";
import "@linkurious/ogma-annotations/style.css";
// import "./Control.css";
import { useOgma } from "@linkurious/ogma-react";
import { AnnotationsContextProvider, useAnnotationsContext } from "./AnnotationsContext";
import { mean } from "./utils";

interface AnnotationsControlProps {
  setAnnotations: (annotations: AnnotationCollection) => void;
  children?: ReactElement;
}

export const AnnotationsControl: FC<AnnotationsControlProps> = (
  { children }: AnnotationsControlProps,
) => {
  const ogma = useOgma();
  const {
    editor,
    setEditor,
    arrowStyle,
    setArrowStyle,
    textStyle,
    setTextStyle,
    currentAnnotation,
    setCurrentAnnotation,
    updateAnnotations,
    arrowWidthFactor,
    setArrowWidthFactor,
    setTextSizeFactor,
  } = useAnnotationsContext();
  useEffect(() => {
    if (ogma) {
      const newEditor = new AnnotationsEditor(ogma, {
        textPlaceholder: "Your text...",
        detectMargin: 2,
        magnetRadius: 5,
        minArrowHeight: 0.0005,
        maxArrowHeight: 15,
      });

      // adjust the default style of the annotations based on the graph
      const newTextSizeFactor =
        mean(ogma.getNodes().getAttribute("radius") as number[]) / 5;
      const newArrowWidthFactor = arrowWidthFactor;

      setArrowStyle({
        ...arrowStyle,
        strokeWidth: (arrowStyle.strokeWidth || 1) * newArrowWidthFactor,
      });
      setArrowWidthFactor(newArrowWidthFactor);
      setTextSizeFactor(newTextSizeFactor);
      setTextStyle({
        ...textStyle,
        fontSize: (+textStyle.fontSize! * newTextSizeFactor).toString(),
      });
      newEditor
        .on("select", (annotation) => {
          // read back the current options from the selected annotation
          if (isArrow(annotation)) {
            setArrowStyle({
              ...arrowStyle,
              ...(annotation.properties.style || {}),
            });
          } else if (isText(annotation)) {
            setTextStyle({
              ...textStyle,
              ...(annotation.properties.style || {}),
            });
          }
          setCurrentAnnotation(annotation);
        })
        .on("unselect", () => {
          // TODO: maybe set back the styles to the default options
          setCurrentAnnotation(null);
        })
        .on("add", (annotation) =>
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
        );
      setEditor(newEditor);
    }
    return () => {
      editor?.destroy();
    };
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
  }, [editor, arrowStyle]);

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
    <AnnotationsContextProvider children={children || <></>} />
  );
};
