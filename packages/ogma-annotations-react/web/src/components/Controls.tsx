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
  if (evt.cancelable) evt.stopPropagation();
};

const useKeyboardShortcuts = () => {
  const { cancelDrawing, remove, editor } = useAnnotationsContext();

  React.useEffect(() => {
    const handleKeyDown = (evt: KeyboardEvent) => {
      if (evt.key === "Escape") {
        cancelDrawing();
      } else if (evt.key === "Backspace" || evt.key === "Delete") {
        const selected = editor?.getSelectedAnnotations();
        if (selected && selected.features.length > 0) {
          remove(selected);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [cancelDrawing, remove, editor]);
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

  // Set up keyboard shortcuts
  useKeyboardShortcuts();

  const stopEvent: React.MouseEventHandler<HTMLDivElement> = React.useCallback(
    preventDefault,
    []
  );

  const divRefCallback = React.useCallback((node: LayerType) => {
    if (node && node.element)
      node.element.addEventListener("wheel", preventDefault, {
        passive: false
      });
    return () => {
      node.element.removeEventListener("wheel", preventDefault);
    };
  }, []);

  // update default styles
  React.useEffect(() => {
    Object.assign(defaultArrowStyle, defaultArrowStyleProp);
    Object.assign(defaultTextStyle, defaultTextStyleProp);
  }, [defaultArrowStyleProp, defaultTextStyleProp]);

  return (
    <>
      {/* Bottom toolbar */}
      <Layer className="controls" ref={divRefCallback} index={100}>
        <div className="container">
          <AddMenu />
        </div>
      </Layer>

      {/* Right side panel for settings */}
      {currentAnnotation && (
        <Layer className="side-panel" index={100}>
          <div
            className="side-panel-container"
            onMouseDown={stopEvent}
            onClick={stopEvent}
          >
            {isArrow(currentAnnotation) && (
              <ArrowSettings
                minThickness={minThickness}
                maxThickness={maxThickness}
              />
            )}
            {isText(currentAnnotation) && <TextSettings />}
          </div>
        </Layer>
      )}
    </>
  );
};
