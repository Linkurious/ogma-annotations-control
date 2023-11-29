import {
  useEffect,
  useState,
  ReactElement,
  Ref,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Layer as L } from "@linkurious/ogma";
import { useOgma } from "@linkurious/ogma-react";
import { createRoot } from "react-dom/client";

interface PopupProps {
  children?: ReactElement;
}

const LayerComponent = (
  {
    children,
  }: PopupProps,
  ref?: Ref<L>
) => {
  const ogma = useOgma();
  const elt = document.createElement('div');
  const root = createRoot(elt);
  const [layer, setLayer] = useState<L | null>(null);
  useImperativeHandle(ref, () => layer as L, [layer]);
  useEffect(() => {
    if (!layer) {
      setLayer(ogma.layers.addLayer(elt));
    }
    root.render(children);
  }, [children]);

  return null;
};

export const Layer = forwardRef(LayerComponent);