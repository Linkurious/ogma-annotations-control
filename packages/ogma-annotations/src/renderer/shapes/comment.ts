import { AnnotationState } from "../../store";
import { Comment, CommentStyle, Id, defaultCommentStyle } from "../../types";
import { createSVGElement, getBoxCenter } from "../../utils";

/**
 * Create or reuse DOM elements for comment rendering
 */
function createCommentDom(
  elt: SVGGElement | undefined,
  id: Id,
  mode: "collapsed" | "expanded"
): SVGGElement {
  if (!elt) {
    elt = createSVGElement<SVGGElement>("g");
    elt.setAttribute("data-annotation", `${id}`);
    elt.setAttribute("data-annotation-type", "comment");
    elt.classList.add("annotation-comment");
  }

  // Update mode class
  elt.classList.remove("comment-collapsed", "comment-expanded");
  elt.classList.add(`comment-${mode}`);

  return elt;
}

/**
 * Render comment in collapsed mode (icon)
 */
function renderCollapsedIcon(g: SVGGElement, comment: Comment): void {
  const size = comment.properties.iconSize;
  const style = { ...defaultCommentStyle, ...comment.properties.style };
  const {
    iconColor = defaultCommentStyle.iconColor,
    iconSymbol = defaultCommentStyle.iconSymbol,
    iconBorderColor = defaultCommentStyle.iconBorderColor,
    iconBorderWidth = defaultCommentStyle.iconBorderWidth
  } = style;

  // Clear previous content
  g.innerHTML = "";

  // Create circle background
  const circle = createSVGElement<SVGCircleElement>("circle");
  circle.setAttribute("cx", "0");
  circle.setAttribute("cy", "0");
  circle.setAttribute("r", `${size / 2}`);
  circle.setAttribute("fill", iconColor!);

  if (iconBorderWidth && iconBorderWidth > 0) {
    circle.setAttribute("stroke", iconBorderColor || "#CCC");
    circle.setAttribute("stroke-width", `${iconBorderWidth}`);
  }

  g.appendChild(circle);

  // Create icon symbol (text/emoji)
  const text = createSVGElement<SVGTextElement>("text");
  text.setAttribute("x", "0");
  text.setAttribute("y", "0");
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("dominant-baseline", "central");
  text.setAttribute("font-size", `${size * 0.5}`);
  text.setAttribute("pointer-events", "none");
  text.textContent = iconSymbol!;

  g.appendChild(text);
}

/**
 * Render comment in expanded mode (text box)
 */
function renderExpandedBox(
  g: SVGGElement,
  comment: Comment,
  width: number,
  height: number
): void {
  const style: CommentStyle = {
    ...defaultCommentStyle,
    ...comment.properties.style
  };
  const {
    background = defaultCommentStyle.background,
    strokeColor = defaultCommentStyle.strokeColor,
    strokeWidth = defaultCommentStyle.strokeWidth,
    strokeType = defaultCommentStyle.strokeType,
    borderRadius = defaultCommentStyle.borderRadius,
    padding = defaultCommentStyle.padding
  } = style;

  // Clear previous content
  g.innerHTML = "";

  // Create background rectangle
  const rect = createSVGElement<SVGRectElement>("rect");
  const x = -width / 2;
  const y = -height / 2;

  rect.setAttribute("x", `${x}`);
  rect.setAttribute("y", `${y}`);
  rect.setAttribute("width", `${width}`);
  rect.setAttribute("height", `${height}`);
  rect.setAttribute("fill", background || "#FFFACD");

  if (borderRadius) {
    rect.setAttribute("rx", `${borderRadius}`);
    rect.setAttribute("ry", `${borderRadius}`);
  }

  if (strokeType && strokeType !== "none") {
    rect.setAttribute("stroke", strokeColor || "#DDD");
    rect.setAttribute("stroke-width", `${strokeWidth || 1}`);
    if (strokeType === "dashed") {
      rect.setAttribute("stroke-dasharray", "5,5");
    }
  }

  g.appendChild(rect);

  // Render text content
  if (comment.properties.content) {
    drawContent(comment, g, x, y, width, height, padding!, style);
  }

  // Optional: Render metadata (author, timestamp)
  if (comment.properties.author || comment.properties.timestamp) {
    drawMetadata(comment, g, x, y, width, height, style);
  }
}

/**
 * Draw text content inside the comment box
 */
function drawContent(
  comment: Comment,
  g: SVGGElement,
  x: number,
  y: number,
  width: number,
  height: number,
  padding: number,
  style: CommentStyle
): void {
  const contentWidth = width - padding * 2;
  const contentHeight = height - padding * 2;

  // Create foreignObject for text rendering
  const foreignObject = createSVGElement("foreignObject");
  foreignObject.setAttribute("x", `${x + padding}`);
  foreignObject.setAttribute("y", `${y + padding}`);
  foreignObject.setAttribute("width", `${contentWidth}`);
  foreignObject.setAttribute("height", `${contentHeight}`);

  const div = document.createElement("div");
  div.style.width = `${contentWidth}px`;
  div.style.height = `${contentHeight}px`;
  div.style.color = style.color!;
  div.style.fontFamily = style.font!;
  div.style.fontSize = `${style.fontSize}px`;
  div.style.overflow = "hidden";
  div.style.overflowWrap = "break-word";
  div.style.lineHeight = "1.4";
  div.textContent = comment.properties.content;

  foreignObject.appendChild(div);
  g.appendChild(foreignObject);
}

/**
 * Draw metadata (author, timestamp) at the bottom of the comment
 */
function drawMetadata(
  comment: Comment,
  g: SVGGElement,
  x: number,
  y: number,
  width: number,
  height: number,
  style: CommentStyle
): void {
  const {
    color = defaultCommentStyle.color,
    fontSize = defaultCommentStyle.fontSize
  } = style;
  const metadataY = y + height - 5; // 5px from bottom

  let metadataText = "";
  if (comment.properties.author) {
    metadataText += comment.properties.author;
  }
  if (comment.properties.timestamp) {
    if (metadataText) metadataText += " • ";
    metadataText += new Date(comment.properties.timestamp).toLocaleDateString();
  }

  if (metadataText) {
    const text = createSVGElement<SVGTextElement>("text");
    text.setAttribute("x", `${x + 8}`);
    text.setAttribute("y", `${metadataY}`);
    text.setAttribute("font-size", `${(fontSize as number) * 0.8}`);
    text.setAttribute("fill", color!);
    text.setAttribute("opacity", "0.6");
    text.setAttribute("pointer-events", "none");
    text.textContent = metadataText;
    g.appendChild(text);
  }
}

/**
 * Main render function for comments
 *
 * Renders a comment in either collapsed (icon) or expanded (text box) mode.
 * Comments are always rendered with fixed screen-space size (not scaled by zoom).
 */
export function renderComment(
  root: SVGElement,
  annotation: Comment,
  cachedElement: SVGGElement | undefined,
  state: AnnotationState
): SVGGElement {
  const mode = annotation.properties.mode;
  const g = createCommentDom(cachedElement, annotation.id, mode);

  const position = getBoxCenter(annotation);

  if (mode === "collapsed") {
    // Render as icon
    renderCollapsedIcon(g, annotation);
  } else {
    // Render as text box
    const width = annotation.properties.width;
    const height = annotation.properties.height;
    renderExpandedBox(g, annotation, width, height);
  }

  // Apply screen-aligned transform (always fixed size for comments)
  // Comments use fixedSize=true, so they don't scale with zoom
  g.setAttribute(
    "transform",
    state.getScreenAlignedTransform(position.x, position.y, false) // false = fixedSize
  );

  root.appendChild(g);
  return g;
}
