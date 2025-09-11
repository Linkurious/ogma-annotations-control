import Ogma from "@linkurious/ogma";
import { Links } from "../links";
export class Rotation {
  private ogma: Ogma;
  private links: Links;
  constructor(ogma: Ogma, links: Links) {
    this.ogma = ogma;
    this.links = links;
    this.ogma.events.on("rotate", () => this.refreshTextLinks());
  }

  private refreshTextLinks() {
    this.links.update();
  }
}
