import {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
  ReactNode,
  Ref,
} from "react";
import { Options as OgmaOptions } from "@linkurious/ogma";
import { AnnotationContext } from "./context";
import { AnnotationCollection, Control, createText } from "@linkurious/ogma-annotations";
import '@linkurious/ogma-annotations/style.css';
import { useOgma } from "@linkurious/ogma-react";

interface AnnotationProps {
  options?: Partial<OgmaOptions>;
  annotations: AnnotationCollection;
  setAnnotations: (annotations: AnnotationCollection) => void;
  children?: ReactElement;
}

const defaultOptions = {};

/**
 * Main component for the Ogma library.
 */
export const AnnotaionsComponent = (
  { annotations, setAnnotations, children }: AnnotationProps,
  ref?: Ref<Control>
) => {
  const ogma = useOgma();
  const [ready, setReady] = useState(false);
  if (!annotations)
    const [control, setControl] = useState<Control | undefined>();
  useImperativeHandle(ref, () => control as Control, [control]);

  useEffect(() => {
    const control = new Control(ogma);
    const x = 0;
    const y = 0;
    const text = createText(x, y, 0, 0);
    control.startText(x, y, text);

    setControl(control);
    setReady(true);
  }, [ogma]);
  return (
    <AnnotationContext.Provider value={ogma}>
      {ready && children}
    </AnnotationContext.Provider>
  );
};

export const Annotations = forwardRef(AnnotaionsComponent);

