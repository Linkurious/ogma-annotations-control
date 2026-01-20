import { renderText } from "./text";
import { COMMENT_MODE_COLLAPSED } from "../../constants";
import { AnnotationState } from "../../store";
import { Comment, Text, defaultCommentStyle } from "../../types";
import { brighten, createSVGElement, getBoxCenter } from "../../utils/utils";

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
 * Reuses text rendering logic
 */
function renderExpandedBox(
  boxGroup: SVGGElement,
  comment: Comment,
  state: AnnotationState
): void {
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

  // Create a temporary container for text rendering
  const tempContainer = createSVGElement<SVGGElement>("g");

  // Reuse text renderer to render the box and content
  const renderedG = renderText(tempContainer, asText, undefined, state);

  // Clear and populate the boxGroup with the rendered content
  boxGroup.innerHTML = "";
  while (renderedG.firstChild) {
    boxGroup.appendChild(renderedG.firstChild);
  }

  // Add drop shadow for comments
  boxGroup.setAttribute("filter", "url(#softShadow)");
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

  // Render both states
  renderCollapsedIcon(iconGroup, annotation, state);
  renderExpandedBox(boxGroup, annotation, state);

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

  // Append to root if not already present
  if (!g.parentNode || g.parentNode !== root) {
    root.appendChild(g);
  }

  return g;
}
