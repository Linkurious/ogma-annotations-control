import { renderText } from "./text";
import { COMMENT_MODE_COLLAPSED } from "../../constants";
import { AnnotationState } from "../../store";
import { Comment, Text, defaultCommentStyle } from "../../types";
import { createSVGElement, getBoxCenter } from "../../utils";

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
 * Reuses text rendering, then adds metadata
 */
function renderExpandedBox(
  root: SVGElement,
  g: SVGGElement,
  comment: Comment,
  state: AnnotationState
): SVGGElement {
  // Convert comment to text annotation for rendering
  const asText: Text = {
    ...comment,
    properties: {
      type: "text",
      content: comment.properties.content,
      width: comment.properties.width,
      height: comment.properties.height,
      style: {
        ...comment.properties.style,
        fixedSize: true // Comments always have fixed size
      }
    }
  };

  // Reuse text renderer to render the box and content
  const renderedG = renderText(root, asText, g, state);

  return renderedG;
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

  if (mode === COMMENT_MODE_COLLAPSED) {
    // Render as icon - create simple group
    let g = cachedElement;
    if (!g) {
      g = createSVGElement<SVGGElement>("g");
      g.setAttribute("data-annotation", `${annotation.id}`);
      g.setAttribute("data-annotation-type", "comment");
      g.classList.add("annotation-comment", "comment-collapsed");
    }

    renderCollapsedIcon(g, annotation);

    // Apply screen-aligned transform
    const position = getBoxCenter(annotation);
    g.setAttribute(
      "transform",
      state.getScreenAlignedTransform(position.x, position.y, false)
    );

    root.appendChild(g);
    return g;
  } else {
    // Render as text box - reuse text renderer and add metadata
    const g = renderExpandedBox(root, cachedElement!, annotation, state);
    g.setAttribute("data-annotation-type", "comment");
    g.classList.remove("annotation-text");
    g.classList.add("annotation-comment", "comment-expanded");
    return g;
  }
}
