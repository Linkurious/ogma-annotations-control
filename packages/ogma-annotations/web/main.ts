/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import Ogma, { RawNode } from '@linkurious/ogma';
import { Control, createArrow, createText } from '../src/index';
const ogma = new Ogma({
  container: 'app'
});
const control = new Control(ogma);
//@ts-ignore
window.ogma = ogma;

const annotationsWithLinks = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 2,
      properties: {
        type: 'arrow',
        style: {
          strokeType: 'plain',
          strokeColor: '#3b3',
          strokeWidth: 2,
          head: 'arrow-plain',
          tail: 'none'
        },
        link: {
          end: {
            id: 'n0',
            side: 'end',
            type: 'node',
            magnet: {
              x: 5.050129380397267,
              y: 3.193041958648245
            }
          }
        }
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [-200, 200],
          [5.050129380397267, 3.193041958648245]
        ]
      }
    },
    {
      type: 'Feature',
      id: 0,
      properties: {
        type: 'text',
        content: 'Another annotation',
        style: {
          font: 'Helvetica',
          fontSize: '52',
          color: 'black',
          background: 'rgba(255, 255, 255, 0.5)',
          strokeWidth: 1,
          strokeColor: '#000',
          strokeType: 'plain',
          padding: 12
        }
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-200, -200],
            [-200, -50],
            [200, -50],
            [200, -200],
            [-200, -200]
          ]
        ],
        bbox: [-200, -200, 200, -50]
      }
    }
  ]
};

ogma.generate
  .flower({ depth: 3 })
  .then((g) => {
    const nodesMap = g.nodes.reduce((acc, node, i) => {
      acc[node.id!] = node;
      node.id = `n${i}`;
      return acc;
    }, {} as Record<string, RawNode>);
    g.edges.forEach((edge) => {
      edge.source = nodesMap[edge.source].id!;
      edge.target = nodesMap[edge.target].id!;
    });
    return ogma.setGraph(g);
  })
  .then(() => ogma.layouts.force({ locate: true }))
  .then(() => {
    control.add(annotationsWithLinks);
  });

// @ts-ignore
window.control = control;
// @ts-ignore
window.createArrow = createArrow;

document.getElementById('add-arrow')?.addEventListener('click', () => {
  // set button active
  ogma.events.once('click', (evt) => {
    requestAnimationFrame(() => {
      const { x, y } = ogma.view.screenToGraphCoordinates(evt);
      const arrow = createArrow(x, y, x, y, {
        strokeWidth: 2,
        strokeColor: '#3b3',
        strokeType: 'plain'
      });
      control.startArrow(x, y, arrow);
    });
  });
});

document.getElementById('add-text')?.addEventListener('click', () => {
  ogma.events.once('click', (evt) => {
    requestAnimationFrame(() => {
      const { x, y } = ogma.view.screenToGraphCoordinates(evt);
      const text = createText(x, y, 0, 0);
      control.startText(x, y, text);
    });
  });
});

document.addEventListener('keydown', (evt) => {
  if (evt.key === 'Escape') {
    control.cancelDrawing();
  }
});

control.on('cancelDrawing', () => {
  console.log('cancelDrawing');
});
