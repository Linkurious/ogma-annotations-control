import Ogma, { CanvasLayer } from "@linkurious/ogma";
import { Renderer } from "./base";
import { LAYERS } from "../constants";
import { Store } from "../store";
import { Arrow, Box, Text, isArrow, isBox, isText } from "../types";
import {
  getArrowEnd,
  getArrowStart,
  getBoxPosition,
  getBoxSize
} from "../utils";

// Corner offsets for text box handles: [x, y] multipliers
const CORNER_OFFSETS = [
  [-0.5, -0.5], // top-left
  [0.5, -0.5], // top-right
  [0.5, 0.5], // bottom-left
  [-0.5, 0.5] // bottom-right
] as const;

export class Handles extends Renderer<CanvasLayer> {
  // TODO: move it to settings and state
  private handleFill = "#fff";
  private handleStroke = "#1A70E5";
  private handleStrokeWidth = 1.5;
  private handleRadius = 3;
  private handleMagnifier = 1.5;

  constructor(ogma: Ogma, store: Store) {
    super(ogma, store);
    this.layer = ogma.layers.addCanvasLayer(
      this.render,
      undefined,
      LAYERS.HANDLES
    );
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
    const r = this.handleRadius * scale;
    ctx.fillStyle = this.handleFill;
    ctx.lineWidth = this.handleStrokeWidth * scale;
    ctx.strokeStyle = this.handleStroke;

    Object.values(features).forEach((baseFeature) => {
      // Only render handles for selected features
      if (!state.isSelected(baseFeature.id)) return;

      // Merge feature with live updates if they exist
      const feature = liveUpdates[baseFeature.id]
        ? { ...baseFeature, ...liveUpdates[baseFeature.id] }
        : baseFeature;

      if (isArrow(feature)) {
        this.renderArrowHandles(feature, ctx, r, hoveredHandle);
      } else if (isBox(feature) || isText(feature)) {
        this.renderOutline(feature, ctx, rotation, hoveredHandle, state.zoom);
        this.renderBoxHandles(
          feature,
          ctx,
          r,
          hoveredHandle,
          isText(feature) ? rotation : 0
        );
      }
    });
    ctx.fill();
    ctx.stroke();
  };

  private renderOutline(
    feature: Text | Box,
    ctx: CanvasRenderingContext2D,
    rotation: number,
    hoveredHandle: -1 | number,
    zoom: number
  ) {
    if (isText(feature) && feature.properties.style?.fixedSize) return;
    // outline of the box
    const { width, height } = getBoxSize(feature);
    const position = getBoxPosition(feature);
    const hw = width / 2;
    const hh = height / 2;
    // center of the box
    const ox = position.x + hw;
    const oy = position.y + hh;

    ctx.save();

    ctx.translate(ox, oy);
    ctx.rotate(rotation);

    // Draw box outline
    ctx.strokeRect(-hw, -hh, width, height);
    // if there's a hovered edge handle, draw thicker line on that edge
    if (hoveredHandle >= 4 && hoveredHandle < 8) {
      let x0: number, y0: number, x1: number, y1: number;
      const r = this.handleRadius / zoom;
      switch (hoveredHandle) {
        case 4: // top edge
          x0 = -hw + r;
          y0 = -hh;
          x1 = hw - r;
          y1 = -hh;
          break;
        case 5: // right edge
          x0 = hw;
          y0 = -hh + r;
          x1 = hw;
          y1 = hh - r;
          break;
        case 6: // bottom edge
          x0 = hw - r;
          y0 = hh;
          x1 = -hw + r;
          y1 = hh;
          break;
        case 7: // left edge
          x0 = -hw;
          y0 = hh - r;
          x1 = -hw;
          y1 = -hh + r;
          break;
      }

      ctx.lineWidth = (this.handleStrokeWidth * this.handleMagnifier) / zoom;
      ctx.beginPath();
      ctx.moveTo(x0!, y0!);
      ctx.lineTo(x1!, y1!);
      ctx.stroke();
      ctx.lineWidth = this.handleStrokeWidth;
    }

    ctx.restore();
  }

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

    const startR = r * (1 + (this.handleMagnifier - 1) * startHovered);
    const endR = r * (1 + (this.handleMagnifier - 1) * endHovered);

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
    if (isText(feature) && feature.properties.style?.fixedSize) return;
    // a circle handle at each corner of the text box
    const { width, height } = getBoxSize(feature);
    const position = getBoxPosition(feature);
    const hw = width / 2;
    const hh = height / 2;
    // center of the box
    const ox = position.x + hw;
    const oy = position.y + hh;

    ctx.save();

    ctx.translate(ox, oy);
    ctx.rotate(rotation);

    // Draw corner handles
    for (let i = 0; i < CORNER_OFFSETS.length; i++) {
      const [dx, dy] = CORNER_OFFSETS[i];
      const x = width * dx;
      const y = height * dy;

      // Make hovered corner handles larger
      const handleR = hoveredHandle === i ? r * this.handleMagnifier : r;

      // square handles
      ctx.rect(x - handleR, y - handleR, handleR * 2, handleR * 2);

      // circle handles
      // ctx.moveTo(x + handleR, y);
      // ctx.arc(x, y, handleR, 0, 2 * Math.PI);
    }
    ctx.restore();
  }

  // @ts-expect-error debug method
  private renderCenterPoint(
    feature: Text | Box,
    ctx: CanvasRenderingContext2D
  ) {
    const state = this.store.getState();
    // debugging - draw center point
    if (isText(feature)) {
      const pos = getBoxPosition(
        feature,
        feature.properties.style?.fixedSize,
        state.zoom
      );
      const size = getBoxSize(feature);
      ctx.moveTo(pos.x + size.width / 2 + 5, pos.y + size.height / 2);
      ctx.arc(
        pos.x + size.width / 2,
        pos.y + size.height / 2,
        5,
        0,
        Math.PI * 2,
        true
      );
    }
  }

  public destroy(): void {
    this.layer.destroy();
    super.destroy();
  }
}
