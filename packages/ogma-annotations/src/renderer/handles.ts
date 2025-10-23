import Ogma, { CanvasLayer } from "@linkurious/ogma";
import { Renderer } from "./base";
import { LAYERS } from "../constants";
import { Store } from "../store";
import {
  Arrow,
  Box,
  Polygon,
  Text,
  isArrow,
  isBox,
  isPolygon,
  isText
} from "../types";
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
  private polygonFill = "rgba(00, 99, 255, 0.1)";
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
    // Guard against null renderer (e.g., in tests)
    const scale = 1 / state.zoom;

    const { hoveredHandle, rotation, liveUpdates, features } = state;

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
        const counterRotation = isText(feature) ? rotation : 0;
        this.renderOutline(
          feature,
          ctx,
          counterRotation,
          hoveredHandle,
          state.zoom
        );
        this.renderBoxHandles(feature, ctx, r, hoveredHandle, counterRotation);
      } else if (isPolygon(feature)) {
        this.renderPolygonHandles(
          feature,
          ctx,
          r,
          hoveredHandle,
          state.drawingFeature === feature.id
        );
      }
    });
  };

  private renderOutline(
    feature: Text | Box,
    ctx: CanvasRenderingContext2D,
    rotation: number,
    hoveredHandle: -1 | number,
    zoom: number
  ) {
    const isFixedSize = isText(feature) && feature.properties.style?.fixedSize;
    // outline of the box
    let { width, height } = getBoxSize(feature);
    if (isFixedSize) {
      width /= zoom;
      height /= zoom;
    }
    const position = getBoxPosition(feature, isFixedSize, zoom);
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

    ctx.beginPath();

    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);

    ctx.closePath();
    ctx.stroke();

    ctx.beginPath();

    // ctx.moveTo(start.x + startR, start.y);
    // ctx.arc(start.x, start.y, startR, 0, 2 * Math.PI);
    ctx.moveTo(start.x - startR, start.y - startR);
    ctx.rect(start.x - startR, start.y - startR, startR * 2, startR * 2);

    // ctx.moveTo(end.x + endR, end.y);
    // ctx.arc(end.x, end.y, endR, 0, 2 * Math.PI);
    ctx.moveTo(end.x - endR, end.y - endR);
    ctx.rect(end.x - endR, end.y - endR, endR * 2, endR * 2);

    ctx.closePath();
    ctx.fill();
    ctx.stroke();
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
    ctx.beginPath();

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
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private renderPolygonHandles(
    feature: Polygon,
    ctx: CanvasRenderingContext2D,
    r: number,
    hoveredHandle: -1 | number,
    isDrawing: boolean
  ) {
    const coords = feature.geometry.coordinates[0];
    const style = feature.properties.style;

    // If drawing, render preview path
    if (isDrawing) {
      ctx.save();
      ctx.strokeStyle = this.handleStroke;
      ctx.lineWidth = style?.strokeWidth || 2;
      ctx.setLineDash([5, 5]); // Dashed line for preview

      ctx.beginPath();
      if (coords.length > 0) {
        ctx.moveTo(coords[0][0], coords[0][1]);
        for (let i = 1; i < coords.length; i++) {
          ctx.lineTo(coords[i][0], coords[i][1]);
        }
      }

      ctx.setLineDash([]); // Reset dash
      ctx.fillStyle = this.polygonFill;
      ctx.stroke();
      ctx.fill();
      ctx.restore();

      // Don't render vertex handles while drawing
      return;
    }

    ctx.beginPath();
    // Render vertex handles (excluding the closing point)
    for (let i = 0; i < coords.length - 1; i++) {
      const [x, y] = coords[i];
      const handleR = hoveredHandle === i ? r * this.handleMagnifier : r;

      // Circle handles for vertices
      ctx.moveTo(x + handleR, y);
      ctx.arc(x, y, handleR, 0, 2 * Math.PI);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
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
