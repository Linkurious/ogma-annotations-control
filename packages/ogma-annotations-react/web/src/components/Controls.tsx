import React from "react";
import { Layer } from "@linkurious/ogma-react";
import type { Layer as LayerType } from "@linkurious/ogma";
import { isArrow, isText } from "@linkurious/ogma-annotations";
import "@linkurious/ogma-annotations/style.css";
import "./Controls.css";
import { useAnnotationsContext } from "../../../src/AnnotationsContext";
import { AddMenu } from "./AddMenu";
import { ArrowSettings } from "./ArrowSettings";
import { TextSettings } from "./TextSettings";

const preventDefault = (
  evt: React.MouseEvent<HTMLDivElement, MouseEvent> | WheelEvent
) => {
  if (evt.cancelable) {
    evt.preventDefault();
    evt.stopPropagation();
  }
};

export const Controls = ({
  minThickness,
  maxThickness
}: {
  minThickness: number;
  maxThickness: number;
}) => {
  const { currentAnnotation } = useAnnotationsContext();

  const stopEvent: React.MouseEventHandler<HTMLDivElement> = React.useCallback(
    preventDefault,
    []
  );

  const divRefCallback = React.useCallback(
    (node: LayerType) => {
      if (node && node.element)
        node.element.addEventListener("wheel", preventDefault, {
          passive: false
        });
      return () => {
        node.element.removeEventListener("wheel", preventDefault);
      };
    },
    [stopEvent]
  );

  return (
    <Layer className="controls" ref={divRefCallback}>
      <div className="container">
        {!currentAnnotation && <AddMenu />}
        <div className="settings" onMouseDown={stopEvent} onClick={stopEvent}>
          {currentAnnotation && isArrow(currentAnnotation) && (
            <ArrowSettings
              minThickness={minThickness}
              maxThickness={maxThickness}
            />
          )}
          {currentAnnotation && isText(currentAnnotation) && <TextSettings />}
        </div>
      </div>
    </Layer>
  );
};
