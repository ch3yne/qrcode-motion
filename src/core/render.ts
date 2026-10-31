import type { Matrix } from "./matrix";

/** Colours and module shape */
export interface QrStyle {
  /** Module colour */
  ink: string;
  /** Canvas background, also the cut-out colour */
  paper: string;
  /** Wave colour when `tint="aurora"` */
  accent: string;
  /** Module edge length as a fraction of the cell width, 0-1, default 0.955 */
  moduleScale: number;
  /** Module corner radius in cells, default 0.29 */
  moduleRadius: number;
  /** Quiet zone width in modules, default 4 */
  quiet: number;
}

/**
 * Centre cut-out.
 * `padding` and `radius` are fractions of the hole short side rather than cell counts: a longer
 * payload shrinks the cells, and per-cell padding and radius would shrink with them.
 */
export interface HoleStyle {
  /** Hole width as a fraction of the total module count, quiet zone included, default 0.2 */
  cols: number;
  /** Height / width, default 1.22 (portrait, suits a headshot) */
  aspect: number;
  /** Padding around the logo as a fraction of the hole short side, default 0.07 */
  padding: number;
  /** Hole corner radius as a fraction of the hole short side, 0-0.5, default 0.22 */
  radius: number;
}

export interface Timing {
  /** Duration of the rain-only phase, in seconds */
  rain: number;
  /** Time for the wave front to travel from the origin to the farthest cell, in seconds */
  span: number;
  /** Time for one cell to turn from a character into a module, in seconds */
  cell: number;
}

export const DEFAULT_STYLE: QrStyle = {
  ink: "#0f1115",
  paper: "#ffffff",
  accent: "#1f9bd4",
  moduleScale: 0.955,
  moduleRadius: 0.29,
  quiet: 4,
};

export const DEFAULT_HOLE: HoleStyle = {
  cols: 0.2,
  aspect: 1.22,
  padding: 0.07,
  radius: 0.22,
};

export const DEFAULT_TIMING: Timing = {
  rain: 1.05,
  span: 0.62,
  cell: 0.46,
};

/** Every parameter the renderer needs, defaults already resolved */
export interface RenderOptions {
  matrix: Matrix;
  size: number;
  animated: boolean;
  tint: "mono" | "aurora";
  sweep: "radial" | "down";
  style: QrStyle;
  hole: HoleStyle | null;
  timing: Timing;
  logo: CanvasImageSource | null;
  /** Logo aspect ratio, used to fit it into the hole without stretching */
  logoRatio: number;
}

/** Hole geometry in CSS px, already rounded to whole cells */
export interface HoleMetrics {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Width and height in whole cells */
  cols: number;
  rows: number;
  /** Padding around the logo in px */
  pad: number;
  /** Corner radius in px */
  radius: number;
}

/**
 * Drawing metrics derived from the module count and the canvas size.
 * The only place that converts cells into pixels: a longer payload means more, narrower cells, and
 * every cell-relative detail (glyph font, radius, padding) is resolved here.
 */
export interface Metrics {
  /** Total modules, quiet zone included */
  total: number;
  /** Cell edge length in px */
  cell: number;
  /** Glyph font size in px; 0 means the cells are too small and dots are drawn instead */
  glyphFont: number;
  /** Module corner radius in px; 0 disables rounding */
  moduleRadius: number;
  /** Hole geometry; null when there is no logo or the hole is off */
  hole: HoleMetrics | null;
}

export function computeMetrics(o: RenderOptions): Metrics {
  const n = o.matrix.size;
  const quiet = o.style.quiet;
  const total = n + quiet * 2;
  const cell = o.size / total;

  /* Below 5px the glyphs smear together and overflow the cell, so dots read better */
  const glyphFont = cell >= 5 ? cell * 1.12 : 0;
  /* A radius under 1px leaves only anti-aliasing fuzz, so square corners cost less */
  const moduleRadius = cell >= 4 ? cell * o.style.moduleRadius : 0;

  let hole: HoleMetrics | null = null;
  if (o.hole) {
    /* Whole cells keep the four edges on module seams; 8 cells clear on each side keep a short
       payload off the three finder patterns */
    const cap = Math.max(4, n - 16);
    const cols = Math.min(cap, Math.max(4, Math.round(total * o.hole.cols)));
    const rows = Math.min(cap, Math.max(4, Math.round(cols * o.hole.aspect)));
    const w = cols * cell;
    const h = rows * cell;
    const short = Math.min(w, h);

    hole = {
      x: o.size / 2 - w / 2,
      y: o.size / 2 - h / 2,
      w,
      h,
      cols,
      rows,
      /* Padding is capped at half the short side minus 1px so the logo still lands */
      pad: Math.max(0, Math.min(short * o.hole.padding, short / 2 - 1)),
      radius: Math.max(0, Math.min(short * o.hole.radius, short / 2)),
    };
  }

  return { total, cell, glyphFont, moduleRadius, hole };
}

const CHARS = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ";

const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

function noise2(c: number, r: number): number {
  const v = Math.sin(c * 127.1 + r * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t);
  const g = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t);
  const bl = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
  return `rgb(${r},${g},${bl})`;
}

/** #rrggbb plus alpha to rgba(); avoids globalAlpha leaking into later draws */
function withAlpha(hex: string, a: number): string {
  const v = parseInt(hex.slice(1), 16);
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a.toFixed(3)})`;
}

function rr(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

function inEye(r: number, c: number, n: number): boolean {
  // Only the 7x7 eye bodies are skipped; the ring around them stays with the glyph layer. drawEyes runs last so overhanging glyphs get covered
  return (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
}

/** Per-column rain parameters: streak gap, tail length, fall speed, phase, mute flag */
interface Col {
  gap: number;
  tail: number;
  speed: number;
  phase: number;
  mute: boolean;
  bias: number;
}

/**
 * Per-column rain parameters. Gap, tail and speed are measured against the canvas width and then
 * converted to cells, so a 21x21 symbol and a 137x137 one rain at the same density and fall speed.
 */
function buildCols(n: number, cell: number, px: number): Col[] {
  const cols: Col[] = [];
  for (let c = 0; c < n; c++) {
    /* About 16%-27% of the canvas width between two streaks in the same column */
    const gap = (px * (0.16 + noise2(c, 3.1) * 0.11)) / cell;
    cols.push({
      gap,
      tail: gap * (0.86 + noise2(c, 7.7) * 0.16), // tail just under the gap keeps the seams thin
      speed: (px * (0.24 + noise2(c, 11.3) * 0.35)) / cell, // falls 24%-59% of the canvas width per second
      phase: noise2(c, 15.9) * gap,
      mute: noise2(c, 21.5) < 0.07, // a few empty columns let the field breathe
      bias: 0.82 + noise2(c, 27.1) * 0.36, // each column gets its own overall density
    });
  }
  return cols;
}

/**
 * Brightness (0-1) of the character in one cell.
 * Each column holds several heads spaced `gap` apart; a head travels down at `speed` and the
 * `tail` cells above it fade out, so the column stays lit at a gradient.
 */
function streak(col: Col, r: number, t: number): number {
  if (col.mute) return 0;
  const head = col.phase + col.speed * t;
  const d = (((head - r) % col.gap) + col.gap) % col.gap; // cells behind the head
  if (d >= col.tail) return 0;
  return Math.pow(1 - d / col.tail, 1.9);
}

function drawEyes(
  ctx: CanvasRenderingContext2D,
  cell: number,
  n: number,
  quiet: number,
  color: string,
  alpha: number,
) {
  const eyes: [number, number][] = [
    [0, 0],
    [0, n - 7],
    [n - 7, 0],
  ];
  /* Small cells drop the stroke under 1px and leave only an anti-aliased grey band */
  const lw = Math.max(1, cell * 1.1);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  for (const [r0, c0] of eyes) {
    const x = (quiet + c0) * cell;
    const y = (quiet + r0) * cell;
    const s = 7 * cell;
    ctx.lineWidth = lw;
    rr(ctx, x + lw / 2, y + lw / 2, s - lw, s - lw, Math.max(0, cell * 1.35));
    ctx.stroke();
    rr(
      ctx,
      x + 2 * cell,
      y + 2 * cell,
      3 * cell,
      3 * cell,
      Math.max(0, cell * 0.85),
    );
    ctx.fill();
  }
  ctx.restore();
}

function drawLogo(
  ctx: CanvasRenderingContext2D,
  o: RenderOptions,
  m: Metrics,
  alpha: number,
) {
  const hole = m.hole;
  if (!o.hole || !o.logo || !hole) return;

  ctx.save();
  ctx.globalAlpha = alpha;

  ctx.fillStyle = o.style.paper;
  rr(ctx, hole.x, hole.y, hole.w, hole.h, hole.radius);
  ctx.fill();

  /* Fit into the hole centred with pad of breathing room on every side; no stretching, no cropping */
  const aw = Math.max(0, hole.w - hole.pad * 2);
  const ah = Math.max(0, hole.h - hole.pad * 2);
  const ratio = o.logoRatio > 0 ? o.logoRatio : 1;

  let iw = aw;
  let ih = ah;
  if (ratio > aw / ah) ih = aw / ratio;
  else iw = ah * ratio;

  if (iw > 0 && ih > 0) {
    ctx.drawImage(
      o.logo,
      hole.x + (hole.w - iw) / 2,
      hole.y + (hole.h - ih) / 2,
      iw,
      ih,
    );
  }

  ctx.restore();
}

export function drawFrame(
  canvas: HTMLCanvasElement,
  o: RenderOptions,
  t: number,
  dpr: number,
) {
  const px = o.size;
  const target = Math.round(px * dpr);
  if (canvas.width !== target) {
    canvas.width = target;
    canvas.height = target;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { ink, paper, accent, moduleScale, quiet } = o.style;
  const m = computeMetrics(o);
  const { cell, total } = m;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, px, px);
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, px, px);

  const n = o.matrix.size;
  const frozen = !o.animated;
  const { rain, span, cell: tCell } = o.timing;

  const cols = buildCols(n, cell, px);
  if (m.glyphFont > 0) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `600 ${m.glyphFont.toFixed(2)}px ui-monospace, "SF Mono", Menlo, monospace`;
  }

  const tick = Math.floor(t * 9);
  const settle = rain + span + tCell;

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (inEye(r, c, n)) continue;

      const cx = (c + quiet + 0.5) * cell;
      const cy = (r + quiet + 0.5) * cell;

      /* Wave front order: from the centre outwards or from the top down */
      const nx = (c + quiet) / total;
      const ny = (r + quiet) / total;
      const dist =
        o.sweep === "down"
          ? clamp(ny * 1.05)
          : Math.min(1, Math.hypot(nx - 0.5, ny - 0.5) / 0.62);
      const d = clamp(dist + noise2(c, r) * 0.08);
      const p1 = frozen ? 1 : clamp((t - (rain + d * span)) / tCell);

      /* ---- glyph layer ---- */
      if (p1 < 1) {
        const col = cols[c];
        const b = streak(col, r, t);
        const holeNoise = noise2(c * 1.7 + 0.3, r * 2.3 + 0.7);
        if (b > 0.04 && holeNoise > 0.08) {
          const flick = 0.9 + 0.1 * noise2(c + tick, r);
          /* Glyphs dissolve over p1 0 to 0.44 while modules surface, so the two overlap without a gap */
          const fade = 1 - smooth(0, 0.44, p1);
          /* Floor 0.22 keeps the wall solid instead of grey dots; cap 1 keeps the head at full strength */
          const a = clamp((0.22 + 0.8 * b) * flick * col.bias * fade);
          if (a > 0.015) {
            /* A slight jitter breaks the set-grid look */
            const jx = (noise2(c * 3.1, r * 5.7 + tick) - 0.5) * cell * 0.12;
            const jy = (noise2(c * 7.3 + tick, r * 9.1) - 0.5) * cell * 0.1;
            ctx.fillStyle =
              b > 0.94
                ? `rgba(21,52,66,${Math.min(1, a * 1.2).toFixed(3)})`
                : withAlpha(ink, a);

            if (m.glyphFont > 0) {
              const hh = noise2(c + tick * 0.7, r + tick * 0.4);
              const idx = Math.floor(hh * CHARS.length) % CHARS.length;
              ctx.fillText(CHARS[idx], cx + jx, cy + jy);
            } else {
              /* Cells are smaller than the font, so draw dots and keep the flow instead of forcing unreadable glyphs */
              ctx.beginPath();
              ctx.arc(
                cx + jx * 0.4,
                cy + jy * 0.4,
                Math.max(0.6, cell * 0.3),
                0,
                Math.PI * 2,
              );
              ctx.fill();
            }
          }
        }
      }

      if (!o.matrix.cells[r * n + c]) continue;
      if (p1 <= 0) continue;

      /* ---- module layer: surfaces at final size, growing would read as speckle ---- */
      const size =
        cell * moduleScale * (0.94 + 0.06 * easeOut(clamp(p1 / 0.5)));
      const alpha = smooth(0, 0.34, p1);

      let color = ink;
      if (o.tint === "aurora" && t > settle) {
        const wave =
          0.5 +
          0.5 *
            Math.sin(
              ((c * 0.62 + r * 0.88) / total) * 6.6 - (t - settle) * 2.1,
            );
        color = mix(ink, accent, Math.pow(wave, 2.2) * 0.62);
      }

      ctx.globalAlpha = alpha;
      rr(ctx, cx - size / 2, cy - size / 2, size, size, m.moduleRadius);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  drawEyes(ctx, cell, n, quiet, ink, frozen ? 1 : clamp(t / 0.35));
  drawLogo(ctx, o, m, frozen ? 1 : clamp((t - 0.15) / 0.4));
}
