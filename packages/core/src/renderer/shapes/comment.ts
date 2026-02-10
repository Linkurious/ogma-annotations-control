import { COMMENT_MODE_COLLAPSED, TEXT_LINE_HEIGHT } from "../../constants";
import { AnnotationState } from "../../store";
import { Comment, defaultCommentStyle } from "../../types";
import { brighten, createSVGElement, getBoxCenter } from "../../utils/utils";

// Canvas context for measuring text
let measureContext: CanvasRenderingContext2D | null = null;

function getMeasureContext(): CanvasRenderingContext2D {
  if (!measureContext) {
    const canvas = document.createElement("canvas");
    measureContext = canvas.getContext("2d")!;
  }
  return measureContext;
}

/**
 * Check if content fits in a single line (no wrapping, no line breaks)
 */
export function isSingleLineContent(
  content: string,
  font: string,
  fontSize: number,
  maxWidth: number,
  padding: number
): boolean {
  if (!content || content.length === 0) return true;
  if (content.includes("\n")) return false;

  const ctx = getMeasureContext();
  ctx.font = `${fontSize}px ${font}`;
  const textWidth = ctx.measureText(content).width;
  const availableWidth = maxWidth - padding * 2;
  return textWidth <= availableWidth;
}

/**
 * Measure the width needed for text content
 * Returns the maximum width of all lines (natural width before wrapping)
 */
export function measureTextWidth(
  content: string,
  font: string,
  fontSize: number,
  maxWidth: number,
  padding: number
): number {
  if (!content || content.length === 0) {
    return 60; // Minimum width for empty content
  }

  const ctx = getMeasureContext();
  ctx.font = `${fontSize}px ${font}`;

  // Split by explicit line breaks and measure each line
  const lines = content.split("\n");
  let maxLineWidth = 0;

  for (const line of lines) {
    if (line.length === 0) continue;

    // For each line, we need to consider word wrapping
    // Measure words and simulate wrapping
    const words = line.split(/\s+/);
    let currentLineWidth = 0;
    const spaceWidth = ctx.measureText(" ").width;
    const availableWidth = maxWidth - padding * 2;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const wordWidth = ctx.measureText(word).width;

      if (currentLineWidth === 0) {
        currentLineWidth = wordWidth;
      } else if (currentLineWidth + spaceWidth + wordWidth <= availableWidth) {
        currentLineWidth += spaceWidth + wordWidth;
      } else {
        // Word wraps to next line
        maxLineWidth = Math.max(maxLineWidth, currentLineWidth);
        currentLineWidth = wordWidth;
      }
    }
    maxLineWidth = Math.max(maxLineWidth, currentLineWidth);
  }

  // Add padding and a small buffer
  const neededWidth = maxLineWidth + padding * 2 + 4;

  // Return the minimum of needed width and maxWidth
  return Math.min(neededWidth, maxWidth);
}

/**
 * Returns the comment-related CSS styles to embed in the SVG defs
 */
export function getCommentDefs(): SVGStyleElement {
  const style = createSVGElement<SVGStyleElement>("style");
  style.textContent = `
    /* Comment Animation Styles */
    .comment-icon {
      transition:
        opacity 0.25s ease-in-out,
        scale 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      will-change: scale, opacity;
    }

    .comment-box {
      transition:
        opacity 0.25s ease-in-out,
        scale 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      will-change: scale, opacity;
    }

    .comment-box rect,
    .comment-box foreignObject {
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* Disable transitions when comment was not visible */
    .comment-no-transition .comment-icon,
    .comment-no-transition .comment-box {
      transition: none;
    }

    /* Collapsed state: icon visible, box hidden */
    .comment-collapsed .comment-icon {
      opacity: 1;
      scale: 1;
    }

    .comment-collapsed .comment-box {
      opacity: 0;
      scale: 0.5;
    }

    /* Expanded state: box visible, icon hidden */
    .comment-expanded .comment-icon {
      opacity: 0;
      scale: 0.5;
    }

    .comment-expanded .comment-box {
      opacity: 1;
      scale: 1;
    }

    /* Comment scrollbar styling */
    .comment-box foreignObject div::-webkit-scrollbar {
      width: 6px;
    }

    .comment-box foreignObject div::-webkit-scrollbar-track {
      background: transparent;
    }

    .comment-box foreignObject div::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 3px;
    }

    .comment-box foreignObject div::-webkit-scrollbar-thumb:hover {
      background: rgba(0, 0, 0, 0.3);
    }

    /* Edit button on selected comment */
    .comment-edit-button {
      cursor: pointer;
      opacity: 0.8;
      transition: opacity 0.15s ease-in-out;
    }

    .comment-edit-button:hover {
      opacity: 1;
    }
  `;
  return style;
}

/**
 * Render or update the collapsed icon within its group
 */
function renderCollapsedIcon(
  iconGroup: SVGGElement,
  comment: Comment,
  state: AnnotationState
): void {
  const style = { ...defaultCommentStyle, ...comment.properties.style };
  const size = style.iconSize!;
  const {
    iconColor = defaultCommentStyle.iconColor,
    iconSymbol = defaultCommentStyle.iconSymbol,
    iconBorderColor = defaultCommentStyle.iconBorderColor,
    iconBorderWidth = defaultCommentStyle.iconBorderWidth
  } = style;

  // Find or create circle
  let circle = iconGroup.querySelector("circle") as SVGCircleElement;
  if (!circle) {
    circle = createSVGElement<SVGCircleElement>("circle");
    circle.setAttribute("cx", "0");
    circle.setAttribute("cy", "0");
    iconGroup.appendChild(circle);
  }

  // Update circle attributes
  circle.setAttribute("r", `${size / 2}`);
  if (state.hoveredFeature === comment.id) {
    circle.setAttribute("fill", brighten(iconColor!));
  } else {
    circle.setAttribute("fill", iconColor!);
  }

  if (iconBorderWidth && iconBorderWidth > 0) {
    circle.setAttribute("stroke", iconBorderColor || "#CCC");
    circle.setAttribute("stroke-width", `${iconBorderWidth}`);
  } else {
    circle.removeAttribute("stroke");
    circle.removeAttribute("stroke-width");
  }

  // Find or create text
  let text = iconGroup.querySelector("text") as SVGTextElement;
  if (!text) {
    text = createSVGElement<SVGTextElement>("text");
    text.setAttribute("x", "0");
    text.setAttribute("y", "0");
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "central");
    text.setAttribute("pointer-events", "none");
    iconGroup.appendChild(text);
  }

  // Update text attributes
  text.setAttribute("font-size", `${size * 0.5}`);
  text.textContent = iconSymbol!;
}

/**
 * Render or update the expanded box within its group
 * Supports:
 * - Shrinking width if text content is short
 * - MaxHeight with scrolling via foreignObject
 */
function renderExpandedBox(
  boxGroup: SVGGElement,
  comment: Comment,
  state: AnnotationState,
  extraWidth: number = 0,
  showEditBtn: boolean = false
): void {
  const style = { ...defaultCommentStyle, ...comment.properties.style };
  const {
    font = "Arial, sans-serif",
    fontSize = 12,
    padding = 8,
    background = "#FFFACD",
    color = "#333",
    borderRadius = 4,
    strokeColor = "#DDD",
    strokeWidth = 1,
    maxHeight
  } = style;

  const maxWidth = comment.properties.width;
  const content = comment.properties.content || "";
  const numericFontSize = typeof fontSize === "number" ? fontSize : parseFloat(fontSize);

  // Calculate actual width needed based on content (+ extra for inline button)
  // When selected, use full maxWidth; otherwise use content width
  const contentWidth = measureTextWidth(content, font, numericFontSize, maxWidth, padding);
  const isSelected = state.selectedFeatures.has(comment.id);
  const actualWidth = isSelected ? maxWidth : (contentWidth + extraWidth);

  // Calculate height
  const storedHeight = comment.properties.height;
  const singleLine = isSingleLineContent(content, font, numericFontSize, maxWidth, padding);
  const singleLineHeight = numericFontSize * TEXT_LINE_HEIGHT + padding * 2;
  const effectiveHeight = singleLine ? Math.min(storedHeight, singleLineHeight) : storedHeight;
  const cappedStoredHeight = maxHeight ? Math.min(storedHeight, maxHeight) : storedHeight;
  const displayHeight = maxHeight ? Math.min(effectiveHeight, maxHeight) : effectiveHeight;
  const needsScroll = !singleLine && maxHeight ? storedHeight > maxHeight : false;

  // Add extra height for edit button if shown (24px button + 4px margin)
  const buttonHeight = 0 ; //showEditBtn ? 28 : 0;
  const totalDisplayHeight = displayHeight + buttonHeight;

  // Clear existing content
  boxGroup.innerHTML = "";

  // Keep top edge aligned with the stored height center
  const x = -actualWidth / 2;
  const y = -cappedStoredHeight / 2;

  // Create background rect
  const rect = createSVGElement<SVGRectElement>("rect");
  rect.setAttribute("x", `${x}`);
  rect.setAttribute("y", `${y}`);
  rect.setAttribute("width", `${actualWidth}`);
  rect.setAttribute("height", `${totalDisplayHeight}`);
  rect.setAttribute("rx", `${borderRadius}`);
  rect.setAttribute("ry", `${borderRadius}`);
  rect.setAttribute("fill", state.hoveredFeature === comment.id ? brighten(background) : background);
  if (strokeWidth && strokeWidth > 0) {
    rect.setAttribute("stroke", strokeColor || "#DDD");
    rect.setAttribute("stroke-width", `${strokeWidth}`);
  }
  boxGroup.appendChild(rect);

  // Use foreignObject for text content (supports scrolling)
  const foreignObject = createSVGElement<SVGForeignObjectElement>("foreignObject");
  foreignObject.setAttribute("x", `${x}`);
  foreignObject.setAttribute("y", `${y}`);
  foreignObject.setAttribute("width", `${actualWidth}`);
  foreignObject.setAttribute("height", `${totalDisplayHeight}`);
  foreignObject.style.pointerEvents = "none"; // Let clicks pass through to rect

  // Create the HTML content div
  const div = document.createElement("div");
  div.style.width = "100%";
  div.style.height = "100%";
  div.style.padding = `${padding}px`;
  div.style.boxSizing = "border-box";
  div.style.fontFamily = font;
  div.style.fontSize = `${fontSize}px`;
  div.style.lineHeight = `${(typeof fontSize === "number" ? fontSize : parseFloat(fontSize)) * TEXT_LINE_HEIGHT}px`;
  div.style.color = color;
  div.style.overflowY = needsScroll ? "auto" : "hidden";
  div.style.overflowX = "hidden";
  div.style.overflowWrap = "break-word";
  div.style.whiteSpace = "pre-wrap";
  div.style.pointerEvents = "none"; // Let clicks pass through to rect
  div.style.display = "flex";
  div.style.flexDirection = "column";
  div.style.position = "relative";

  // Create text content container
  const textDiv = document.createElement("div");
  textDiv.style.flex = "1";
  textDiv.innerHTML = formatContent(content);
  div.appendChild(textDiv);

  // Add edit button if needed
  if (showEditBtn) {
    const buttonDiv = document.createElement("div");
    buttonDiv.classList.add("ogma-send-button");
    buttonDiv.style.pointerEvents = "auto";
    buttonDiv.innerHTML = state.options.editButtonIcon;
    div.appendChild(buttonDiv);
  }

  foreignObject.appendChild(div);
  boxGroup.appendChild(foreignObject);

  // Add drop shadow for comments
  boxGroup.setAttribute("filter", "url(#softShadow)");
}

/**
 * Format text content for HTML display
 * Handles line breaks and converts URLs to clickable links
 */
function formatContent(content: string): string {
  if (!content) return "";

  // Escape HTML
  let html = content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Convert URLs to links
  html = html.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" style="color: #38e; text-decoration: none;">$1</a>'
  );

  return html;
}

/**
 * Main render function for comments
 *
 * Renders both collapsed (icon) and expanded (text box) states simultaneously.
 * CSS transitions handle the animation between states.
 * Comments are always rendered with fixed screen-space size (not scaled by zoom).
 */
export function renderComment(
  root: SVGElement,
  annotation: Comment,
  cachedElement: SVGGElement | undefined,
  state: AnnotationState,
  wasVisible: boolean,
): SVGGElement {
  const mode = annotation.properties.mode;

  // Get or create the main container group
  let g = cachedElement;
  if (!g) {
    g = createSVGElement<SVGGElement>("g");
    g.setAttribute("data-annotation", `${annotation.id}`);
    g.setAttribute("data-annotation-type", "comment");
  }

  // Get or create icon group
  let iconGroup = g.querySelector(".comment-icon") as SVGGElement;
  if (!iconGroup) {
    iconGroup = createSVGElement<SVGGElement>("g");
    iconGroup.classList.add("comment-icon");
    g.appendChild(iconGroup);
  }

  // Get or create box group
  let boxGroup = g.querySelector(".comment-box") as SVGGElement;
  if (!boxGroup) {
    boxGroup = createSVGElement<SVGGElement>("g");
    boxGroup.classList.add("comment-box");
    g.appendChild(boxGroup);
  }

  // Determine if edit button will be shown
  const showEditBtn =
    mode !== COMMENT_MODE_COLLAPSED &&
    state.selectedFeatures.has(annotation.id) &&
    state.editingFeature !== annotation.id &&
    state.options.showEditButton;

  // Compute extra width for inline edit button on single-line comments
  let extraWidth = 0;
  if (showEditBtn) {
    const cStyle = { ...defaultCommentStyle, ...annotation.properties.style };
    const content = annotation.properties.content || "";
    const numFS = typeof cStyle.fontSize === "number" ? cStyle.fontSize : parseFloat((cStyle.fontSize || "12").toString());
    if (isSingleLineContent(content, cStyle.font || "Arial, sans-serif", numFS, annotation.properties.width, cStyle.padding || 8)) {
      extraWidth = 32; // buttonSize (24) + margins (4*2)
    }
  }

  // Render both states
  renderCollapsedIcon(iconGroup, annotation, state);
  renderExpandedBox(boxGroup, annotation, state, extraWidth, showEditBtn);

  // Disable transitions if the comment was not visible (e.g., just came into view)
  if (!wasVisible) {
    g.classList.add("comment-no-transition");
  } else {
    g.classList.remove("comment-no-transition");
  }

  // Update the mode class to trigger CSS transitions
  if (
    mode === COMMENT_MODE_COLLAPSED &&
    !g.classList.contains("comment-collapsed")
  ) {
    g.classList.add("comment-collapsed");
    g.classList.remove("comment-expanded");
  } else if (
    mode !== COMMENT_MODE_COLLAPSED &&
    g.classList.contains("comment-collapsed")
  ) {
    g.classList.add("comment-expanded");
    g.classList.remove("comment-collapsed");
  }


  // Apply screen-aligned transform to the container
  const position = getBoxCenter(annotation);
  g.setAttribute(
    "transform",
    state.getScreenAlignedTransform(position.x, position.y, false)
  );

  // Hide the entire SVG group while the textarea editor is active
  g.style.visibility = state.editingFeature === annotation.id ? "hidden" : "";

  // Append to root if not already present
  if (!g.parentNode || g.parentNode !== root) {
    root.appendChild(g);
  }

  return g;
}
