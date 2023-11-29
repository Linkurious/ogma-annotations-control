import {
  ReactElement,
} from "react";
import { useOgma } from "@linkurious/ogma-react";
import { createPortal } from "react-dom";

interface LayerProps {
  children?: ReactElement;
}
export const Layer = (
  {
    children,
  }: LayerProps) => {
  const ogma = useOgma();
  const elt = document.createElement('div');
  ogma.layers.addLayer(elt);
  return <>{createPortal(children, elt)}</>;
};