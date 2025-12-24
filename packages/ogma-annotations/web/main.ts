/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/ban-ts-comment */

import { Ogma } from "@linkurious/ogma";
import { Control, AnnotationCollection, getAnnotationsBounds } from "../src";

interface ND {}
interface ED {}

class App {
  private ogma: Ogma<ND, ED>;
  private control: Control;
  private buttons: {
    addArrow: HTMLButtonElement;
    addText: HTMLButtonElement;
    addBox: HTMLButtonElement;
    addPolygon: HTMLButtonElement;
    addComment: HTMLButtonElement;
    undo: HTMLButtonElement;
    redo: HTMLButtonElement;
    delete: HTMLButtonElement;
    export: HTMLButtonElement;
    exportSvg: HTMLButtonElement;
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
        </a> | <a href="https://github.com/linkurious/ogma-annotations-control/tree/develop/packages/ogma-annotations/web/">code</a>
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
      addArrow: document.getElementById("add-arrow")! as HTMLButtonElement,
      addText: document.getElementById("add-text")! as HTMLButtonElement,
      addBox: document.getElementById("add-box")! as HTMLButtonElement,
      addPolygon: document.getElementById("add-polygon")! as HTMLButtonElement,
      addComment: document.getElementById("add-comment")! as HTMLButtonElement,
      undo: document.getElementById("undo")! as HTMLButtonElement,
      redo: document.getElementById("redo")! as HTMLButtonElement,
      delete: document.getElementById("delete")! as HTMLButtonElement,
      export: document.getElementById("export")! as HTMLButtonElement,
      exportSvg: document.getElementById("export-svg")! as HTMLButtonElement,
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
    this.setupDrawingTools();
    this.setupHistoryControls();
    this.setupDeleteControl();
    this.setupExportControl();
    this.setupSvgExportControl();
    this.setupViewControls();
    this.setupKeyboardShortcuts();
  }

  private setupControlListeners() {
    this.control.on("history", () => this.updateUndoRedoButtons());
    this.updateUndoRedoButtons();

    this.control.on("select", (selection) => {
      this.buttons.delete.disabled = selection.ids.length === 0;
    });

    this.control.on("cancelDrawing", () => {
      console.log("cancelDrawing");
    });
  }

  private setupDrawingTools() {
    this.setupArrowTool();
    this.setupTextTool();
    this.setupBoxTool();
    this.setupPolygonTool();
    this.setupCommentTool();
  }

  private setupArrowTool() {
    this.buttons.addArrow.addEventListener("click", () => {
      if (this.buttons.addArrow.disabled) return;
      this.clearAllActiveButtons();
      this.buttons.addArrow.disabled = true;
      this.buttons.addArrow.classList.add("active");

      this.control.enableArrowDrawing({
        strokeType: "plain",
        strokeColor: "#3A03CF",
        strokeWidth: 2,
        head: "arrow"
      });

      const done = () => {
        this.buttons.addArrow.disabled = false;
        this.buttons.addArrow.classList.remove("active");
      };
      this.control.once("completeDrawing", done).once("cancelDrawing", done);
    });
  }

  private setupTextTool() {
    this.buttons.addText.addEventListener("click", () => {
      if (this.buttons.addText.disabled) return;
      this.clearAllActiveButtons();
      this.buttons.addText.disabled = true;
      this.buttons.addText.classList.add("active");

      this.control.enableTextDrawing({
        font: "IBM Plex Sans",
        fontSize: 24,
        color: "#3A03CF",
        background: "#EDE6FF",
        borderRadius: 8,
        padding: 12
      });

      const done = () => {
        this.buttons.addText.disabled = false;
        this.buttons.addText.classList.remove("active");
      };

      this.control.once("completeDrawing", done).once("cancelDrawing", done);
    });
  }

  private setupBoxTool() {
    this.buttons.addBox.addEventListener("click", () => {
      if (this.buttons.addBox.disabled) return;
      this.clearAllActiveButtons();
      this.buttons.addBox.disabled = true;
      this.buttons.addBox.classList.add("active");

      this.control.enableBoxDrawing({
        background: "#EDE6FF",
        borderRadius: 8,
        padding: 12
      });

      const done = () => {
        this.buttons.addBox.disabled = false;
        this.buttons.addBox.classList.remove("active");
      };
      this.control.once("completeDrawing", done).once("cancelDrawing", done);
    });
  }

  private setupPolygonTool() {
    this.buttons.addPolygon.addEventListener("click", () => {
      if (this.buttons.addPolygon.disabled) return;
      this.clearAllActiveButtons();
      this.buttons.addPolygon.disabled = true;
      this.buttons.addPolygon.classList.add("active");

      this.control.enablePolygonDrawing({
        strokeColor: "#3A03CF",
        strokeWidth: 2,
        background: "rgba(58, 3, 207, 0.15)"
      });

      const done = () => {
        this.buttons.addPolygon.disabled = false;
        this.buttons.addPolygon.classList.remove("active");
      };
      this.control.once("completeDrawing", done).once("cancelDrawing", done);
    });
  }

  private setupCommentTool() {
    this.buttons.addComment.addEventListener("click", () => {
      if (this.buttons.addComment.disabled) return;
      this.clearAllActiveButtons();
      this.buttons.addComment.disabled = true;
      this.buttons.addComment.classList.add("active");

      this.control.enableCommentDrawing({
        offsetX: 200,
        offsetY: -150,
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
      });

      const done = () => {
        this.buttons.addComment.disabled = false;
        this.buttons.addComment.classList.remove("active");
      };

      this.control.once("completeDrawing", done).once("cancelDrawing", done);
    });
  }

  private setupHistoryControls() {
    this.buttons.undo.addEventListener("click", () => {
      this.control.undo();
    });

    this.buttons.redo.addEventListener("click", () => {
      this.control.redo();
    });
  }

  private setupDeleteControl() {
    this.buttons.delete.addEventListener("click", () => {
      this.control.remove(this.control.getSelectedAnnotations());
    });
  }

  private setupExportControl() {
    this.buttons.export.addEventListener("click", () => {
      const annotations = this.control.getAnnotations();
      const dataStr =
        "data:text/json;charset=utf-8," +
        encodeURIComponent(JSON.stringify(annotations, null, 2));
      const dl = document.createElement("a")!;
      document.body.appendChild(dl);
      dl.setAttribute("href", dataStr);
      dl.setAttribute("download", "annotations.json");
      dl.click();
      dl.remove();

      console.log("Exported annotations:", annotations);
    });
  }

  private setupSvgExportControl() {
    const popup = document.getElementById("svg-popup")!;
    const svgPreview = document.getElementById("svg-preview")!;
    const closeBtn = document.getElementById("popup-close")!;
    const downloadBtn = document.getElementById("popup-download")!;

    let currentSvg = "";

    this.buttons.exportSvg.addEventListener("click", async () => {
      try {
        // Export SVG with clipping enabled, without auto-download
        const svg = await this.ogma.export.svg({ clip: true, download: false });
        currentSvg = svg;

        // Display SVG in popup
        svgPreview.innerHTML = svg;

        const svgElement = svgPreview.querySelector<SVGSVGElement>("svg")!;

        setSVGAttribute(svgElement, "preserveAspectRatio", "xMidYMid meet");
        setSVGAttribute(
          svgElement,
          "viewBox",
          "0 0 " +
            svgElement.getAttribute("width") +
            " " +
            svgElement.getAttribute("height")
        );
        svgElement.style.width = svgElement.getAttribute("width") + "px";
        svgElement.style.height = svgElement.getAttribute("height") + "px";

        popup.style.display = "flex";
      } catch (error) {
        console.error("Failed to export SVG:", error);
      }
    });

    // Close popup when clicking close button
    closeBtn.addEventListener("click", () => {
      popup.style.display = "none";
      svgPreview.innerHTML = "";
      currentSvg = "";
    });

    // Close popup when clicking backdrop
    popup.addEventListener("click", (e) => {
      if (e.target === popup) {
        popup.style.display = "none";
        svgPreview.innerHTML = "";
        currentSvg = "";
      }
    });

    // Download SVG when clicking download button
    downloadBtn.addEventListener("click", () => {
      if (currentSvg) {
        const blob = new Blob([currentSvg], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);
        const dl = document.createElement("a");
        document.body.appendChild(dl);
        dl.setAttribute("href", url);
        dl.setAttribute("download", "graph-with-annotations.svg");
        dl.click();
        dl.remove();
        URL.revokeObjectURL(url);

        console.log("Downloaded SVG");
      }
    });
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

  private clearAllActiveButtons() {
    [
      this.buttons.addArrow,
      this.buttons.addText,
      this.buttons.addBox,
      this.buttons.addPolygon
    ].forEach((btn) => {
      btn.disabled = false;
      btn.classList.remove("active");
    });
  }

  private updateUndoRedoButtons() {
    this.buttons.undo.disabled = !this.control.canUndo();
    this.buttons.redo.disabled = !this.control.canRedo();
  }

  private async fitView(duration = 200) {
    const bounds = this.ogma.view.getGraphBoundingBox();
    await this.ogma.view.moveToBounds(
      bounds.extend(getAnnotationsBounds(this.control.getAnnotations())),
      { duration }
    );
  }

  private exposeGlobals() {
    // @ts-ignore
    Object.assign(window, {
      Ogma,
      Control,
      control: this.control,
      ogma: this.ogma
    });
  }
}

function setSVGAttribute(element: SVGElement, name: string, value: string) {
  element.setAttributeNS("http://www.w3.org/2000/svg", name, value);
}

// Initialize the app
const app = new App();
await app.init();
