import React from "react";
import { Layer } from "@linkurious/ogma-react";
import type { Layer as LayerType } from "@linkurious/ogma";
import {
  ArrowStyles,
  TextStyle,
  isArrow,
  isText
} from "@linkurious/ogma-annotations";
import "@linkurious/ogma-annotations/style.css";
import "./Controls.css";

import { AddMenu } from "./AddMenu";
import { ArrowSettings } from "./ArrowSettings";
import { TextSettings } from "./TextSettings";

import {
  useAnnotationsContext,
  defaultArrowStyle,
  defaultTextStyle
} from "../../../src";

const preventDefault = (
  evt: React.MouseEvent<HTMLDivElement, MouseEvent> | WheelEvent
) => {
  if (evt.cancelable) {
    evt.preventDefault();
    evt.stopPropagation();
  }
};

interface ControlProps {
  minThickness: number;
  maxThickness: number;
  defaultArrowStyle?: ArrowStyles;
  defaultTextStyle?: TextStyle;
}

export const Controls = ({
  minThickness,
  maxThickness,
  defaultArrowStyle: defaultArrowStyleProp = {},
  defaultTextStyle: defaultTextStyleProp = {}
}: ControlProps) => {
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

  // update default styles
  React.useEffect(() => {
    Object.assign(defaultArrowStyle, defaultArrowStyleProp);
    Object.assign(defaultTextStyle, defaultTextStyleProp);
  }, [defaultArrowStyleProp, defaultTextStyleProp]);

  return (
    <Layer className="controls" ref={divRefCallback} index={100}>
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
