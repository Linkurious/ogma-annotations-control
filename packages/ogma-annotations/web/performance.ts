/* eslint-disable no-console */
import Ogma from "@linkurious/ogma";
import { Control, createCommentWithArrow } from "../src";

const N = 100;

// Sample sentences for comments
const SENTENCES = [
  "This node represents a critical data point in the system.",
  "Important connection identified during analysis.",
  "Key junction in the processing pipeline.",
  "Primary entry point for user interactions.",
  "Central hub for data distribution.",
  "Critical node requiring monitoring.",
  "Essential component in the workflow.",
  "Main processing unit in the chain.",
  "Strategic position in the network.",
  "Important checkpoint for validation.",
  "Core element of the architecture.",
  "Vital node for system integrity.",
  "Primary aggregation point for metrics.",
  "Key decision point in the flow.",
  "Central coordination node.",
  "Critical synchronization point.",
  "Essential data transformation node.",
  "Main routing junction.",
  "Important filtering stage.",
  "Core business logic component."
];

// Generate graph data: N nodes in a chain
function generateChainData(nodeCount: number) {
  const nodes = [];
  const edges = [];

  for (let i = 0; i < nodeCount; i++) {
    nodes.push({
      id: `node-${i}`,
      data: {
        label: `${i}`
      },
      attributes: {
        x: (i % 25) * 100,
        y: Math.floor(i / 25) * 100
      }
    });

    if (i > 0) {
      edges.push({
        id: `edge-${i - 1}-${i}`,
        source: `node-${i - 1}`,
        target: `node-${i}`
      });
    }
  }

  return { nodes, edges };
}

// Initialize
const startTime = performance.now();

const ogma = new Ogma({
  container: "container",
  options: {
    backgroundColor: "#1a1a2e"
  }
});

const control = new Control(ogma);

const statusEl = document.getElementById("status")!;
// Update status
statusEl.textContent = "Generating data...";

// Generate and add graph
const { nodes, edges } = generateChainData(N);

statusEl.textContent = "Loading graph...";

await ogma.setGraph({ nodes, edges });

document.getElementById("node-count")!.textContent = N.toString();
statusEl.textContent = "Creating comments...";

// Style nodes
ogma.styles.addNodeRule({
  radius: 8,
  color: "#3498db",
  text: {
    size: 10,
    color: "#ecf0f1"
  }
});

ogma.styles.addEdgeRule({
  color: "#34495e",
  width: 1.5
});

// Create comments for each node
const commentStartTime = performance.now();
let createdComments = 0;

for (let i = 0; i < N; i++) {
  const nodeId = `node-${i}`;
  const node = ogma.getNode(nodeId)!;
  const nodePos = node.getPosition();

  // Random sentence for variety
  const sentence = SENTENCES[i % SENTENCES.length];

  // Create comment with arrow using the API
  const { comment, arrow } = createCommentWithArrow(
    nodePos.x, // Target (node) position X
    nodePos.y, // Target (node) position Y
    nodePos.x + 50, // Comment position X (offset by 50)
    nodePos.y - 70, // Comment position Y (offset by 70)
    sentence, // Comment text
    {
      commentStyle: {
        width: 150,
        style: {
          strokeColor: "#2c3e50",
          background: "#ecf0f1",
          fontSize: 12,
          iconColor: "#3498db"
        }
      },
      arrowStyle: {
        strokeColor: "#3498db",
        head: "arrow"
      }
    }
  );

  console.log(comment, arrow);

  // Add both to the control
  control.add(comment);
  control.add(arrow);

  createdComments++;

  // Update progress every 50 comments
  if (createdComments % 50 === 0) {
    document.getElementById("comment-count")!.textContent =
      createdComments.toString();
    // Allow UI to update
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

document.getElementById("comment-count")!.textContent = N.toString();

const commentEndTime = performance.now();
const commentCreationTime = (
  (commentEndTime - commentStartTime) /
  1000
).toFixed(2);

console.log(`Comment creation time: ${commentCreationTime}s`);
console.log(
  `Average time per comment: ${((commentEndTime - commentStartTime) / N).toFixed(2)}ms`
);

// Center view
document.getElementById("status")!.textContent = "Centering view...";
await ogma.view.locateGraph();

const endTime = performance.now();
const loadTime = ((endTime - startTime) / 1000).toFixed(2);

document.getElementById("load-time")!.textContent = `${loadTime}s`;
document.getElementById("status")!.textContent = "Ready";

// FPS counter
let frameCount = 0;
let lastTime = performance.now();

function updateFPS() {
  frameCount++;
  const currentTime = performance.now();

  if (currentTime >= lastTime + 1000) {
    const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
    document.getElementById("fps")!.textContent = fps.toString();
    frameCount = 0;
    lastTime = currentTime;
  }

  requestAnimationFrame(updateFPS);
}

updateFPS();

// Log performance metrics
console.log("=== Performance Test Results ===");
console.log(`Nodes: ${N}`);
console.log(`Comments: ${N}`);
console.log(`Total Load Time: ${loadTime}s`);
console.log(`Comment Creation Time: ${commentCreationTime}s`);
console.log(
  `Average time per comment: ${((commentEndTime - commentStartTime) / N).toFixed(2)}ms`
);
console.log("================================");
