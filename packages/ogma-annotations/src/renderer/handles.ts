import Ogma, { CanvasLayer } from "@linkurious/ogma";
import { Renderer } from "./base";
import { handleRadius } from "../constants";
import { Store } from "../store";
import { Arrow, Box, Text, isArrow, isText } from "../types";
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
    const features = state.features;
    const liveUpdates = state.liveUpdates;
    const scale = 1 / this.ogma.view.getZoom();

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
        this.renderArrowHandles(feature, ctx, r, state.hoveredHandle);
      } else if (isText(feature)) {
        this.renderBoxHandles(feature, ctx, r, state.hoveredHandle);
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
    hoveredHandle: -1 | number
  ) {
    // a circle handle at each corner of the text box
    const boxSize = getBoxSize(feature);
    const position = getBoxPosition(feature);

    const view = this.ogma.view.get();
    // text boxes are rotated back around their centers by -view.angle
    // so we need to apply the inverse rotation to the handles
    ctx.save();

    const centerX = position.x - boxSize.width / 2;
    const centerY = position.y - boxSize.height / 2;

    ctx.translate(centerX, centerY);
    ctx.rotate(view.angle);
    ctx.translate(-centerX, -centerY);

    // Draw corner handles

    CORNER_OFFSETS.forEach(([xOffset, yOffset], index) => {
      const x = position.x + boxSize.width * xOffset;
      const y = position.y + boxSize.height * yOffset;

      // Make hovered corner handles larger
      const handleR = hoveredHandle === index ? r * handleMagnifier : r;

      ctx.moveTo(x + handleR, y);
      ctx.arc(x, y, handleR, 0, 2 * Math.PI);
    });
    ctx.restore();
  }

  public destroy(): void {
    this.layer.destroy();
    super.destroy();
  }
}
