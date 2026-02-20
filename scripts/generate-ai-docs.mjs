#!/usr/bin/env node
/**
 * Generate AI-friendly documentation
 *
 * Creates separate focused markdown files:
 * - AI_REFERENCE_TYPESCRIPT.md - Core TypeScript API and usage
 * - AI_REFERENCE_REACT.md - React integration
 * - AI_REFERENCE_API.md - Full API reference (interfaces, types, functions)
 *
 * Usage: node scripts/generate-ai-docs.mjs
 */

import fs from "fs/promises";
import path from "path";

const DOCS_DIR = "docs";
const OUTPUT_DIR = "docs";
const PUBLIC_DIR = "docs/public"; // For static file serving

// File configurations
const FILES = {
  typescript: {
    output: "AI_REFERENCE_TYPESCRIPT.md",
    title: "Ogma Annotations - TypeScript Reference",
    description: "Core TypeScript API, usage patterns, and examples for @linkurious/ogma-annotations",
    sections: [
      {
        title: "Installation & Setup",
        files: ["typescript/installation.md"]
      },
      {
        title: "Controller",
        files: ["typescript/core-concepts/controller.md"]
      },
      {
        title: "Annotation Types",
        files: ["typescript/core-concepts/annotations.md"]
      },
      {
        title: "Creating Annotations Programmatically",
        files: ["typescript/creating-annotations/programmatic.md"]
      },
      {
        title: "Interactive Drawing",
        files: ["typescript/creating-annotations/interactive.md"]
      }
    ],
    quickRef: generateTypeScriptQuickRef
  },
  react: {
    output: "AI_REFERENCE_REACT.md",
    title: "Ogma Annotations - React Reference",
    description: "React integration with hooks, context provider, and component patterns",
    sections: [
      {
        title: "Installation & Setup",
        files: ["react/installation.md"]
      },
      {
        title: "AnnotationsContextProvider",
        files: ["react/core-concepts/provider.md"]
      },
      {
        title: "useAnnotationsContext Hook",
        files: ["react/core-concepts/hooks.md"]
      },
      {
        title: "Interactive Drawing in React",
        files: ["react/creating-annotations/interactive.md"]
      }
    ],
    quickRef: generateReactQuickRef
  },
  api: {
    output: "AI_REFERENCE_API.md",
    title: "Ogma Annotations - API Reference",
    description: "Complete API reference: Control class, interfaces, factory functions, types, and events",
    sections: [
      {
        title: "Control Class",
        files: ["typescript/api/classes/Control.md"]
      },
      {
        title: "Interfaces",
        subsections: [
          { title: "Arrow", files: ["typescript/api/interfaces/Arrow.md", "typescript/api/interfaces/ArrowProperties.md", "typescript/api/interfaces/ArrowStyles.md"] },
          { title: "Text", files: ["typescript/api/interfaces/Text.md", "typescript/api/interfaces/TextStyle.md"] },
          { title: "Box", files: ["typescript/api/interfaces/Box.md", "typescript/api/interfaces/BoxStyle.md", "typescript/api/interfaces/BoxProperties.md"] },
          { title: "Polygon", files: ["typescript/api/interfaces/Polygon.md", "typescript/api/interfaces/PolygonStyle.md", "typescript/api/interfaces/PolygonProperties.md"] },
          { title: "Comment", files: ["typescript/api/interfaces/Comment.md", "typescript/api/interfaces/CommentStyle.md", "typescript/api/interfaces/CommentProps.md"] },
          { title: "Other", files: ["typescript/api/interfaces/AnnotationCollection.md", "typescript/api/interfaces/Link.md"] }
        ]
      },
      {
        title: "Factory Functions",
        files: [
          "typescript/api/functions/createArrow.md",
          "typescript/api/functions/createText.md",
          "typescript/api/functions/createBox.md",
          "typescript/api/functions/createPolygon.md",
          "typescript/api/functions/createComment.md",
          "typescript/api/functions/createCommentWithArrow.md"
        ]
      },
      {
        title: "Type Guards",
        files: [
          "typescript/api/functions/isArrow.md",
          "typescript/api/functions/isText.md",
          "typescript/api/functions/isBox.md",
          "typescript/api/functions/isPolygon.md",
          "typescript/api/functions/isComment.md",
          "typescript/api/functions/isCommentArrow.md"
        ]
      },
      {
        title: "Utility Functions",
        files: [
          "typescript/api/functions/getAnnotationsBounds.md",
          "typescript/api/functions/getBbox.md",
          "typescript/api/functions/getArrowStart.md",
          "typescript/api/functions/getArrowEnd.md",
          "typescript/api/functions/setArrowStart.md",
          "typescript/api/functions/setArrowEnd.md"
        ]
      },
      {
        title: "Type Aliases",
        files: [
          "typescript/api/type-aliases/Annotation.md",
          "typescript/api/type-aliases/AnnotationType.md",
          "typescript/api/type-aliases/FeatureEvents.md",
          "typescript/api/type-aliases/ControllerOptions.md",
          "typescript/api/type-aliases/Side.md",
          "typescript/api/type-aliases/Extremity.md",
          "typescript/api/type-aliases/Color.md"
        ]
      },
      {
        title: "Default Styles",
        files: [
          "typescript/api/variables/defaultArrowStyle.md",
          "typescript/api/variables/defaultTextOptions.md",
          "typescript/api/variables/defaultBoxStyle.md",
          "typescript/api/variables/defaultPolygonStyle.md",
          "typescript/api/variables/defaultCommentStyle.md"
        ]
      },
      {
        title: "Event Constants",
        files: [
          "typescript/api/variables/EVT_ADD.md",
          "typescript/api/variables/EVT_REMOVE.md",
          "typescript/api/variables/EVT_UPDATE.md",
          "typescript/api/variables/EVT_SELECT.md",
          "typescript/api/variables/EVT_UNSELECT.md",
          "typescript/api/variables/EVT_HISTORY.md",
          "typescript/api/variables/EVT_COMPLETE_DRAWING.md",
          "typescript/api/variables/EVT_CANCEL_DRAWING.md"
        ]
      }
    ],
    quickRef: null
  }
};

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readFileContent(filePath) {
  const fullPath = path.join(DOCS_DIR, filePath);
  if (!(await fileExists(fullPath))) {
    console.warn(`    Warning: File not found: ${filePath}`);
    return null;
  }
  let content = await fs.readFile(fullPath, "utf-8");

  // Clean up VitePress-specific syntax
  content = content
    // Remove frontmatter
    .replace(/^---[\s\S]*?---\n*/m, "")
    // Remove VitePress containers but keep content
    .replace(/::: (tip|warning|danger|info|details).*?\n([\s\S]*?):::/gm, "$2")
    // Remove code-group markers
    .replace(/::: code-group\n/g, "")
    .replace(/:::\n/g, "")
    // Clean up excessive newlines
    .replace(/\n{4,}/g, "\n\n\n");

  return content.trim();
}

function generateHeader(config) {
  const date = new Date().toISOString().split("T")[0];
  return `# ${config.title}

> ${config.description}
> Auto-generated: ${date} | Version: 2.x

---

`;
}

async function processSection(section, level = 2) {
  let output = "";
  const hashes = "#".repeat(level);

  if (section.title) {
    output += `${hashes} ${section.title}\n\n`;
  }

  // Handle subsections
  if (section.subsections) {
    for (const subsection of section.subsections) {
      output += await processSection(subsection, level + 1);
    }
    return output;
  }

  // Process files
  if (section.files) {
    for (const file of section.files) {
      const content = await readFileContent(file);
      if (content) {
        output += content;
        output += "\n\n---\n\n";
      }
    }
  }

  return output;
}

async function generateFile(config) {
  console.log(`\nGenerating ${config.output}...`);

  let output = generateHeader(config);

  for (const section of config.sections) {
    console.log(`  Processing: ${section.title}`);
    output += await processSection(section);
  }

  // Add quick reference if available
  if (config.quickRef) {
    output += config.quickRef();
  }

  const outputPath = path.join(OUTPUT_DIR, config.output);
  await fs.writeFile(outputPath, output, "utf-8");

  const stats = await fs.stat(outputPath);
  const sizeKB = (stats.size / 1024).toFixed(1);
  const lineCount = output.split("\n").length;

  console.log(`  ✓ ${config.output} (${sizeKB} KB, ${lineCount} lines)`);
}

function generateTypeScriptQuickRef() {
  return `## Quick Reference

### Installation

\`\`\`bash
npm install @linkurious/ogma-annotations
\`\`\`

### Basic Setup

\`\`\`typescript
import Ogma from "@linkurious/ogma";
import { Control, createArrow, createText } from "@linkurious/ogma-annotations";
import "@linkurious/ogma-annotations/style.css";

const ogma = new Ogma({ container: "graph-container" });
const controller = new Control(ogma);
\`\`\`

### Interactive Drawing (Recommended)

\`\`\`typescript
// Arrow - click and drag
controller.enableArrowDrawing({ head: "arrow", strokeColor: "#3498db" });

// Text - click to place
controller.enableTextDrawing({ fontSize: 16, color: "#2c3e50" });

// Box - click and drag
controller.enableBoxDrawing({ background: "rgba(52,152,219,0.2)" });

// Polygon - click points, double-click to finish
controller.enablePolygonDrawing({ strokeColor: "#27ae60" });

// Comment - click target, auto-positions
controller.enableCommentDrawing({ commentStyle: { style: { background: "#FFFACD" } } });

// Cancel
controller.cancelDrawing();
\`\`\`

### Programmatic Creation

\`\`\`typescript
import { createArrow, createText, createBox, createPolygon, createCommentWithArrow } from "@linkurious/ogma-annotations";

const arrow = createArrow(0, 0, 100, 100, { head: "arrow", strokeColor: "#3498db" });
const text = createText(50, 50, 150, 40, "Label", { fontSize: 16 });
const box = createBox(0, 0, 200, 150, { background: "rgba(52,152,219,0.2)" });
const polygon = createPolygon([[[0,0], [100,0], [50,100], [0,0]]], { style: { strokeColor: "#27ae60" } });
const { comment, arrow: commentArrow } = createCommentWithArrow(100, 100, 250, 50, "Note", {});

controller.add(arrow);
controller.add(text);
\`\`\`

### History

\`\`\`typescript
controller.undo();
controller.redo();
controller.canUndo(); // boolean
controller.canRedo(); // boolean
controller.clearHistory();
\`\`\`

### Selection

\`\`\`typescript
controller.select(id);
controller.select([id1, id2]);
controller.unselect();
controller.getSelected();
controller.getSelectedAnnotations();
\`\`\`

### Events

\`\`\`typescript
controller.on("add", ({ annotation }) => {});
controller.on("remove", ({ annotation }) => {});
controller.on("update", ({ annotation }) => {});
controller.on("select", ({ annotation }) => {});
controller.on("unselect", ({ annotation }) => {});
controller.on("completeDrawing", ({ annotation }) => {});
controller.on("cancelDrawing", () => {});
controller.on("history", ({ canUndo, canRedo }) => {});
\`\`\`

### Persistence

\`\`\`typescript
// Save
localStorage.setItem("annotations", JSON.stringify(controller.getAnnotations()));

// Load
const saved = localStorage.getItem("annotations");
if (saved) controller.add(JSON.parse(saved));
\`\`\`

### Arrow Extremity Types

\`"none"\` | \`"arrow"\` | \`"arrow-plain"\` | \`"dot"\` | \`"halo-dot"\`

### Type Guards

\`\`\`typescript
import { isArrow, isText, isBox, isPolygon, isComment } from "@linkurious/ogma-annotations";
if (isArrow(annotation)) { /* Arrow */ }
\`\`\`

### Cleanup

\`\`\`typescript
controller.destroy();
ogma.destroy();
\`\`\`
`;
}

function generateReactQuickRef() {
  return `## Quick Reference

### Installation

\`\`\`bash
npm install @linkurious/ogma-annotations @linkurious/ogma-annotations-react
\`\`\`

### Basic Setup

\`\`\`tsx
import { Ogma } from "@linkurious/ogma-react";
import { AnnotationsContextProvider, useAnnotationsContext } from "@linkurious/ogma-annotations-react";
import "@linkurious/ogma-annotations/style.css";

function App() {
  return (
    <Ogma graph={graph}>
      <AnnotationsContextProvider>
        <Toolbar />
      </AnnotationsContextProvider>
    </Ogma>
  );
}
\`\`\`

### useAnnotationsContext Hook

\`\`\`tsx
function Toolbar() {
  const {
    editor,              // Control instance
    annotations,         // AnnotationCollection
    currentAnnotation,   // Selected | null
    arrowStyle, setArrowStyle,
    textStyle, setTextStyle,
    canUndo, canRedo, undo, redo,
    add, remove, select, cancelDrawing
  } = useAnnotationsContext();

  return (
    <div>
      <button onClick={() => editor.enableArrowDrawing({ head: "arrow" })}>Arrow</button>
      <button onClick={() => editor.enableTextDrawing()}>Text</button>
      <button onClick={() => editor.enableBoxDrawing()}>Box</button>
      <button onClick={undo} disabled={!canUndo}>Undo</button>
      <button onClick={redo} disabled={!canRedo}>Redo</button>
      <button
        onClick={() => remove(editor.getSelectedAnnotations())}
        disabled={!currentAnnotation}
      >
        Delete
      </button>
    </div>
  );
}
\`\`\`

### Style Updates (Auto-applied to Selection)

\`\`\`tsx
const { arrowStyle, setArrowStyle, textStyle, setTextStyle } = useAnnotationsContext();

// Changes automatically apply to selected annotation
setArrowStyle({ ...arrowStyle, strokeColor: "#ff0000" });
setTextStyle({ ...textStyle, fontSize: 18 });
\`\`\`

### Conditional Rendering by Type

\`\`\`tsx
import { isArrow, isText } from "@linkurious/ogma-annotations";

function StylePanel() {
  const { currentAnnotation } = useAnnotationsContext();

  if (!currentAnnotation) return null;
  if (isArrow(currentAnnotation)) return <ArrowStyleControls />;
  if (isText(currentAnnotation)) return <TextStyleControls />;
  return null;
}
\`\`\`

### Auto-Save Pattern

\`\`\`tsx
function AutoSave() {
  const { annotations } = useAnnotationsContext();

  useEffect(() => {
    localStorage.setItem("annotations", JSON.stringify(annotations));
  }, [annotations]);

  return null;
}
\`\`\`

### Load Initial Annotations

\`\`\`tsx
const [initialAnnotations, setInitialAnnotations] = useState(null);

useEffect(() => {
  const saved = localStorage.getItem("annotations");
  if (saved) setInitialAnnotations(JSON.parse(saved));
}, []);

if (!initialAnnotations) return <Loading />;

return (
  <AnnotationsContextProvider annotations={initialAnnotations}>
    <App />
  </AnnotationsContextProvider>
);
\`\`\`
`;
}

// Run
async function main() {
  console.log("Generating AI-friendly documentation...");

  // Remove old combined file if exists
  const oldFile = path.join(OUTPUT_DIR, "AI_REFERENCE.md");
  if (await fileExists(oldFile)) {
    await fs.unlink(oldFile);
    console.log("Removed old AI_REFERENCE.md");
  }

  for (const config of Object.values(FILES)) {
    await generateFile(config);
  }

  // Copy to public dir for static serving
  console.log("\nCopying to public directory...");
  await fs.mkdir(PUBLIC_DIR, { recursive: true });
  for (const config of Object.values(FILES)) {
    const src = path.join(OUTPUT_DIR, config.output);
    const dest = path.join(PUBLIC_DIR, config.output);
    await fs.copyFile(src, dest);
    console.log(`  Copied ${config.output}`);
  }

  console.log("\n✓ All files generated successfully!");
  console.log("\nAI Reference URLs (after deployment):");
  console.log("  https://linkurious.github.io/ogma-annotations-control/AI_REFERENCE_TYPESCRIPT.md");
  console.log("  https://linkurious.github.io/ogma-annotations-control/AI_REFERENCE_REACT.md");
  console.log("  https://linkurious.github.io/ogma-annotations-control/AI_REFERENCE_API.md");
  console.log("  https://linkurious.github.io/ogma-annotations-control/llms.txt");
}

main().catch(console.error);
