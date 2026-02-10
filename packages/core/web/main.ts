import Ogma from '@linkurious/ogma';

// on the playground, we are using the CDN version of annotation plugin,
// normally, in your app you would import it like this:
import { Control } from "../src";


const ogma = new Ogma({
  container: 'app'
});

const graph = {
  nodes: [
    { id: 'n1', attributes: {x: -1000, y: -1000} },
    { id: 'n2', attributes: {x: -1000, y: 1000} },
    { id: 'n3', attributes: {x: 1000, y: 1000} }
  ],
  edges: [
    { id: 'e1', source: 'n1', target: 'n2' },
    { id: 'e2', source: 'n2', target: 'n3' }
  ] 
}

ogma.styles.addNodeRule({
  text: {
    font: 'IBM Plex Sans'
  }
});

await ogma.setGraph(graph);
// await ogma.layouts.force({locate: true});
await new Promise((resolve) => setTimeout(resolve, 500)); // Wait for layout to stabilize
const control = new Control(ogma);

// load annotations
const annotations = await fetch('./annotations.json').then(response =>
  response.json()
);

// add them to the visualization
control.add(annotations);


// ogma.layers.addCanvasLayer(ctx =>{
//   ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
//   ctx.fillRect(50, 50, 100, 100);
// })


// ogma.layers.addSVGLayer(svg =>{
//   const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
//   rect.setAttribute('x', '200');
//   rect.setAttribute('y', '200');
//   rect.setAttribute('width', '100');
//   rect.setAttribute('height', '100');
//   rect.setAttribute('fill', 'rgba(0, 255, 0, 0.5)');
//   svg.appendChild(rect);
// });

// ogma.layers.addLayer(`
//   <div style="position: absolute; top: 0px; left: 0px; width: 1300px; height: 300px; background-color: rgba(0, 0, 255, 0.5);"></div>
//   `)