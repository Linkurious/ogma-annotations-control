/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/ban-ts-comment */

import { Ogma } from "@linkurious/ogma";
import { AnnotationPanel, AnnotationToolbar } from "@linkurious/ogma-annotations/ui";
import "@linkurious/ogma-annotations/ui/styles.css";
import {
  Control,
  AnnotationCollection,
  getAnnotationsBounds
} from "../src";

interface ND {}
interface ED {}

class App {
  private ogma: Ogma<ND, ED>;
  private control: Control;
  // @ts-expect-error Used for debugging
  private annotationPanel: AnnotationPanel | null = null;
  // @ts-expect-error Used for debugging
  private annotationToolbar: AnnotationToolbar | null = null;
  private buttons: {
    centerView: HTMLButtonElement;
    rotateCW: HTMLButtonElement;
    rotateCCW: HTMLButtonElement;
  };

  constructor() {
    this.ogma = new Ogma<ND, ED>({ container: "app" });
    this.ogma.tools.brand.set(
      `<div class="brand">
        <a href="../api/">
          <code>ogma-annotations</code>
        </a> | <a href="https://github.com/linkurious/ogma-annotations-control/tree/develop/packages/core/web/">code</a>
      </div>`,
      {
        position: "top-left",
        horizontalMargin: 10,
        verticalMargin: 10,
        className: "brand"
      }
    );

    //this.ogma.events.once = (e, h) => console.log("ogma.once", e, h); // Temporary fix for ogma typings
    this.control = new Control(this.ogma);

    this.buttons = {
      centerView: document.getElementById("center-view")! as HTMLButtonElement,
      rotateCW: document.getElementById("rotate-cw")! as HTMLButtonElement,
      rotateCCW: document.getElementById("rotate-ccw")! as HTMLButtonElement
    };
  }

  async init() {
    this.setupStyles();
    await this.setupGraph();
    await this.loadAnnotations();
    this.setupEventListeners();
    this.setupControlListeners();
    await this.fitView(0);
    this.exposeGlobals();
  }

  private setupStyles() {
    this.ogma.styles.addRule({
      nodeAttributes: {
        color: "#5B97F8"
      },
      edgeAttributes: {
        color: "#c9c9c9"
      }
    });
  }

  private async loadAnnotations() {
    const annotationsWithLinks: AnnotationCollection = await fetch(
      "annotations-test.json"
    ).then((response) => response.json());
    this.control.add(annotationsWithLinks);
    this.control.clearHistory();
  }

  private async setupGraph() {
    const graph = await Ogma.parse.jsonFromUrl<ND, ED>("graph.json");

    await this.ogma.setGraph(graph);
    this.fitView();
  }

  private setupEventListeners() {
    this.setupViewControls();
    this.setupKeyboardShortcuts();
    this.setupAnnotationPanel();
    this.setupAnnotationToolbar();
  }

  private setupControlListeners() {
    this.control.on("cancelDrawing", () => {
      console.log("cancelDrawing");
    });
  }

  /** Wires the JSON/SVG export popups; returns the two `AnnotationToolbar`
   * export callbacks that open them. */
  private setupExportPopups(): {
    handleJsonExport: () => void;
    handleSvgExport: () => void;
  } {
    const jsonPopup = document.getElementById("json-popup")!;
    const jsonPreview = document.getElementById("json-preview")!;
    const jsonCloseBtn = jsonPopup.querySelector(".popup-close")!;
    const jsonDownloadBtn = jsonPopup.querySelector(".popup-button")!;
    let jsonUrl = "";

    const closeJsonPopup = () => {
      jsonPopup.style.display = "none";
      jsonPreview.textContent = "";
    };
    jsonCloseBtn.addEventListener("click", closeJsonPopup);
    jsonPopup.addEventListener("click", (e) => {
      if (e.target === jsonPopup) closeJsonPopup();
    });
    jsonDownloadBtn.addEventListener("click", () => {
      if (!jsonUrl) return;
      const dl = document.createElement("a");
      document.body.appendChild(dl);
      dl.setAttribute("href", jsonUrl);
      dl.setAttribute("download", "annotations.json");
      dl.click();
      dl.remove();
    });

    const svgPopup = document.getElementById("svg-popup")!;
    const svgPreview = document.getElementById("svg-preview")!;
    const svgCloseBtn = svgPopup.querySelector(".popup-close")!;
    const svgDownloadBtn = svgPopup.querySelector(".popup-button")!;
    let currentSvg = "";

    const closeSvgPopup = () => {
      svgPopup.style.display = "none";
      svgPreview.innerHTML = "";
      currentSvg = "";
    };
    svgCloseBtn.addEventListener("click", closeSvgPopup);
    svgPopup.addEventListener("click", (e) => {
      if (e.target === svgPopup) closeSvgPopup();
    });
    svgDownloadBtn.addEventListener("click", () => {
      if (!currentSvg) return;
      const blob = new Blob([currentSvg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const dl = document.createElement("a");
      document.body.appendChild(dl);
      dl.setAttribute("href", url);
      dl.setAttribute("download", "graph-with-annotations.svg");
      dl.click();
      dl.remove();
      URL.revokeObjectURL(url);
    });

    return {
      handleJsonExport: () => {
        const annotations = this.control.getAnnotations();
        jsonUrl =
          "data:text/json;charset=utf-8," +
          encodeURIComponent(JSON.stringify(annotations, null, 2));
        jsonPreview.textContent = JSON.stringify(annotations, null, 2);
        jsonPopup.style.display = "flex";
      },
      handleSvgExport: async () => {
        try {
          const svg = await this.ogma.export.svg({ clip: true, download: false });
          currentSvg = svg;
          const blob = new Blob([svg], { type: "image/svg+xml" });
          const url = URL.createObjectURL(blob);
          svgPreview.innerHTML = `<img src="${url}" alt="Graph Export" />`;
          svgPopup.style.display = "flex";
        } catch (error) {
          console.error("Failed to export SVG:", error);
        }
      }
    };
  }

  private setupViewControls() {
    this.buttons.centerView.addEventListener("click", async () => {
      await this.fitView();
    });

    this.buttons.rotateCW.addEventListener("click", async () => {
      await this.ogma.view.rotate(-Math.PI / 8, { duration: 200 });
    });

    this.buttons.rotateCCW.addEventListener("click", async () => {
      await this.ogma.view.rotate(Math.PI / 8, { duration: 200 });
    });
  }

  private setupKeyboardShortcuts() {
    document.addEventListener("keydown", (evt) => {
      if (evt.key === "Escape") {
        console.log("draw arrow keydown Escape");
        this.control.cancelDrawing();
      } else if (evt.key === "Backspace" || evt.key === "Delete") {
        console.log("delete keydown", evt);
        this.control.remove(this.control.getSelectedAnnotations());
      }
    });

    document.addEventListener("keyup", (event) => {
      switch (event.key) {
        case "1":
          console.log("draw arrow keyup", event);
          break;
        case "0":
          this.fitView();
          break;
        default:
          break;
      }
    });
  }

  private async fitView(duration = 200) {
    const bounds = this.ogma.view.getGraphBoundingBox();
    await this.ogma.view.moveToBounds(
      bounds.extend(getAnnotationsBounds(this.control.getAnnotations())),
      { duration }
    );
  }

  private setupAnnotationPanel() {
    this.annotationPanel = new AnnotationPanel({
      control: this.control
    });
  }

  private setupAnnotationToolbar() {
    const { handleJsonExport, handleSvgExport } = this.setupExportPopups();
    this.annotationToolbar = new AnnotationToolbar({
      control: this.control,
      onJsonExport: handleJsonExport,
      onSvgExport: handleSvgExport
    });
  }

  private exposeGlobals() {
    Object.assign(window, {
      Ogma,
      Control,
      control: this.control,
      ogma: this.ogma
    });
  }
}

// Initialize the app
const app = new App();
await app.init();
