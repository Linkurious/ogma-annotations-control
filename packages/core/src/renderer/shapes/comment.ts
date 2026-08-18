import { COMMENT_MODE_COLLAPSED, TEXT_LINE_HEIGHT } from "../../constants";
import { AnnotationState } from "../../store";
import { Comment, defaultCommentStyle } from "../../types";
import {
  bringToTop,
  brighten,
  createSVGElement,
  getBoxCenter
} from "../../utils/utils";
import {
  createUrlPattern,
  ANNOTATION_LINK_CLASS
} from "../../utils/rendering";

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

  // Find or create rectangle
  let rect = iconGroup.querySelector("rect") as SVGRectElement;
  if (!rect) {
    rect = createSVGElement<SVGRectElement>("rect");
    rect.setAttribute("x", `${-size / 2}`);
    rect.setAttribute("y", `${-size / 2}`);
    rect.setAttribute("rx", `${style.borderRadius}`);
    rect.setAttribute("ry", `${style.borderRadius}`);
    iconGroup.appendChild(rect);
  }

  // Update rectangle attributes
  rect.setAttribute("width", `${size}`);
  rect.setAttribute("height", `${size}`);
  if (state.hoveredFeature === comment.id) {
    rect.setAttribute("fill", brighten(iconColor!));
  } else {
    rect.setAttribute("fill", iconColor!);
  }

  if (iconBorderWidth && iconBorderWidth > 0) {
    rect.setAttribute("stroke", iconBorderColor || "#CCC");
    rect.setAttribute("stroke-width", `${iconBorderWidth}`);
  } else {
    rect.removeAttribute("stroke");
    rect.removeAttribute("stroke-width");
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

  // Always use the stored dimensions so the box never changes size on
  // selection or edit — keeps the SVG and the textarea overlay in sync.
  const actualWidth = comment.properties.width;
  const storedHeight = comment.properties.height;
  const displayHeight = maxHeight
    ? Math.min(storedHeight, maxHeight)
    : storedHeight;
  const needsScroll = maxHeight ? storedHeight > maxHeight : false;
  const content = comment.properties.content || "";

  // Clear existing content
  boxGroup.innerHTML = "";

  // Center the box at (0,0) to align with the collapsed icon
  const x = -actualWidth / 2;
  const y = -displayHeight / 2;

  // Create background rect
  const rect = createSVGElement<SVGRectElement>("rect");
  rect.setAttribute("x", `${x}`);
  rect.setAttribute("y", `${y}`);
  rect.setAttribute("width", `${actualWidth}`);
  rect.setAttribute("height", `${displayHeight}`);
  rect.setAttribute("rx", `${borderRadius}`);
  rect.setAttribute("ry", `${borderRadius}`);
  rect.setAttribute(
    "fill",
    state.hoveredFeature === comment.id ? brighten(background) : background
  );
  if (strokeWidth && strokeWidth > 0) {
    rect.setAttribute("stroke", strokeColor || "#DDD");
    rect.setAttribute("stroke-width", `${strokeWidth}`);
  }
  boxGroup.appendChild(rect);

  // Use foreignObject for text content (supports scrolling)
  const foreignObject =
    createSVGElement<SVGForeignObjectElement>("foreignObject");
  foreignObject.setAttribute("x", `${x}`);
  foreignObject.setAttribute("y", `${y}`);
  foreignObject.setAttribute("width", `${actualWidth}`);
  foreignObject.setAttribute("height", `${displayHeight}`);
  foreignObject.style.pointerEvents = "none"; // Let clicks pass through to rect

  // Create the HTML content div
  const div = document.createElement("div");
  div.style.width = "100%";
  div.style.height = "100%";
  div.style.padding = `${padding}px`;
  div.style.boxSizing = "border-box";
  div.style.fontFamily = font;
  div.style.fontSize = `${typeof fontSize === "number" ? fontSize : parseFloat(fontSize)}px`;
  div.style.lineHeight = `${(typeof fontSize === "number" ? fontSize : parseFloat(fontSize)) * TEXT_LINE_HEIGHT}px`;
  div.style.color = color;
  div.style.overflowY = needsScroll ? "auto" : "hidden";
  div.style.overflowX = "hidden";
  div.style.overflowWrap = "break-word";
  div.style.whiteSpace = "pre-wrap";
  div.style.pointerEvents = "none"; // Let clicks pass through to rect

  div.innerHTML = formatContent(content);
  foreignObject.appendChild(div);
  boxGroup.appendChild(foreignObject);

  // Edit button: a corner badge that sits inside the bottom-right of the
  // box without adding to its dimensions. Clicking it triggers the same
  // onClick path that opens the textarea editor.
  if (showEditBtn) {
    const btnSize = 24;
    const btnMargin = 4;
    const fo = createSVGElement<SVGForeignObjectElement>("foreignObject");
    fo.setAttribute("x", `${x + actualWidth - btnSize - btnMargin}`);
    fo.setAttribute("y", `${y + displayHeight - btnSize - btnMargin}`);
    fo.setAttribute("width", `${btnSize}`);
    fo.setAttribute("height", `${btnSize}`);

    const btnDiv = document.createElement("div");
    btnDiv.classList.add("ogma-send-button");
    btnDiv.style.width = "100%";
    btnDiv.style.height = "100%";
    btnDiv.style.display = "flex";
    btnDiv.style.alignItems = "center";
    btnDiv.style.justifyContent = "center";
    btnDiv.style.boxSizing = "border-box";
    btnDiv.style.background = background;
    btnDiv.style.border = `1px solid ${strokeColor || "#DDD"}`;
    btnDiv.style.borderRadius = "4px";
    btnDiv.style.pointerEvents = "auto";

    const iconSpan = document.createElement("span");
    iconSpan.classList.add("ogma-send-button-icon");
    iconSpan.innerHTML = state.options.editButtonIcon;
    btnDiv.appendChild(iconSpan);
    fo.appendChild(btnDiv);
    boxGroup.appendChild(fo);
  }

  // Add drop shadow for comments (if enabled)
  if (style.shadow !== false) {
    boxGroup.setAttribute("filter", "url(#softShadow)");
  } else {
    boxGroup.removeAttribute("filter");
  }
}

/**
 * Format text content for HTML display
 * Handles line breaks and converts URLs to clickable links
 */
export function formatContent(content: string): string {
  if (!content) return "";

  // Escape HTML
  let html = content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Convert URLs to clickable links. The .ogma-annotation-link class colors
  // the anchor (themeable via --annotation-link-color) and re-enables
  // pointer-events so links are clickable even though the content div is
  // pointer-events:none (which lets background clicks open the editor).
  html = html.replace(
    createUrlPattern(),
    `<a href="$1" class="${ANNOTATION_LINK_CLASS}" target="_blank" rel="noopener noreferrer">$1</a>`
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
  wasVisible: boolean
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

  // Render both states
  renderCollapsedIcon(iconGroup, annotation, state);
  renderExpandedBox(boxGroup, annotation, state, showEditBtn);

  // Disable transitions if the comment was not visible (e.g., just came into view)
  if (!wasVisible) {
    g.classList.add("comment-no-transition");
  } else {
    g.classList.remove("comment-no-transition");
  }

  // Update the mode class to trigger CSS transitions
  if (mode === COMMENT_MODE_COLLAPSED) {
    g.classList.add("comment-collapsed");
    g.classList.remove("comment-expanded");
  } else {
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

  // Bring to top: always for a brand-new element (first insertion), and
  // whenever this comment is selected, so a freshly created comment -
  // auto-selected right after creation - lands above any pre-existing
  // comment it overlaps instead of staying wherever it first happened to be
  // inserted relative to them.
  if (!g.parentNode || g.parentNode !== root || state.selectedFeatures.has(annotation.id)) {
    bringToTop(root, g);
  }

  return g;
}
