import Ogma from '@linkurious/ogma';
import { describe, it, assert } from 'vitest';
import { Control, createArrow, createText, Text } from '../../src';

export const createOgma = () => new Ogma({ renderer: 'svg' });

describe('text-annotations', () => {
  it('should expose the control', () => {
    assert.isDefined(Control);
  });

  it('should be able to create a control instance', () => {
    const ogma = createOgma();
    const control = new Control(ogma);
    assert.isDefined(control);
    assert.isFunction(control.add);
    return Promise.resolve().then(() => ogma.destroy());
  });

  it('should be able to add an arrow', () => {
    const ogma = createOgma();
    const control = new Control(ogma);
    control.add({
      type: 'Feature',
      id: 0,
      properties: {
        type: 'arrow'
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [0, 0],
          [1, 1]
        ]
      }
    });
    return Promise.resolve().then(() => ogma.destroy());
  });

  it('should be able to add a text', () => {
    const ogma = createOgma();
    const control = new Control(ogma);
    control.add({
      type: 'Feature',
      id: 0,
      properties: {
        type: 'text',
        content: 'Hello world',
        style: {
          fontSize: '12px',
          font: 'Arial',
          color: '#000000'
        }
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0]
          ]
        ]
      }
    });
    return Promise.resolve().then(() => ogma.destroy());
  });

  it('should be able to add an arrow', () => {
    const ogma = createOgma();
    const control = new Control(ogma);
    control.add({
      type: 'Feature',
      id: 0,
      properties: {
        type: 'arrow',
        style: {}
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [0, 0],
          [1, 1]
        ]
      }
    });
    return Promise.resolve().then(() => ogma.destroy());
  });

  it('should be able to add a collection', () => {
    const ogma = createOgma();
    const control = new Control(ogma);
    control.add({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 0,
          properties: {
            type: 'text',
            content: 'Hello world'
          },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [0, 0],
                [1, 0],
                [1, 1],
                [0, 1],
                [0, 0]
              ]
            ]
          }
        },
        {
          type: 'Feature',
          id: 1,
          properties: {
            type: 'arrow',
            style: {}
          },
          geometry: {
            type: 'LineString',
            coordinates: [
              [0, 0],
              [1, 1]
            ]
          }
        }
      ]
    });

    return Promise.resolve().then(() => ogma.destroy());
  });
});

describe('Helpers', () => {
  it('it should create text feature', () => {
    const text = createText(0, 0, 100, 200, 'Hello world', {
      fontSize: '12px',
      strokeColor: 'magenta'
    });
    assert.equal(text.properties.type, 'text');
    assert.equal(text.properties.content, 'Hello world');

    assert.equal(text.properties.style?.strokeColor, 'magenta');

    assert.equal(text.geometry.type, 'Polygon');
    assert.equal(text.geometry.coordinates.length, 1);
    assert.equal(text.geometry.coordinates[0].length, 5);

    assert.deepEqual(text.geometry.coordinates[0][0], [0, 0]);
    assert.deepEqual(text.geometry.coordinates[0][1], [100, 0]);
    assert.deepEqual(text.geometry.coordinates[0][2], [100, 200]);
    assert.deepEqual(text.geometry.coordinates[0][3], [0, 200]);
    assert.deepEqual(text.geometry.coordinates[0][4], [0, 0]);
  });

  it('it should create arrow feature', () => {
    const arrow = createArrow(0, 0, 100, 200, {
      strokeColor: 'magenta'
    });
    assert.equal(arrow.properties.type, 'arrow');
    assert.equal(arrow.properties.style?.strokeColor, 'magenta');

    assert.equal(arrow.geometry.type, 'LineString');
    assert.equal(arrow.geometry.coordinates.length, 2);

    assert.deepEqual(arrow.geometry.coordinates[0], [0, 0]);
    assert.deepEqual(arrow.geometry.coordinates[1], [100, 200]);
  });
});

describe('Draw API', () => {
  it('should be able to start drawing an arrow', () => {
    const ogma = createOgma();
    const control = new Control(ogma);

    assert.isFunction(control.startArrow);
    control.startArrow(0, 0, createArrow(0, 0, 0, 0, {}));

    return Promise.resolve()
      .then(() => {
        const annotations = control.getAnnotations();
        assert.equal(annotations.features.length, 1);
        assert.equal(annotations.features[0].properties.type, 'arrow');
      })
      .then(() => ogma.destroy());
  });

  it('should be able to start drawing a text', () => {
    const ogma = createOgma();
    const control = new Control(ogma);

    const text = createText(0, 0, 0, 0, 'Hello world', {});
    assert.isFunction(control.startArrow);
    control.startText(0, 0, text);

    return Promise.resolve()
      .then(() => {
        const annotations = control.getAnnotations();
        assert.equal(annotations.features.length, 1);
        const feature = annotations.features[0] as Text;
        assert.equal(feature.properties.type, 'text');
        assert.equal(feature.properties.content, 'Hello world');
      })
      .then(() => ogma.destroy());
  });

  it('should be able to stop drawing text', () => {
    const ogma = createOgma();
    const control = new Control(ogma);

    const text = createText(0, 0, 0, 0, 'Hello world', {});
    control.startText(0, 0, text);

    return Promise.resolve()
      .then(() => {
        assert.isFunction(control.cancelDrawing);
        control.cancelDrawing();
        const annotations = control.getAnnotations();
        assert.equal(annotations.features.length, 0);
      })
      .then(() => ogma.destroy());
  });

  it('should be able to stop drawing arrow', () => {
    const ogma = createOgma();
    const control = new Control(ogma);

    const arrow = createArrow(0, 0, 0, 0);
    control.startArrow(0, 0, arrow);

    return Promise.resolve()
      .then(() => {
        assert.isFunction(control.cancelDrawing);
        control.cancelDrawing();
        const annotations = control.getAnnotations();
        assert.equal(annotations.features.length, 0);
      })
      .then(() => ogma.destroy());
  });

  it("shouldn't remove existing features if not drawing", () => {
    const ogma = createOgma();
    const control = new Control(ogma);

    const arrow = createArrow(0, 0, 0, 0);
    control.add(arrow);

    return Promise.resolve()
      .then(() => {
        assert.isFunction(control.cancelDrawing);
        control.cancelDrawing();
        const annotations = control.getAnnotations();
        assert.equal(annotations.features.length, 1);
      })
      .then(() => ogma.destroy());
  });
});

describe('Events', () => {
  it('Emits an event when a feature is selected', () => {
    const ogma = createOgma();
    const control = new Control(ogma);

    return new Promise<void>((resolve) => {
      control.on('select', (feature) => {
        assert.equal(feature.properties.type, 'arrow');
        assert.deepEqual(control.getSelected(), feature);
        resolve();
      });

      const arrow = createArrow(0, 0, 0, 0);
      control.add(arrow);
      control.select(arrow.id);
    });
  });

  it('Emits an event when a feature is unselected', () => {
    const ogma = createOgma();
    const control = new Control(ogma);

    return new Promise<void>((resolve) => {
      control.on('unselect', (feature) => {
        assert.equal(feature.properties.type, 'arrow');
        assert.isNull(control.getSelected());
        resolve();
      });

      const arrow = createArrow(0, 0, 0, 0);
      control.add(arrow);
      control.select(arrow.id);
      control.unselect();
    });
  });
});

describe('Updates', () => {
  it('should be able to update line thickness', () => {
    const ogma = createOgma();
    const control = new Control(ogma);

    const arrow = createArrow(0, 0, 0, 0, { strokeColor: 'pink' });
    control.add(arrow);

    return Promise.resolve()
      .then(() => {
        assert.equal(arrow.properties.style?.strokeWidth, 1);
        control.updateStyle(arrow.id, { strokeWidth: 22 });
        assert.equal(arrow.properties.style?.strokeWidth, 22);
        assert.equal(arrow.properties.style?.strokeColor, 'pink');
      })
      .then(() => ogma.destroy());
  });

  it('should be able to update text color', () => {
    const ogma = createOgma();
    const control = new Control(ogma);

    const text = createText(0, 0, 0, 0, 'Hello world', { fontSize: '14px' });
    control.add(text);

    return Promise.resolve()
      .then(() => {
        assert.equal(text.properties.style?.color, 'black');
        control.updateStyle(text.id, { color: 'pink' });
        assert.equal(text.properties.style?.color, 'pink');
        assert.equal(text.properties.style?.fontSize, '14px');
      })
      .then(() => ogma.destroy());
  });

  it('should send an event when a feature is updated', () => {
    const ogma = createOgma();
    const control = new Control(ogma);

    const arrow = createArrow(0, 0, 0, 0, { strokeColor: 'pink' });
    control.add(arrow);

    return new Promise<void>((resolve) => {
      control.on('update', (feature) => {
        assert.equal(feature.properties.type, 'arrow');
        assert.equal(feature.properties.style?.strokeWidth, 22);
        assert.equal(feature.properties.style?.strokeColor, 'pink');
        resolve();
      });

      control.updateStyle(arrow.id, { strokeWidth: 22 });
    });
  });
});
