/**
 * Closed-form 2D metaball "wasp-waist" connector between two circles — the
 * algorithm behind paper.js's meta-balls example
 * (https://paperjs.org/examples/meta-balls/): a smooth blended curve
 * between two circles, computed directly from their centers/radii (no
 * scalar field, no grid, no marching squares), so it's cheap enough to
 * recompute for every member pair on every region reshape.
 *
 * Used by {@link Regions} as the model for how a tracked polygon reshapes
 * itself around its member nodes whenever they move (drag or layout) —
 * replacing the old straight bridging-corridor approach, which produced
 * ugly straight "tunnels" when several members jumped far at once (e.g.
 * after a layout re-run).
 */

export interface MetaballCircle {
  x: number;
  y: number;
  r: number;
}

type Point = { x: number; y: number };

/**
 * Returns a sampled polygon ring (closed: first point repeated at the end)
 * tracing the blended silhouette of `c1` and `c2`, or `undefined` if
 * they're too far apart to connect (`d > r1 + r2 + maxGap`) or one fully
 * contains the other (`d <= |r1-r2|`).
 *
 * @param spread balance of the blend, 0..1 — 0 hugs the circles tightly
 *   (barely any waist), 1 pulls the connector's sides out to the tangent
 *   lines between the circles (maximal spread).
 * @param handleSize Bezier handle length multiplier controlling how
 *   rounded vs. pinched the waist looks.
 * @param maxGap world-units budget for the *extra* distance beyond
 *   touching (`d - r1 - r2`) two circles may still have and connect. Pass
 *   `Infinity` to always connect regardless of distance.
 * @param segments sample points per curve/arc leg of the connector.
 */
export function buildMetaballConnector(
  c1: MetaballCircle,
  c2: MetaballCircle,
  spread: number,
  handleSize: number,
  maxGap: number,
  segments: number
): number[][] | undefined {
  const dx = c2.x - c1.x;
  const dy = c2.y - c1.y;
  const d = Math.hypot(dx, dy);
  const { r: r1 } = c1;
  const { r: r2 } = c2;
  if (d === 0) return undefined;
  if (d > r1 + r2 + maxGap || d <= Math.abs(r1 - r2)) return undefined;

  let u1 = 0;
  let u2 = 0;
  if (d < r1 + r2) {
    u1 = Math.acos((r1 * r1 + d * d - r2 * r2) / (2 * r1 * d));
    u2 = Math.acos((r2 * r2 + d * d - r1 * r1) / (2 * r2 * d));
  }

  const centerAngle = Math.atan2(dy, dx);
  const maxSpread = Math.acos((r1 - r2) / d);

  const angle1 = centerAngle + u1 + (maxSpread - u1) * spread;
  const angle2 = centerAngle - u1 - (maxSpread - u1) * spread;
  const angle3 = centerAngle + Math.PI - u2 - (Math.PI - u2 - maxSpread) * spread;
  const angle4 = centerAngle - Math.PI + u2 + (Math.PI - u2 - maxSpread) * spread;

  const vec = (cx: number, cy: number, angle: number, r: number): Point => ({
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle)
  });

  const p1 = vec(c1.x, c1.y, angle1, r1);
  const p2 = vec(c1.x, c1.y, angle2, r1);
  const p3 = vec(c2.x, c2.y, angle3, r2);
  const p4 = vec(c2.x, c2.y, angle4, r2);

  const totalR = r1 + r2;
  const d2 =
    Math.min(spread * handleSize, dist(p1, p3) / totalR) * Math.min(1, d / totalR);
  const r1h = r1 * d2;
  const r2h = r2 * d2;
  const pi2 = Math.PI / 2;

  const h1 = vec(0, 0, angle1 - pi2, r1h);
  const h2 = vec(0, 0, angle2 + pi2, r1h);
  const h3 = vec(0, 0, angle3 + pi2, r2h);
  const h4 = vec(0, 0, angle4 - pi2, r2h);

  const pts: number[][] = [];
  // p1 -> p3 (cubic, handles h1/h3)
  sampleCubic(p1, add(p1, h1), add(p3, h3), p3, segments, pts);
  // p3 -> p4 along circle c2's far side (away from c1)
  sampleArc(c2, r2, angle3, angle4, segments, pts);
  // p4 -> p2 (cubic, handles h4/h2)
  sampleCubic(p4, add(p4, h4), add(p2, h2), p2, segments, pts);
  // p2 -> p1 along circle c1's far side (away from c2)
  sampleArc(c1, r1, angle2, angle1, segments, pts);
  return pts;
}

function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
function add(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

function sampleCubic(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  segments: number,
  out: number[][]
): void {
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const mt = 1 - t;
    const x =
      mt * mt * mt * p0.x +
      3 * mt * mt * t * p1.x +
      3 * mt * t * t * p2.x +
      t * t * t * p3.x;
    const y =
      mt * mt * mt * p0.y +
      3 * mt * mt * t * p1.y +
      3 * mt * t * t * p2.y +
      t * t * t * p3.y;
    out.push([x, y]);
  }
}

/** Arc walking the *long* way round from `from` to `to` (through the side
 *  facing away from the other circle) — that's the part of each circle
 *  that stays part of the blended silhouette. */
function sampleArc(
  c: Point,
  r: number,
  from: number,
  to: number,
  segments: number,
  out: number[][]
): void {
  let delta = to - from;
  while (delta <= -Math.PI) delta += Math.PI * 2;
  while (delta > Math.PI) delta -= Math.PI * 2;
  const longDelta = delta > 0 ? delta - Math.PI * 2 : delta + Math.PI * 2;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const a = from + longDelta * t;
    out.push([c.x + r * Math.cos(a), c.y + r * Math.sin(a)]);
  }
}
