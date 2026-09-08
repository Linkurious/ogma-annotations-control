import { prepareWithSegments, layoutWithLines } from "@chenglou/pretext";
import { renderBox } from "./box";
import { TEXT_LINE_HEIGHT } from "../../constants";
import { AnnotationState } from "../../store";
import { AuthorLineStyle, Box, Text, defaultTextStyle } from "../../types";
import {
  brighten,
  createSVGElement,
  getBoxCenter,
  getEffectiveFontSize,
  getTextSize
} from "../../utils/utils";
import {
  createMarkdownLinkPattern,
  createUrlPattern,
  escapeRegExp,
  ANNOTATION_LINK_CLASS
} from "../../utils/rendering";

export function renderText(
  root: SVGElement,
  annotation: Text,
  cachedElement: SVGGElement | undefined,
  state: AnnotationState
) {
  const { width, height } = getTextSize(annotation);

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

  drawContent(annotation, g, x, y, state);

  // get the SVG transform matrix to rotate the box around its center:
  // When fixedSize is true, apply invZoom to maintain constant screen size
  g.setAttribute(
    "transform",
    state.getScreenAlignedTransform(position.x, position.y, !fixedSize)
  );
  root.appendChild(g);
  return g;
}


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

/** Built-in fallback for the author line when neither the annotation's own
 * `style.authorStyle` nor the global `ControllerOptions.authorStyle` sets a
 * field. Smaller, muted, and bold-off relative to the content so it reads
 * as a signature line rather than a second paragraph. */
export const DEFAULT_AUTHOR_STYLE: Required<AuthorLineStyle> = {
  font: "sans-serif",
  fontSize: 12,
  color: "#8a8a8a",
  fontWeight: "normal"
};

/** Resolves the author line's effective style, field by field: per-annotation
 * override wins, then the editor-wide default, then the built-in fallback -
 * so a host that sets only a global `color` still gets the built-in
 * `fontSize` rather than losing it to a whole-object fallback. */
function resolveAuthorStyle(
  perAnnotation: Partial<AuthorLineStyle> | undefined,
  global: Partial<AuthorLineStyle> | undefined
): Required<AuthorLineStyle> {
  return {
    font: perAnnotation?.font ?? global?.font ?? DEFAULT_AUTHOR_STYLE.font,
    fontSize:
      perAnnotation?.fontSize ?? global?.fontSize ?? DEFAULT_AUTHOR_STYLE.fontSize,
    color: perAnnotation?.color ?? global?.color ?? DEFAULT_AUTHOR_STYLE.color,
    fontWeight:
      perAnnotation?.fontWeight ?? global?.fontWeight ?? DEFAULT_AUTHOR_STYLE.fontWeight
  };
}

/** One markdown link found by `extractMarkdownLinks`: `token` is what
 * stands in for it in the text handed to pretext's layout (see below),
 * `href` is what it should actually link to. */
interface ExtractedLink {
  token: string;
  href: string;
}

/**
 * Finds every markdown-style `[label](url)` link in `text` and replaces it
 * with just its label - *before* word-wrap/truncation ever runs, not after.
 * A label can contain spaces, and pretext's line-breaking treats spaces as
 * break points; matching links back out of already-wrapped text (one
 * regex pass per visual line) would then find a label split across two
 * lines exactly as often as a real multi-word label wraps, which is often.
 *
 * A label's internal spaces are replaced with U+00A0 (a non-breaking
 * "glue" character to pretext's line-breaker - see its `analysis.ts`) so
 * the whole label is carried through wrapping as a single unit: it either
 * fits on the current line whole or moves to the next line whole, the same
 * atomic-token treatment a bare URL already gets for free from having no
 * spaces at all. `appendLineWithLinks` below matches these tokens back out
 * of each wrapped line by their exact (escaped) text.
 */
function extractMarkdownLinks(text: string): {
  measureText: string;
  links: ExtractedLink[];
} {
  const links: ExtractedLink[] = [];
  const pattern = createMarkdownLinkPattern();
  let lastIndex = 0;
  let measureText = "";
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    measureText += text.slice(lastIndex, match.index);
    const [, label, href] = match;
    const token = label.replace(/\s+/g, " ");
    links.push({ token, href });
    measureText += token;
    lastIndex = match.index + match[0].length;
  }
  measureText += text.slice(lastIndex);

  return { measureText, links };
}

/** Splits `text` - already the post-`extractMarkdownLinks` measure text, so
 * any markdown link in it is just its (glued) label, not the raw syntax -
 * on links, and appends the pieces to `tspan` as plain text nodes
 * interleaved with real SVG `<a>` elements. Matches `mdLinks`' exact
 * tokens first (rendered as their label, glue character restored to a
 * plain space), then falls back to autolinking any remaining bare URL.
 * Shared by content lines and the author line so link-rendering has one
 * implementation. */
function appendLineWithLinks(
  tspan: SVGTSpanElement,
  text: string,
  mdLinks: ExtractedLink[]
): void {
  const hrefByToken = new Map(mdLinks.map((link) => [link.token, link.href]));
  const alternatives = mdLinks.map((link) => escapeRegExp(link.token));
  alternatives.push(createUrlPattern().source);
  const linkPattern = new RegExp(alternatives.join("|"), "g");

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tspan.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
    }
    const mdHref = hrefByToken.get(match[0]);
    const href = mdHref ?? match[0];
    const label = mdHref !== undefined ? match[0].replace(/ /g, " ") : match[0];
    const a = document.createElementNS("http://www.w3.org/2000/svg", "a");
    a.setAttribute("href", href);
    a.setAttribute("target", "_blank");
    a.setAttribute("rel", "noopener noreferrer");
    a.setAttribute("class", ANNOTATION_LINK_CLASS);
    a.textContent = label;
    tspan.appendChild(a);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    tspan.appendChild(document.createTextNode(text.slice(lastIndex)));
  }
}

/** Truncates `text` (already run through `extractMarkdownLinks`) to
 * whatever fits `maxWidth` on a single visual line, appending "…" when it
 * doesn't fit whole. Reuses the same `@chenglou/pretext` layout already
 * trusted for content wrapping/overflow below, with a tall lineHeight cap
 * so it never wraps to a second row.
 *
 * In the rare case this cuts a still-glued markdown-link token in half,
 * the leftover half no longer matches any `mdLinks` token exactly, so
 * `appendLineWithLinks` just renders it as plain (glued-looking) text
 * instead of a link - a cosmetic edge case, not a crash. */
function truncateToOneLine(text: string, fontString: string, maxWidth: number): string {
  const prepared = prepareWithSegments(text, fontString, {
    whiteSpace: "pre-wrap",
    wordBreak: "normal"
  });
  const { lines } = layoutWithLines(prepared, maxWidth, 1e6);
  if (lines.length === 0) return "";
  if (lines.length === 1) return lines[0].text;
  return lines[0].text.trimEnd() + "…";
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
  y: number = 0,
  state?: AnnotationState
) {
  // make sure text does not overflow
  const { width, height } = getTextSize(annotation);
  const {
    fontSize = defaultTextStyle.fontSize,
    font = defaultTextStyle.font,
    padding = 0,
    fontScale,
    fontWeight
  } = annotation.properties.style || {};

  if (width === height && width === 0) return;

  const effectiveFontSize = getEffectiveFontSize(fontSize, fontScale);

  // Use 1.2 line-height for better readability (20% more than font size)
  const lineHeight = effectiveFontSize * TEXT_LINE_HEIGHT;
  // "bold " prefix folded into the CSS font shorthand so both pretext's
  // measurement/wrap (which reads this exact string) and firstLineDy()'s
  // metrics cache (keyed on it below) account for bold's wider glyphs -
  // a plain `font-weight` SVG attribute wouldn't reach either of those.
  const fontString = `${fontWeight === "bold" ? "bold " : ""}${effectiveFontSize}px ${font}`.replace(/(px)+/g, "px");
  const maxWidth = width - padding * 2;

  // Author line (if shown) reserves fixed space at the bottom of the box -
  // computed before maxHeight so content wrapping already accounts for it.
  // Fixed one-line height regardless of content length; box never grows to
  // fit it (ellipsis-truncated instead, see below).
  const authorText = annotation.properties.author?.trim();
  const showAuthorLine = annotation.properties.style?.showAuthor === true && !!authorText;
  const resolvedAuthorStyle = showAuthorLine
    ? resolveAuthorStyle(annotation.properties.style?.authorStyle, state?.options.authorStyle)
    : null;
  const authorFontSize = resolvedAuthorStyle
    ? getEffectiveFontSize(resolvedAuthorStyle.fontSize, undefined)
    : 0;
  const authorLineHeight = resolvedAuthorStyle ? authorFontSize * TEXT_LINE_HEIGHT : 0;
  const AUTHOR_GAP = 4; // px, graph-space, between content and author line
  const authorReserved = showAuthorLine ? authorLineHeight + AUTHOR_GAP : 0;

  // Tiny box + author line can push this to <= 0; maxLineCount's own
  // Math.max(1, ...) floor below still guarantees content gets at least
  // one line, at the cost of overlapping the author line in that edge case.
  const maxHeight = height - padding - authorReserved;

  const content = annotation.properties.content || "";

  if (content.length > 0) {
    // Markdown links are substituted with their (glued) label before this
    // ever reaches pretext - see extractMarkdownLinks - so word-wrap can't
    // split a multi-word label across two lines.
    const { measureText, links } = extractMarkdownLinks(content);
    const prepared = prepareWithSegments(measureText, fontString, {
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
    textEl.setAttribute("font-size", `${effectiveFontSize}`);
    textEl.setAttribute("font-family", `${font}`);
    if (fontWeight === "bold") textEl.setAttribute("font-weight", "bold");
    textEl.setAttribute(
      "transform",
      `translate(${x + padding}, ${y + padding})`
    );

    const firstDy = firstLineDy(fontString, lineHeight);
    visibleLines.forEach((line, i) => {
      const tspan = createSVGElement<SVGTSpanElement>("tspan");
      tspan.setAttribute("x", "0");
      tspan.setAttribute("dy", `${i === 0 ? firstDy : lineHeight}`);
      appendLineWithLinks(tspan, line.text, links);
      textEl.appendChild(tspan);
    });

    parent.appendChild(textEl);
  }

  if (showAuthorLine && resolvedAuthorStyle) {
    const authorFontString =
      `${resolvedAuthorStyle.fontWeight === "bold" ? "bold " : ""}${authorFontSize}px ${resolvedAuthorStyle.font}`.replace(
        /(px)+/g,
        "px"
      );
    const maxAuthorWidth = width - padding * 2;
    const { measureText: authorMeasureText, links: authorLinks } =
      extractMarkdownLinks(authorText!);
    const truncatedAuthor = truncateToOneLine(
      authorMeasureText,
      authorFontString,
      maxAuthorWidth
    );

    const authorEl = createSVGElement<SVGTextElement>("text");
    authorEl.setAttribute("font-size", `${authorFontSize}`);
    authorEl.setAttribute("font-family", resolvedAuthorStyle.font);
    authorEl.setAttribute("fill", resolvedAuthorStyle.color);
    if (resolvedAuthorStyle.fontWeight === "bold") authorEl.setAttribute("font-weight", "bold");
    authorEl.classList.add("annotation-text-author");

    const authorTop = y + height - padding - authorLineHeight;
    authorEl.setAttribute("transform", `translate(${x + padding}, ${authorTop})`);

    const tspan = createSVGElement<SVGTSpanElement>("tspan");
    tspan.setAttribute("x", "0");
    tspan.setAttribute("dy", `${firstLineDy(authorFontString, authorLineHeight)}`);
    appendLineWithLinks(tspan, truncatedAuthor, authorLinks);
    authorEl.appendChild(tspan);

    parent.appendChild(authorEl);
  }
}
