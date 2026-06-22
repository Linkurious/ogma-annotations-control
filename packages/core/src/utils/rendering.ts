/**
 * CSS class applied to every clickable URL anchor rendered inside text and
 * comment content. Single source of truth shared by the renderers (which add
 * it) and the interaction handlers (which detect it to let link clicks open
 * the URL instead of selecting/editing the annotation).
 */
export const ANNOTATION_LINK_CLASS = "ogma-annotation-link";

/**
 * Returns true if the given event target is, or is inside, an annotation link
 * anchor. Used by click/mousedown handlers to skip selection/edit when the
 * user clicked a URL.
 */
export function isAnnotationLinkTarget(target: EventTarget | null): boolean {
  let el = target as Element | null;
  while (el) {
    if (
      el.classList &&
      el.classList.contains(ANNOTATION_LINK_CLASS)
    )
      return true;
    el = el.parentElement;
  }
  return false;
}

/**
 * Source for the URL matcher used to autolink text/comment content.
 * Excludes whitespace and `<` so it never swallows a following HTML tag
 * when the match is injected into escaped HTML (comment renderer).
 */
const URL_REGEX_SOURCE = "(https?://[^\\s<]+)";

/**
 * Returns a fresh global RegExp for matching URLs. A new instance per call
 * avoids shared `lastIndex` state between the .exec() loop (text renderer)
 * and .replace() (comment renderer).
 */
export function createUrlPattern(): RegExp {
  return new RegExp(URL_REGEX_SOURCE, "g");
}

export function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  // Clamp radius to prevent it from being larger than half the width or height
  const maxRadius = Math.min(width / 2, height / 2);
  const r = Math.min(radius, maxRadius);

  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
