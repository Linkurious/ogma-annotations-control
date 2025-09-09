import Ogma from "@linkurious/ogma";
import { Links } from "../links";
import { Store, store } from "../store";
import { Arrow } from "../types";
import { getTextPosition, getTextSize, setArrowEndPoint } from "../utils";
import { add, multiply, rotateRadians } from "../vec";

export class Rotation {
  private ogma: Ogma;
  private links: Links;
  private store: Store;
  constructor(ogma: Ogma, store: Store, links: Links) {
    this.ogma = ogma;
    this.store = store;
    this.links = links;
    this.ogma.events.on("rotate", () => this.refreshTextLinks());
  }

  private refreshTextLinks() {
    this.links.forEach(({ magnet, targetType, target, arrow, side }) => {
      if (targetType !== "text") return;
      const text = this.store.getState().getFeature(target)!;
      const a = this.store.getState().getFeature(arrow) as Arrow;
      const size = getTextSize(text);
      const position = getTextPosition(text);

      const m = multiply(magnet!, { x: size.width, y: size.height });
      const r = rotateRadians(m, this.ogma.view.getAngle());
      const point = add(r, position);
      setArrowEndPoint(a, side, point.x, point.y);
    });
  }
}
