import {
  ReactElement, useEffect,
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
  const layer = ogma.layers.addLayer(elt);
  window.ogma = ogma;
  useEffect(() => {
    return () => {
      console.log('destroying layer');
      layer.destroy();
    };
  }, [children]);
  return <>{createPortal(children, elt)}</>;
};