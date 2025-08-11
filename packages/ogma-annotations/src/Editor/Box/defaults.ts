import { nanoid as getId } from "nanoid";
import { AnnotationOptions, Box, BoxStyle } from "../../types";

export const defaultStyle: BoxStyle = {
  background: "#f5f5f5",
  strokeWidth: 0,
  borderRadius: 8,
  padding: 16,
  strokeType: "plain"
};

//used when adding a new Text
export const defaultOptions: Box = {
  id: 0,
  type: "Feature",
  properties: {
    type: "box",
    style: { ...defaultStyle }
  },
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [0, 0],
        [100, 0],
        [100, 50],
        [0, 50],
        [0, 0]
      ]
    ]
  }
};

export const defaultControllerOptions: AnnotationOptions = {
  handleSize: 3.5
};

export const createBox = (
  x = 0,
  y = 0,
  width = 100,
  height = 50,
  styles: Partial<BoxStyle> = { ...defaultStyle }
): Box => ({
  id: getId(),
  type: "Feature",
  properties: {
    type: "box",
    style: { ...defaultStyle, ...styles }
  },
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [x, y],
        [x + width, y],
        [x + width, y + height],
        [x, y + height],
        [x, y]
      ]
    ]
  }
});

export const getEditorTemplate = (addOns = "") => `
    <div class="annotation-text-handle" data-handle-id="8">
      <span class="handle line-handle top" data-handle-id="0"></span>
      <span class="handle line-handle bottom" data-handle-id="1"></span>
      <span class="handle line-handle left" data-handle-id="2"></span>
      <span class="handle line-handle right" data-handle-id="3"></span>
      <span class="handle top right point-handle top-right" data-handle-id="4"></span>
      <span class="handle left top point-handle top-left" data-handle-id="5"></span>
      <span class="handle bottom right point-handle bottom-right" data-handle-id="6"></span>
      <span class="handle left bottom left-handle point-handle bottom-left" data-handle-id="7"></span>
      ${addOns}
    </div>
  `;
