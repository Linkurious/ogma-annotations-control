import type { Layer as LayerType } from "@linkurious/ogma";
import { ArrowStyles, TextStyle } from "@linkurious/ogma-annotations";
//import "@linkurious/ogma-annotations/style.css";
import { Layer, useOgma } from "@linkurious/ogma-react";
import React from "react";
import "@linkurious/ogma-annotations/style.css";

import "./Controls.css";

import { AddMenu } from "./AddMenu";
import { JsonExportPopup } from "./JsonExportPopup";
import { SvgExportPopup } from "./SvgExportPopup";
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
  defaultArrowStyle: defaultArrowStyleProp = {},
  defaultTextStyle: defaultTextStyleProp = {}
}: ControlProps) => {
  const { annotations, editor } = useAnnotationsContext();
  const ogma = useOgma();

  // SVG Export popup state
  const [isSvgPopupOpen, setIsSvgPopupOpen] = React.useState(false);
  const [svgContent, setSvgContent] = React.useState("");

  // JSON Export popup state
  const [isJsonPopupOpen, setIsJsonPopupOpen] = React.useState(false);
  const [jsonContent, setJsonContent] = React.useState("");

  const handleSvgExport = React.useCallback(async () => {
    try {
      const svg = await ogma.export.svg({ clip: true, download: false });
      setSvgContent(svg);
      setIsSvgPopupOpen(true);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to export SVG:", error);
    }
  }, [ogma]);

  const handleCloseSvgPopup = React.useCallback(() => {
    setIsSvgPopupOpen(false);
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

  // JSON Export handlers
  const handleJsonExport = React.useCallback(() => {
    try {
      const annotations = editor?.getAnnotations();
      if (annotations) {
        const jsonString = JSON.stringify(annotations, null, 2);
        setJsonContent(jsonString);
        setIsJsonPopupOpen(true);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to export JSON:", error);
    }
  }, [editor]);

  const handleCloseJsonPopup = React.useCallback(() => {
    setIsJsonPopupOpen(false);
    setJsonContent("");
  }, []);

  const handleDownloadJson = React.useCallback(() => {
    if (jsonContent) {
      const blob = new Blob([jsonContent], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      document.body.appendChild(a);
      a.setAttribute("href", url);
      a.setAttribute("download", "annotations.json");
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }
  }, [jsonContent]);

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
          <AddMenu
            onSvgExport={handleSvgExport}
            onJsonExport={handleJsonExport}
          />
        </div>
      </Layer>
      {/* Right side vertical toolbar for view controls */}
      <Layer className="view-controls-layer" index={100}>
        <div className="view-controls-container">
          <ViewControls />
        </div>
      </Layer>
      {/* SVG Export Popup - rendered at higher z-index */}
      <Layer className="svg-popup-layer" index={1000}>
        <SvgExportPopup
          isOpen={isSvgPopupOpen}
          svgContent={svgContent}
          onClose={handleCloseSvgPopup}
          onDownload={handleDownloadSvg}
        />
      </Layer>
      {/* JSON Export Popup - rendered at higher z-index */}
      <Layer className="json-popup-layer" index={1000}>
        <JsonExportPopup
          isOpen={isJsonPopupOpen}
          jsonContent={jsonContent}
          onClose={handleCloseJsonPopup}
          onDownload={handleDownloadJson}
        />
      </Layer>{" "}
    </>
  );
};
