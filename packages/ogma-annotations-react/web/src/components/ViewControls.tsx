import React from "react";
import { useOgma } from "@linkurious/ogma-react";
import { RotateCw, RotateCcw, Minimize } from "lucide-react";
import { useAnnotationsContext, getAnnotationsBounds } from "../../../src";

import "../tooltip.css";
import "./ViewControls.css";

export const ViewControls = () => {
  const ogma = useOgma();
  const { annotations } = useAnnotationsContext();

  const handleCenterView = async () => {
    const bounds = ogma.view.getGraphBoundingBox();
    await ogma.view.moveToBounds(
      bounds.extend(getAnnotationsBounds(annotations)),
      { duration: 200 }
    );
  };

  const handleRotateCW = async () => {
    await ogma.view.rotate(-Math.PI / 8, { duration: 200 });
  };

  const handleRotateCCW = async () => {
    await ogma.view.rotate(Math.PI / 8, { duration: 200 });
  };

  const buttonSize = 16;
  return (
    <div className="view-controls">
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
