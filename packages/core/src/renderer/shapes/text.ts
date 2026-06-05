import { prepareWithSegments, layoutWithLines } from "@chenglou/pretext";
import { renderBox } from "./box";
import { TEXT_LINE_HEIGHT } from "../../constants";
import { AnnotationState } from "../../store";
import { Box, Text, defaultTextStyle } from "../../types";
import {
  brighten,
  createSVGElement,
  getBoxCenter,
  getTextSize
} from "../../utils/utils";

export function renderText(
  root: SVGElement,
  annotation: Text,
  cachedElement: SVGGElement | undefined,
  state: AnnotationState
) {
  const { width, height } = getTextSize(annotation);

  // TODO: edited element is rendered in DOM
  //if (id === this.selectedId) continue;

  const {
    color = defaultTextStyle.color,
    strokeColor = defaultTextStyle.strokeColor,
    strokeWidth = defaultTextStyle.strokeWidth,
    strokeType = defaultTextStyle.strokeType,
    background = defaultTextStyle.background,
    borderRadius = defaultTextStyle.borderRadius,
    fixedSize = defaultTextStyle.fixedSize
  } = annotation.properties.style || defaultTextStyle;

  const g = renderBox(root, annotation as unknown as Box, cachedElement, state);
  g.setAttribute("data-annotation-type", annotation.properties.type);
  g.classList.add("annotation-text");
  g.setAttribute("fill", `${color}`);

  let child = g.firstChild;
  while (child) {
    const next = child.nextSibling;
    if (child.nodeType === 1 && (child as Element).tagName !== "rect") {
      g.removeChild(child);
    }
    child = next;
  }
  // rect is used for background and stroke
  let rect = g.firstChild as SVGRectElement;
  if (!rect) {
    rect = createSVGElement<SVGRectElement>("rect");
    g.appendChild(rect);
  }

  // we use the center of the box as the rotation point
  const x = -width / 2;
  const y = -height / 2;

  if (borderRadius) {
    rect.setAttribute("rx", `${borderRadius}`);
    rect.setAttribute("ry", `${borderRadius}`);
  }

  if (strokeType && strokeType !== "none") {
    rect.setAttribute("stroke", strokeColor || "black");
    rect.setAttribute("stroke-width", `${strokeWidth}`);
    if (strokeType === "dashed") rect.setAttribute("stroke-dasharray", `5,5`);
  }

  if (background && background.length) {
    if (state.hoveredFeature === annotation.id) {
      rect.setAttribute("fill", brighten(background));
    } else {
      rect.setAttribute("fill", background);
    }
  }

  rect.setAttribute("width", `${width}`);
  rect.setAttribute("height", `${height}`);
  const position = getBoxCenter(annotation);
  rect.setAttribute("x", `${x}`);
  rect.setAttribute("y", `${y}`);

  drawContent(annotation, g, x, y);

  // get the SVG transform matrix to rotate the box around its center:
  // When fixedSize is true, apply invZoom to maintain constant screen size
  g.setAttribute(
    "transform",
    state.getScreenAlignedTransform(position.x, position.y, !fixedSize)
  );
  root.appendChild(g);
  return g;
}

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

let _measureCtx: CanvasRenderingContext2D | null = null;
const _baselineCache = new Map<string, number>();

/**
 * dy for the first SVG tspan so the baseline matches exactly where CSS puts it.
 *
 * Primary: inject a 1×1 inline-block with vertical-align:baseline into a
 * font-styled div. The block's bottom edge lands on the CSS alphabetic
 * baseline, so (probeBottom - outerTop) is the exact firstLineDy we need.
 * This beats any Canvas metric because it uses the browser's own layout engine.
 *
 * Fallback (jsdom / SSR): canvas fontBoundingBox metrics.
 */
function firstLineDy(fontString: string, lineHeight: number): number {
  const key = `${fontString}|${lineHeight}`;
  const cached = _baselineCache.get(key);
  if (cached != null) return cached;

  try {
    const outer = document.createElement("div");
    const probe = document.createElement("span");
    outer.style.cssText = `font:${fontString};line-height:${lineHeight}px;position:fixed;left:-9999px;top:0;margin:0;padding:0;visibility:hidden;`;
    probe.style.cssText = "display:inline-block;width:1px;height:1px;vertical-align:baseline;";
    outer.appendChild(probe);
    document.body.appendChild(outer);
    const dy = probe.getBoundingClientRect().bottom - outer.getBoundingClientRect().top;
    document.body.removeChild(outer);
    if (dy > 0 && dy <= lineHeight) {
      _baselineCache.set(key, dy);
      return dy;
    }
  } catch { /* non-browser env */ }

  // Canvas fallback
  try {
    if (!_measureCtx)
      _measureCtx = document.createElement("canvas").getContext("2d");
    if (_measureCtx) {
      _measureCtx.font = fontString;
      const m = _measureCtx.measureText("M") as TextMetrics & {
        fontBoundingBoxAscent?: number;
        fontBoundingBoxDescent?: number;
      };
      const a = m.fontBoundingBoxAscent, d = m.fontBoundingBoxDescent;
      if (a != null && d != null)
        return Math.max(0, (lineHeight - a - d) / 2) + a;
    }
  } catch { /* ignore */ }

  return lineHeight;
}

/**
 * @function draw
 * @param annotation the annotation to draw
 * @param g the group in which the text should be drawn
 */
function drawContent(
  annotation: Text,
  parent: SVGGElement,
  x: number = 0,
  y: number = 0
) {
  // make sure text does not overflow
  const { width, height } = getTextSize(annotation);
  const {
    fontSize = defaultTextStyle.fontSize,
    font = defaultTextStyle.font,
    padding = 0
  } = annotation.properties.style || {};

  if (width === height && width === 0) return;

  // Use 1.2 line-height for better readability (20% more than font size)
  const lineHeight = parseFloat(fontSize!.toString()) * TEXT_LINE_HEIGHT;
  const fontString = `${fontSize}px ${font}`.replace(/(px)+/g, "px");
  const maxWidth = width - padding * 2;
  const maxHeight = height - padding;

  const content = annotation.properties.content || "";
  if (content.length === 0) return;

  const prepared = prepareWithSegments(content, fontString, {
    whiteSpace: "pre-wrap",
    wordBreak: "normal"
  });
  const { lines } = layoutWithLines(prepared, maxWidth, lineHeight);

  const maxLineCount = Math.max(1, Math.floor(maxHeight / lineHeight));
  const visibleLines = lines.slice(0, maxLineCount);

  if (lines.length > maxLineCount && visibleLines.length > 0) {
    const last = visibleLines[visibleLines.length - 1];
    visibleLines[visibleLines.length - 1] = {
      ...last,
      text: last.text.trimEnd() + "…"
    };
  }

  const textEl = createSVGElement<SVGTextElement>("text");
  textEl.setAttribute(
    "font-size",
    `${parseFloat(fontSize!.toString())}`
  );
  textEl.setAttribute("font-family", `${font}`);
  textEl.setAttribute(
    "transform",
    `translate(${x + padding}, ${y + padding})`
  );

  const firstDy = firstLineDy(fontString, lineHeight);
  visibleLines.forEach((line, i) => {
    const tspan = createSVGElement<SVGTSpanElement>("tspan");
    tspan.setAttribute("x", "0");
    tspan.setAttribute("dy", `${i === 0 ? firstDy : lineHeight}`);

    let lastIndex = 0;
    let match: RegExpExecArray | null;
    URL_PATTERN.lastIndex = 0;

    while ((match = URL_PATTERN.exec(line.text)) !== null) {
      if (match.index > lastIndex) {
        tspan.appendChild(
          document.createTextNode(line.text.slice(lastIndex, match.index))
        );
      }
      const a = document.createElementNS("http://www.w3.org/2000/svg", "a");
      a.setAttribute("href", match[0]);
      a.setAttribute("target", "_blank");
      a.textContent = match[0];
      tspan.appendChild(a);
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < line.text.length) {
      tspan.appendChild(
        document.createTextNode(line.text.slice(lastIndex))
      );
    }

    textEl.appendChild(tspan);
  });

  parent.appendChild(textEl);
}
