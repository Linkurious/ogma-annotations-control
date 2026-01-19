import { ArrowStyles } from "@linkurious/ogma-annotations";
import React from "react";
import { ButtonGroup } from "./ButtonGroup";
import { ColorPicker } from "./ColorPicker";
import { Slider } from "./Slider";
import { useAnnotationsContext, interpolate, normalize } from "../../../src";
import { DirectionBoth } from "../../icons/direction-both";
import { DirectionNone } from "../../icons/direction-none";
import { DirectionOne } from "../../icons/direction-one";

export const ArrowSettings = ({
  minThickness,
  maxThickness
}: {
  minThickness: number;
  maxThickness: number;
}) => {
  const { arrowStyle, setArrowStyle } = useAnnotationsContext();

  function setExt(ext: "one" | "none" | "both") {
    const style: ArrowStyles = {
      head: "none",
      tail: "none"
    };
    if (ext === "one") {
      style.head = "arrow";
    }
    if (ext === "both") {
      style.head = "arrow";
      style.tail = "arrow";
    }
    setArrowStyle({ ...arrowStyle, ...style });
  }

  function setWidth(w: number) {
    const strokeWidth = interpolate(
      normalize(w, 0, 100),
      minThickness,
      maxThickness
    );
    setArrowStyle({ ...arrowStyle, strokeWidth });
  }

  function setColor(strokeColor: string) {
    setArrowStyle({ ...arrowStyle, strokeColor });
  }

  return (
    <span className="settings-panel">
      <h4>Shape</h4>
      <ButtonGroup>
        <button data-tooltip="Undirected" onClick={() => setExt("none")}>
          <DirectionNone />
        </button>
        <button data-tooltip="Arrow" onClick={() => setExt("one")}>
          <DirectionOne />
        </button>
        <button data-tooltip="Bidirectional" onClick={() => setExt("both")}>
          <DirectionBoth />
        </button>
      </ButtonGroup>
      <h4>Color</h4>
      <ColorPicker
        color={arrowStyle.strokeColor}
        setColor={(c) => setColor(c)}
      />
      <h4>Thickness</h4>
      <Slider
        min={0}
        max={100}
        onChange={(val) => setWidth(val)}
        initialValue={Math.floor(
          interpolate(
            normalize(arrowStyle.strokeWidth || 0, minThickness, maxThickness),
            0,
            100
          )
        )}
      />
    </span>
  );
};
