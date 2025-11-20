import Ogma from "@linkurious/ogma";
import { Index } from "../interaction/spatialIndex";
import { Text } from "../types";
import { getTextSize } from "../utils";

export function findPlace(
  // px and py are in grpah space
  px: number,
  py: number,
  index: Index,
  ogma: Ogma,
  text?: Text
) {
  const { width, height } = ogma.view.getSize();
  const angleDiscret = 8;
  const widthDiscret = 16;
  const maxSteps = angleDiscret * widthDiscret;
  const size = text ? getTextSize(text) : { width: 150, height: 50 };
  const w = size.width;
  const h = size.height;
  const maxDistance = Math.max(width, height);
  const minDistance = 200;
  const box = {
    minX: 0,
    minY: 0,
    maxX: 0,
    maxY: 0
  };
  const center = ogma.view.graphToScreenCoordinates({ x: px, y: py });
  for (let step = 0; step < maxSteps; step++) {
    const i = step % angleDiscret;
    const j = Math.floor(step / angleDiscret);
    const angle = 2 * Math.PI * (i / angleDiscret);
    const distance =
      minDistance + (j / widthDiscret) * (maxDistance - minDistance);
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;
    const x = center.x + dx;
    const y = center.y + dy;
    box.minX = x;
    box.minY = y - h / 2;
    box.maxX = x + w;
    box.maxY = y + h / 2;

    // if on the opposite side of the point, we need to move the box
    if (dx < 0) {
      box.minX -= w;
      box.maxX -= w;
    }

    if (box.minX < 0 || box.maxX > width || box.minY < 0 || box.maxY > height) {
      continue; // not on screen
    }

    // pass box in graph space to query the index
    const min = ogma.view.screenToGraphCoordinates({
      x: box.minX,
      y: box.minY
    });
    const max = ogma.view.screenToGraphCoordinates({
      x: box.maxX,
      y: box.maxY
    });
    box.minX = min.x;
    box.minY = min.y;
    box.maxX = max.x;
    box.maxY = max.y;
    const hits = index.query(box).filter((annotation) => {
      //ignore arrows
      return annotation.properties.type !== "arrow";
    });
    if (hits.length) {
      continue; // collision
    }
    return ogma.view.screenToGraphCoordinates({ x, y });
  }

  return ogma.view.screenToGraphCoordinates({ x: width / 2, y: height / 2 });
}
