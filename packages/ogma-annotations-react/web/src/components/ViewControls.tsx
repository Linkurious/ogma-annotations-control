import React from "react";
import { useOgma } from "@linkurious/ogma-react";
import { RotateCw, RotateCcw, Minimize } from "lucide-react";
import { useAnnotationsContext, getAnnotationsBounds } from "../../../src";

import "../tooltip.css";
import "./ViewControls.css";

export const ViewControls = () => {
  const ogma = useOgma();
  const { annotations } = useAnnotationsContext();

  const handleCenterView = React.useCallback(async () => {
    const bounds = ogma.view.getGraphBoundingBox();
    await ogma.view.moveToBounds(
      bounds.extend(getAnnotationsBounds(annotations)),
      { duration: 200 }
    );
  }, [ogma, annotations]);

  const handleRotateCW = React.useCallback(async () => {
    await ogma.view.rotate(-Math.PI / 8, { duration: 200 });
  }, [ogma]);

  const handleRotateCCW = React.useCallback(async () => {
    await ogma.view.rotate(Math.PI / 8, { duration: 200 });
  }, [ogma]);

  const stopEvent = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  React.useEffect(() => {
    setTimeout(() => {
      //console.log("Auto-centering view to fit annotations", annotations);
      //handleCenterView();
    }, 2500);
  }, [ogma]);

  const buttonSize = 16;
  return (
    <div className="view-controls" onMouseMove={stopEvent} onClick={stopEvent}>
      <button data-tooltip="Center view" onClick={handleCenterView}>
        <Minimize width={buttonSize} height={buttonSize} />
      </button>
      <span className="separator"></span>
      <button data-tooltip="Rotate clockwise" onClick={handleRotateCW}>
        <RotateCw width={buttonSize} height={buttonSize} />
      </button>
      <button data-tooltip="Rotate counter-clockwise" onClick={handleRotateCCW}>
        <RotateCcw width={buttonSize} height={buttonSize} />
      </button>
    </div>
  );
};
