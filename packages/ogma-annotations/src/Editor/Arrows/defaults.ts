import { nanoid as getId } from 'nanoid';
import { Arrow, ArrowStyles } from '../../types';

export const defaultStyle: ArrowStyles = {
  strokeType: 'plain',
  strokeColor: 'black',
  strokeWidth: 1,
  head: 'none',
  tail: 'none'
};

// used when adding a new Arrow
export const defaultOptions: Arrow = {
  id: 0,
  type: 'Feature',
  properties: {
    type: 'arrow',
    style: {
      ...defaultStyle
    }
  },
  geometry: {
    type: 'LineString',
    coordinates: [
      [0, 0],
      [100, 100]
    ]
  }

  // type: 'arrow',
  // stroke: {
  //   type: 'plain',
  //   color: 'black',
  //   width: 1
  // },
  // head: 'none',
  // tail: 'arrow-plain',
  // start: { x: 0, y: 0 },
  // end: { x: 100, y: 100 }
};

export const createArrow = (
  x0 = 0,
  y0 = 0,
  x1 = 0,
  y1 = 0,
  styles = { ...defaultStyle }
): Arrow => ({
  id: getId(),
  type: 'Feature',
  properties: {
    type: 'arrow',
    style: {
      ...defaultStyle,
      ...styles
    }
  },
  geometry: {
    type: 'LineString',
    coordinates: [
      [x0, y0],
      [x1, y1]
    ]
  }
});
