import type { Layer as LayerType } from "@linkurious/ogma";
import {
  ArrowStyles,
  TextStyle,
  isArrow,
  isText
} from "@linkurious/ogma-annotations";
// eslint-disable-next-line import/no-unresolved
import "@linkurious/ogma-annotations/style.css";
import { Layer, useOgma } from "@linkurious/ogma-react";
import React from "react";
import "./Controls.css";

import { AddMenu } from "./AddMenu";
import { ArrowSettings } from "./ArrowSettings";
import { SvgExportPopup } from "./SvgExportPopup";
import { TextSettings } from "./TextSettings";
import { ViewControls } from "./ViewControls";

import {
  useAnnotationsContext,
  defaultArrowStyle,
  defaultTextStyle,
  getAnnotationsBounds
} from "../../../src";

const preventDefault = (
  evt: React.MouseEvent<HTMLDivElement, MouseEvent> | WheelEvent
) => {
  if (evt.cancelable) evt.stopPropagation();
};

const useKeyboardShortcuts = (onCenterView: () => void) => {
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
      } else if (evt.key === "0") {
        onCenterView();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [cancelDrawing, remove, editor, onCenterView]);
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
  const { currentAnnotation, annotations } = useAnnotationsContext();
  const ogma = useOgma();

  // SVG Export popup state
  const [isPopupOpen, setIsPopupOpen] = React.useState(false);
  const [svgContent, setSvgContent] = React.useState("");

  const handleSvgExport = React.useCallback(async () => {
    try {
      const svg = await ogma.export.svg({ clip: true, download: false });
      setSvgContent(svg);
      setIsPopupOpen(true);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to export SVG:", error);
    }
  }, [ogma]);

  const handleClosePopup = React.useCallback(() => {
    setIsPopupOpen(false);
    setSvgContent("");
  }, []);

  const handleDownloadSvg = React.useCallback(() => {
    if (svgContent) {
      const blob = new Blob([svgContent], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      document.body.appendChild(a);
      a.setAttribute("href", url);
      a.setAttribute("download", "graph-with-annotations.svg");
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }
  }, [svgContent]);

  // Center view callback
  const handleCenterView = React.useCallback(async () => {
    const bounds = ogma.view.getGraphBoundingBox();
    await ogma.view.moveToBounds(
      bounds.extend(getAnnotationsBounds(annotations)),
      { duration: 200 }
    );
  }, [ogma, annotations]);

  // Set up keyboard shortcuts
  useKeyboardShortcuts(handleCenterView);

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
        <div className="container" onMouseMove={stopEvent} onClick={stopEvent}>
          <AddMenu onSvgExport={handleSvgExport} />
        </div>
      </Layer>

      {/* Right side vertical toolbar for view controls */}
      <Layer className="view-controls-layer" index={100}>
        <div className="view-controls-container">
          <ViewControls />
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

      {/* SVG Export Popup - rendered at higher z-index */}
      <Layer className="svg-popup-layer" index={1000}>
        <SvgExportPopup
          isOpen={isPopupOpen}
          svgContent={svgContent}
          onClose={handleClosePopup}
          onDownload={handleDownloadSvg}
        />
      </Layer>
    </>
  );
};
