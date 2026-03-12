/**
 * Debug utilities for the playground
 *
 * Usage:
 *   import { createDebugTools } from "./debug";
 *   const debug = createDebugTools(ogma, control);
 *
 *   // Toggle with keyboard or console
 *   // Press 'D' to toggle comment debug visualization
 *   // Or call: debug.toggleCommentDebug()
 */

import type Ogma from "@linkurious/ogma";
import type { Control } from "../src";
import { isComment } from "../src";

export interface DebugTools {
  /** Toggle comment bounds visualization (center, bbox, anchor points) */
  toggleCommentDebug: () => void;
  /** Check if comment debug is currently enabled */
  isCommentDebugEnabled: () => boolean;
  /** Destroy all debug layers and cleanup */
  destroy: () => void;
}

export function createDebugTools(ogma: Ogma, control: Control): DebugTools {
  let commentDebugLayer: ReturnType<typeof ogma.layers.addCanvasLayer> | null =
    null;

  // Track event handlers for cleanup
  const eventHandlers: Array<() => void> = [];

  function renderCommentDebug(ctx: CanvasRenderingContext2D) {
    const zoom = ogma.view.getZoom();
    const { features } = control.getAnnotations();

    features.forEach((annotation) => {
      if (!isComment(annotation)) return;
      const comment = annotation;

      const [cx, cy] = comment.geometry.coordinates;
      const { width, height } = comment.properties;

      // Comments have fixedSize: true, so convert pixel dimensions to graph space
      const graphWidth = width / zoom;
      const graphHeight = height / zoom;

      ctx.save();

      // Draw center point (red dot)
      ctx.fillStyle = "red";
      ctx.beginPath();
      ctx.arc(cx, cy, 5 / zoom, 0, Math.PI * 2);
      ctx.fill();

      // Draw bounding box in graph space (red rectangle)
      ctx.strokeStyle = "red";
      ctx.lineWidth = 2 / zoom;
      ctx.setLineDash([5 / zoom, 5 / zoom]);
      ctx.strokeRect(
        cx - graphWidth / 2,
        cy - graphHeight / 2,
        graphWidth,
        graphHeight
      );
      ctx.setLineDash([]);

      // Draw arrow anchor point (bottom center) as blue dot
      ctx.fillStyle = "blue";
      ctx.beginPath();
      ctx.arc(cx, cy + graphHeight / 2, 5 / zoom, 0, Math.PI * 2);
      ctx.fill();

      // Draw text info
      ctx.fillStyle = "red";
      ctx.font = `${12 / zoom}px sans-serif`;
      ctx.fillText(
        `center: (${cx.toFixed(1)}, ${cy.toFixed(1)})`,
        cx + graphWidth / 2 + 10 / zoom,
        cy - graphHeight / 2
      );
      ctx.fillText(
        `size: ${width}x${height}px`,
        cx + graphWidth / 2 + 10 / zoom,
        cy - graphHeight / 2 + 15 / zoom
      );
      ctx.fillText(
        `graph: ${graphWidth.toFixed(1)}x${graphHeight.toFixed(1)}`,
        cx + graphWidth / 2 + 10 / zoom,
        cy - graphHeight / 2 + 30 / zoom
      );
      ctx.fillText(
        `zoom: ${zoom.toFixed(2)}`,
        cx + graphWidth / 2 + 10 / zoom,
        cy - graphHeight / 2 + 45 / zoom
      );

      ctx.restore();
    });
  }

  function toggleCommentDebug() {
    if (commentDebugLayer) {
      commentDebugLayer.destroy();
      commentDebugLayer = null;
      console.log("[debug] Comment visualization: OFF");
    } else {
      commentDebugLayer = ogma.layers.addCanvasLayer(renderCommentDebug);

      // Refresh on zoom/view changes and annotation updates
      const viewHandler = () => commentDebugLayer?.refresh();
      const updateHandler = () => commentDebugLayer?.refresh();

      ogma.events.on("viewChanged", viewHandler);
      control.on("update", updateHandler);

      // Track for cleanup
      eventHandlers.push(() => {
        ogma.events.off("viewChanged", viewHandler);
        control.off("update", updateHandler);
      });

      console.log("[debug] Comment visualization: ON");
    }
  }

  function isCommentDebugEnabled() {
    return commentDebugLayer !== null;
  }

  function destroy() {
    if (commentDebugLayer) {
      commentDebugLayer.destroy();
      commentDebugLayer = null;
    }
    eventHandlers.forEach((cleanup) => cleanup());
    eventHandlers.length = 0;
  }

  // Setup keyboard shortcut
  const keyHandler = (e: KeyboardEvent) => {
    if (e.key === "d" || e.key === "D") {
      toggleCommentDebug();
    }
  };
  document.addEventListener("keydown", keyHandler);
  eventHandlers.push(() => document.removeEventListener("keydown", keyHandler));

  console.log("[debug] Debug tools initialized. Press 'D' to toggle comment debug.");

  return {
    toggleCommentDebug,
    isCommentDebugEnabled,
    destroy
  };
}
