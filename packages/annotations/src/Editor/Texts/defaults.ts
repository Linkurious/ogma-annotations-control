import { nanoid as getId } from 'nanoid';
import { AnnotationOptions, Text, TextStyle } from '../../types';

export const defaultStyle: TextStyle = {
  font: 'sans-serif',
  fontSize: '12',
  color: 'black',
  background: '',
  strokeWidth: 1,
  strokeColor: '#000',
  strokeType: 'plain'
};

//used when adding a new Text
export const defaultOptions: Text = {
  id: 0,
  type: 'Feature',
  properties: {
    type: 'text',
    content: '',
    style: { ...defaultStyle }
  },
  geometry: {
    type: 'Polygon',
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
  // position: { x: 0, y: 0 },
  // size: { width: 100, height: 50 }
};

export const defaultControllerOptions: AnnotationOptions = {
  handleSize: 3.5,
  placeholder: 'Your text...'
};

export const createText = (
  x = 0,
  y = 0,
  width = 100,
  height = 50,
  content = '',
  styles = { ...defaultStyle }
): Text => ({
  id: getId(),
  type: 'Feature',
  properties: {
    type: 'text',
    content,
    style: { ...styles }
  },
  geometry: {
    type: 'Polygon',
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
