import type OgmaType from "@linkurious/ogma";
import { Control, createText, defaultTextStyle } from "../src";
import { ContextToolbars } from "../src/ui";
import "../src/ui/styles.css";
import { installBrand } from "./brand";
import "./style.css";

// Manual repro for the "sticky note toolbar dropdowns not clickable with
// Ogma 6.1" bug: Ogma 6.1 batches index-less overlays into a transformed
// `.ogma-overlay-group` wrapper, trapping the toolbar's z-index inside its
// own stacking context. `?ogma=5` / `?ogma=6` picks the Ogma build.
const which = new URLSearchParams(location.search).get("ogma") ?? "6";
const Ogma: typeof OgmaType = (which === "5"
  ? await import("@linkurious/ogma")
  : await import("ogma-6-1")
).default as unknown as typeof OgmaType;

const ogma = new Ogma({ container: "graph-container" });
installBrand(ogma);
const control = new Control(ogma);

control.add(
  createText(-260, -50, 220, 80, "Plain text", {
    ...defaultTextStyle,
    background: "#EDE6FF"
  })
);
control.add(
  createText(60, -50, 200, 200, "", {
    ...defaultTextStyle,
    scaleFontOnResize: true,
    placeholder: "Quick note…"
  })
);

await ogma.view.set({ x: 0, y: 0, zoom: 1 }, { duration: 0 });
const toolbar = new ContextToolbars({ control });

document.getElementById("version")!.textContent =
  `Ogma ${(Ogma as unknown as { version?: string }).version ?? which}`;
// Re-evaluated on every selection: is the toolbar anchor inside the batch wrapper?
const report = () =>
  setTimeout(() => {
    const anchor = document.querySelector(".annotation-style-toolbar-anchor");
    document.getElementById("batched")!.textContent = anchor
      ? anchor.closest(".ogma-overlay-group")
        ? "YES (bug: z-index trapped)"
        : "no (ok)"
      : "toolbar not open";
  }, 100);
control.on("select", report);
control.on("unselect", report);
report();

Object.assign(window, { ogma, control, toolbar });
