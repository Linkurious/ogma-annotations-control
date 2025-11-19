/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/ban-ts-comment */

import Ogma, { RawNode } from "@linkurious/ogma";
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
    centerView: HTMLButtonElement;
    rotateCW: HTMLButtonElement;
    rotateCCW: HTMLButtonElement;
  };

  constructor() {
    this.ogma = new Ogma<ND, ED>({ container: "app" });

    //this.ogma.events.once = (e, h) => console.log("ogma.once", e, h); // Temporary fix for ogma typings
    this.control = new Control(this.ogma);

    // @ts-ignore
    window.ogma = this.ogma;

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
    const graph = await this.ogma.generate.flower({ depth: 3 });

    const nodesMap = graph.nodes.reduce(
      (acc, node, i) => {
        acc[node.id!] = node;
        node.id = `n${i}`;
        return acc;
      },
      {} as Record<string, RawNode>
    );

    graph.edges.forEach((edge) => {
      edge.source = nodesMap[edge.source].id!;
      edge.target = nodesMap[edge.target].id!;
    });

    await this.ogma.setGraph(graph);
    await this.ogma.layouts.force({ locate: true });
  }

  private setupEventListeners() {
    this.setupDrawingTools();
    this.setupHistoryControls();
    this.setupDeleteControl();
    this.setupExportControl();
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
      control: this.control
    });
  }
}

// Initialize the app
const app = new App();
await app.init();
