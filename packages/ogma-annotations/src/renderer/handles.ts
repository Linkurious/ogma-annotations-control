import Ogma, { CanvasLayer } from "@linkurious/ogma";
import { Renderer } from "./base";
import { Store } from "../store";
import { isArrow, isText } from "../types";
import {
  getArrowEnd,
  getArrowStart,
  getBoxPosition,
  getBoxSize
} from "../utils";

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
    const r = 3 * scale;
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
        // render two circle handles at the start and end of the arrow
        const start = getArrowStart(feature);
        const end = getArrowEnd(feature);

        ctx.moveTo(start.x + r, start.y);
        ctx.arc(start.x, start.y, r, 0, 2 * Math.PI);

        ctx.moveTo(end.x + r, end.y);
        ctx.arc(end.x, end.y, r, 0, 2 * Math.PI);
      } else if (isText(feature)) {
        // a circle handle at each corner of the text box
        const boxSize = getBoxSize(feature);
        const position = getBoxPosition(feature);
        const corners = [
          { x: position.x, y: position.y },
          { x: position.x + boxSize.width, y: position.y },
          { x: position.x, y: position.y + boxSize.height },
          { x: position.x + boxSize.width, y: position.y + boxSize.height }
        ];
        corners.forEach((corner) => {
          ctx.moveTo(corner.x + r, corner.y);
          ctx.arc(corner.x, corner.y, r, 0, 2 * Math.PI);
        });
      }
    });
    ctx.fill();
    ctx.stroke();
  };

  public destroy(): void {
    this.layer.destroy();
    super.destroy();
  }
}
