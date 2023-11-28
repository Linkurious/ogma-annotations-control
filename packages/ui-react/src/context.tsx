import { createContext, useContext, Context } from "react";
import { Control } from "@linkurious/ogma-annotations";

export function createAnnotationContext() {
  return createContext<{ control?: Control; } | null>(null);
}

export const AnnotationContext = createContext(undefined) as Context<
  Control | undefined
>;

/**
 * This is the hook that allows you to access the Control instance.
 * It should only be used in the context of the `Annotation` component.
 */
export const useAnnotation = (): Control => {
  const control = useContext(AnnotationContext);
  if (!control) throw new Error("useAnnotation must be used within an AnnotationProvider");
  return control;
};