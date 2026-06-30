import { useOgma } from "@linkurious/ogma-react";
import { getAnnotationsBounds } from "@linkurious/ogma-annotations";
import React from "react";
import { useAnnotationsContext } from "@linkurious/ogma-annotations-react";
import { Icon } from "./Icon";

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
    e.preventDefault();
  }, []);

  return (
    <div className="view-controls" onMouseMove={stopEvent} onClick={stopEvent}>
      <button data-tooltip="Center view" onClick={handleCenterView}>
        <Icon name="minimize" size={16} />
      </button>
      <span className="separator"></span>
      <button data-tooltip="Rotate clockwise" onClick={handleRotateCW}>
        <Icon name="rotate-cw" size={16} />
      </button>
      <button data-tooltip="Rotate counter-clockwise" onClick={handleRotateCCW}>
        <Icon name="rotate-ccw" size={16} />
      </button>
    </div>
  );
};
