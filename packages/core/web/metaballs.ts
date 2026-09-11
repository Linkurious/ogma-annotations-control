/**
 * Standalone visual spike for #134 — metaball-style connectors as a
 * replacement for `Regions._buildCorridor`'s straight bridging quad.
 *
 * Bug being investigated: after a layout re-run, tracked region members can
 * land far from the polygon's current ring in one jump. Each one
 * independently triggers a thin straight corridor (`_buildCorridor` in
 * `handlers/regions.ts`) welding it back in — with several members jumping
 * at once this reads as a bundle of ugly straight "tunnels" radiating out
 * from the shape.
 *
 * This page renders the same scenario with paper.js-style metaball
 * connectors (https://paperjs.org/examples/meta-balls/) instead: a smooth
 * wasp-waist curve between two circles, closed-form (no grid / marching
 * squares), cheap enough to recompute for every member pair on layoutEnd.
 * Toggle "show old straight corridor" to see the bug being reproduced
 * side by side with the metaball connector.
 *
 * Not wired into Regions yet — this is geometry math validation only, run
 * via `npm run dev` (vite) and opening /metaballs.html.
 */

interface Ball {
  x: number;
  y: number;
  r: number;
}

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

const spreadInput = document.getElementById("spread") as HTMLInputElement;
const handleInput = document.getElementById("handle") as HTMLInputElement;
const threshInput = document.getElementById("thresh") as HTMLInputElement;
const spreadVal = document.getElementById("spreadVal")!;
const handleVal = document.getElementById("handleVal")!;
const threshVal = document.getElementById("threshVal")!;
const toggleOld = document.getElementById("toggleOld") as HTMLInputElement;
const toggleBlob = document.getElementById("toggleBlob") as HTMLInputElement;

spreadInput.value = "0.5";
handleInput.value = "2.4";
threshInput.value = "2.5";

let balls: Ball[] = [];

function resetBalls() {
  const cx = canvas.width / 2 / devicePixelRatio;
  const cy = canvas.height / 2 / devicePixelRatio;
  balls = [
    { x: cx - 90, y: cy - 20, r: 28 },
    { x: cx - 20, y: cy + 30, r: 24 },
    { x: cx + 60, y: cy - 10, r: 32 },
    { x: cx + 10, y: cy - 80, r: 20 },
    { x: cx + 10, y: cy - 100, r: 60 },
    { x: cx - 50, y: cy + 70, r: 36 }
  ];
}

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", () => {
  resize();
});
resize();
resetBalls();

// --- metaball connector (paper.js "meta-balls" example algorithm) ---
// Returns a sampled polyline tracing the wasp-waist blend between two
// circles, or null if they're too far apart / one fully contains the other
// (same cutoff paper.js uses: d > r1 + r2 * 2.5, or d <= |r1 - r2|).
function metaballConnector(
  c1: Ball,
  c2: Ball,
  spread: number,
  handleSize: number,
  threshMul: number,
  segments = 16
): number[][] | null {
  const dx = c2.x - c1.x;
  const dy = c2.y - c1.y;
  const d = Math.hypot(dx, dy);
  const { r: r1 } = c1;
  const { r: r2 } = c2;
  if (d === 0) return null;
  if (d > (r1 + r2) * threshMul || d <= Math.abs(r1 - r2)) return null;

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

  const vec = (cx: number, cy: number, angle: number, r: number) => ({
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle)
  });

  const p1 = vec(c1.x, c1.y, angle1, r1);
  const p2 = vec(c1.x, c1.y, angle2, r1);
  const p3 = vec(c2.x, c2.y, angle3, r2);
  const p4 = vec(c2.x, c2.y, angle4, r2);

  const totalR = r1 + r2;
  const d2 = Math.min(spread * handleSize, dist(p1, p3) / totalR) * Math.min(1, d / totalR);
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
  // p3 -> p4 along circle c2 (short way through angle3..angle4 across the
  // far side, i.e. the arc NOT facing c1)
  sampleArc(c2, r2, angle3, angle4, segments, pts);
  // p4 -> p2 (cubic, handles h4/h2)
  sampleCubic(p4, add(p4, h4), add(p2, h2), p2, segments, pts);
  // p2 -> p1 along circle c1, far side
  sampleArc(c1, r1, angle2, angle1, segments, pts);
  return pts;
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
function add(a: { x: number; y: number }, b: { x: number; y: number }) {
  return { x: a.x + b.x, y: a.y + b.y };
}
function sampleCubic(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  segments: number,
  out: number[][]
) {
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
// Arc that goes the *long* way round (through PI from `from`), i.e. the
// outer side of the circle away from the other ball — that's the part of
// each circle that stays part of the blob silhouette.
function sampleArc(
  c: { x: number; y: number },
  r: number,
  from: number,
  to: number,
  segments: number,
  out: number[][]
) {
  let a0 = from;
  let a1 = to;
  // walk from a0 to a1 the way that passes through a0+PI (outer side)
  let delta = a1 - a0;
  while (delta <= -Math.PI) delta += Math.PI * 2;
  while (delta > Math.PI) delta -= Math.PI * 2;
  // that's the *short* way; we want the long way round instead
  const longDelta = delta > 0 ? delta - Math.PI * 2 : delta + Math.PI * 2;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const a = a0 + longDelta * t;
    out.push([c.x + r * Math.cos(a), c.y + r * Math.sin(a)]);
  }
}

// --- old straight-corridor reproduction (mirrors Regions._buildCorridor) ---
function straightCorridor(a: Ball, b: Ball, halfWidth = 4): number[][] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const overshoot = halfWidth * 1.5;
  const sx = a.x - ux * overshoot;
  const sy = a.y - uy * overshoot;
  const ex = b.x + ux * overshoot;
  const ey = b.y + uy * overshoot;
  const px = -uy * halfWidth;
  const py = ux * halfWidth;
  return [
    [sx + px, sy + py],
    [ex + px, ey + py],
    [ex - px, ey - py],
    [sx - px, sy - py]
  ];
}

// --- interaction: drag balls ---
let dragIndex = -1;
canvas.addEventListener("pointerdown", (e) => {
  const { x, y } = toCanvas(e);
  dragIndex = balls.findIndex((b) => Math.hypot(b.x - x, b.y - y) <= b.r);
  if (dragIndex >= 0) canvas.style.cursor = "grabbing";
});
canvas.addEventListener("pointermove", (e) => {
  if (dragIndex < 0) return;
  const { x, y } = toCanvas(e);
  balls[dragIndex].x = x;
  balls[dragIndex].y = y;
});
window.addEventListener("pointerup", () => {
  dragIndex = -1;
  canvas.style.cursor = "grab";
});
function toCanvas(e: PointerEvent) {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

document.getElementById("btnReset")!.addEventListener("click", resetBalls);
document.getElementById("btnAdd")!.addEventListener("click", () => {
  const cx = canvas.width / 2 / devicePixelRatio;
  const cy = canvas.height / 2 / devicePixelRatio;
  balls.push({
    x: cx + (Math.random() - 0.5) * 200,
    y: cy + (Math.random() - 0.5) * 200,
    r: 16 + Math.random() * 20
  });
});
// Reproduces the bug scenario: a layout re-run scattering tracked members
// to unrelated corners of the canvas in one jump.
document.getElementById("btnScatter")!.addEventListener("click", () => {
  const w = canvas.width / devicePixelRatio;
  const h = canvas.height / devicePixelRatio;
  balls.forEach((b) => {
    b.x = 60 + Math.random() * (w - 120);
    b.y = 60 + Math.random() * (h - 120);
  });
});

function draw() {
  const w = canvas.width / devicePixelRatio;
  const h = canvas.height / devicePixelRatio;
  ctx.clearRect(0, 0, w, h);

  const spread = parseFloat(spreadInput.value);
  const handleSize = parseFloat(handleInput.value);
  const threshMul = parseFloat(threshInput.value);
  spreadVal.textContent = spread.toFixed(2);
  handleVal.textContent = handleSize.toFixed(2);
  threshVal.textContent = threshMul.toFixed(2);

  // old straight-corridor reproduction, drawn first (so the blob draws over
  // it when both are toggled on)
  if (toggleOld.checked) {
    ctx.fillStyle = "rgba(220, 70, 70, 0.55)";
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i];
        const b = balls[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        // old code only bridges when the *ring* doesn't already contain the
        // node; approximate that here as "circles don't overlap"
        if (d > a.r + b.r) {
          const quad = straightCorridor(a, b);
          ctx.beginPath();
          quad.forEach(([x, y], k) => (k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
          ctx.closePath();
          ctx.fill();
        }
      }
    }
  }

  // metaball blob: one combined path (nonzero winding) over every ball
  // circle + every in-range connector, so overlapping fills read as a
  // single seamless shape without a real boolean union.
  if (toggleBlob.checked) {
    ctx.beginPath();
    balls.forEach((b) => {
      ctx.moveTo(b.x + b.r, b.y);
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    });
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const pts = metaballConnector(balls[i], balls[j], spread, handleSize, threshMul);
        if (!pts) continue;
        pts.forEach(([x, y], k) => (k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
        ctx.closePath();
      }
    }
    ctx.fillStyle = "rgba(90, 170, 255, 0.85)";
    ctx.fill("nonzero");
    ctx.strokeStyle = "rgba(180, 220, 255, 0.9)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // ball centers, for reference while dragging
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  balls.forEach((b) => {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  });

  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
