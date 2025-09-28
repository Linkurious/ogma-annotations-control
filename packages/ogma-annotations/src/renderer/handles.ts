import Ogma, { CanvasLayer } from "@linkurious/ogma";
import { Renderer } from "./base";
import { handleRadius } from "../constants";
import { Store } from "../store";
import { Arrow, Box, Text, isArrow, isBox, isText } from "../types";
import {
  getArrowEnd,
  getArrowStart,
  getBoxPosition,
  getBoxSize
} from "../utils";

const handleMagnifier = 1.5;

// Corner offsets for text box handles: [x, y] multipliers
const CORNER_OFFSETS = [
  [0, 0], // top-left
  [1, 0], // top-right
  [1, 1], // bottom-left
  [0, 1] // bottom-right
] as const;

export class Handles extends Renderer<CanvasLayer> {
  constructor(ogma: Ogma, store: Store) {
    super(ogma, store);
    this.layer = ogma.layers.addCanvasLayer(this.render);
    this.store.subscribe(
      (state) => ({
        selectedFeatures: state.selectedFeatures,
        liveUpdates: state.liveUpdates
      }),
      this.refresh
    );
    ogma.events.on("zoom", this.refresh);
  }

  private refresh = () => {
    this.layer.refresh();
  };

  render = (ctx: CanvasRenderingContext2D) => {
    const state = this.store.getState();
    const scale = 1 / this.ogma.view.getZoom();

    const { hoveredHandle, rotation, liveUpdates, features } = state;

    ctx.beginPath();
    const r = handleRadius * scale;
    ctx.fillStyle = "#fff";
    ctx.lineWidth = 2 * scale;
    ctx.strokeStyle = "#0099ff";

    Object.values(features).forEach((baseFeature) => {
      // Only render handles for selected features
      if (!state.isSelected(baseFeature.id)) return;

      // Merge feature with live updates if they exist
      const feature = liveUpdates[baseFeature.id]
        ? { ...baseFeature, ...liveUpdates[baseFeature.id] }
        : baseFeature;

      if (isArrow(feature)) {
        this.renderArrowHandles(feature, ctx, r, hoveredHandle);
      } else if (isText(feature)) {
        this.renderBoxHandles(feature, ctx, r, hoveredHandle, rotation);
      } else if (isBox(feature)) {
        this.renderBoxHandles(feature, ctx, r, hoveredHandle, 0);
      }
    });
    ctx.fill();
    ctx.stroke();
  };

  private renderArrowHandles(
    feature: Arrow,
    ctx: CanvasRenderingContext2D,
    r: number,
    hoveredHandle: -1 | number
  ) {
    const start = getArrowStart(feature);
    const end = getArrowEnd(feature);

    const startHovered = +(hoveredHandle === 0);
    const endHovered = +(hoveredHandle === 1);

    const startR = r * (1 + (handleMagnifier - 1) * startHovered);
    const endR = r * (1 + (handleMagnifier - 1) * endHovered);

    ctx.moveTo(start.x + startR, start.y);
    ctx.arc(start.x, start.y, startR, 0, 2 * Math.PI);

    ctx.moveTo(end.x + endR, end.y);
    ctx.arc(end.x, end.y, endR, 0, 2 * Math.PI);
  }

  private renderBoxHandles(
    feature: Text | Box,
    ctx: CanvasRenderingContext2D,
    r: number,
    hoveredHandle: -1 | number,
    rotation: number
  ) {
    // a circle handle at each corner of the text box
    const { width, height } = getBoxSize(feature);
    const position = getBoxPosition(feature);

    ctx.save();

    ctx.translate(position.x, position.y);
    ctx.rotate(rotation);
    // ctx.translate(-cx, -cy);

    // Draw corner handles
    for (let i = 0; i < CORNER_OFFSETS.length; i++) {
      const [dx, dy] = CORNER_OFFSETS[i];
      const x = width * dx;
      const y = height * dy;

      // Make hovered corner handles larger
      const handleR = hoveredHandle === i ? r * handleMagnifier : r;

      ctx.moveTo(x + handleR, y);
      ctx.arc(x, y, handleR, 0, 2 * Math.PI);
    }
    ctx.restore();
  }

  public destroy(): void {
    this.layer.destroy();
    super.destroy();
  }
}
