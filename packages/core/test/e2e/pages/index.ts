import { Ogma } from "@linkurious/ogma";
import { AugmentedWindow } from "./types.ts";
import { Control, createArrow, createPolygon, createText } from "../../../src";
declare global {
  // eslint-disable-next-line
  interface Window extends AugmentedWindow {
    ogma: Ogma;
  }
}

// Same defaults `AnnotationToolbar` bakes in (see
// src/ui/AnnotationToolbar.ts:drawingButton) - the ones the main demo
// (web/main.ts, driven through AnnotationToolbar) actually draws with, so
// annotations created in e2e tests look like the real product instead of
// bare unstyled defaults when watched headful (E2E_HEADFUL=1).
const demoStyles = {
  arrow: {
    strokeType: "plain",
    strokeColor: "#3A03CF",
    strokeWidth: 2,
    head: "arrow"
  },
  text: {
    font: "IBM Plex Sans",
    fontSize: 24,
    color: "#3A03CF",
    background: "#EDE6FF",
    borderRadius: 8,
    padding: 12
  },
  box: {
    background: "#EDE6FF",
    borderRadius: 8,
    padding: 12
  },
  polygon: {
    strokeColor: "#3A03CF",
    strokeWidth: 2,
    background: "rgba(58, 3, 207, 0.15)"
  },
  comment: {
    commentStyle: {
      content: "",
      style: {
        color: "#3A03CF",
        background: "#EDE6FF",
        fontSize: 16,
        font: "IBM Plex Sans"
      }
    },
    arrowStyle: {
      style: {
        strokeType: "plain",
        strokeColor: "#3A03CF",
        strokeWidth: 2,
        head: "halo-dot"
      }
    }
  }
} as const;
function createOgma(options = {}) {
  const ogma = new Ogma({
    container: "graph-container",
    ...options
  });
  window.ogma = ogma;
  return ogma;
}

function createEditor() {
  const editor = new Control(window.ogma);
  window.editor = editor;
  return editor;
}
window.Ogma = Ogma;
window.Control = Control;
window.createOgma = createOgma;
window.createArrow = createArrow;
window.createPolygon = createPolygon;
window.createText = createText;
window.createEditor = createEditor;
window.demoStyles = demoStyles;
