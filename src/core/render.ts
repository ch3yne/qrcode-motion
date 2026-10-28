import type { Matrix } from "./matrix";

/** 配色与模块形状 */
export interface QrStyle {
  /** 模块颜色 */
  ink: string;
  /** 码面底色（也是挖空区的颜色） */
  paper: string;
  /** `tint="aurora"` 时的色波动画色 */
  accent: string;
  /** 模块边长相对格宽的占比，0–1，默认 0.955 */
  moduleScale: number;
  /** 模块圆角，单位为格，默认 0.29 */
  moduleRadius: number;
  /** 静区模块数，默认 4 */
  quiet: number;
}

/**
 * 中心挖空区。
 * `padding` / `radius` 故意用「占挖空短边的比例」而不是格数：
 * 内容一长、格子变小，按格给的留白和圆角会跟着缩水，观感就变了。
 */
export interface HoleStyle {
  /** 挖空宽度占符号总格数（含静区）的比例，默认 0.2 */
  cols: number;
  /** 高 / 宽，默认 1.22（竖版，配半身像） */
  aspect: number;
  /** logo 四周留白，占挖空短边的比例，默认 0.07 */
  padding: number;
  /** 挖空圆角，占挖空短边的比例，0–0.5，默认 0.22 */
  radius: number;
}

export interface Timing {
  /** 纯瀑布阶段时长（秒） */
  rain: number;
  /** 波前从起点到最远端的耗时（秒） */
  span: number;
  /** 单格从字符变成模块的耗时（秒） */
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

/** 渲染器需要的全部参数（已解析为默认值） */
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
  /** logo 宽高比，用于等比放进挖空区 */
  logoRatio: number;
}

/** 挖空区的几何（CSS px，已取整到整格） */
export interface HoleMetrics {
  x: number;
  y: number;
  w: number;
  h: number;
  /** 宽、高各占多少整格 */
  cols: number;
  rows: number;
  /** logo 四周留白（px） */
  pad: number;
  /** 圆角（px） */
  radius: number;
}

/**
 * 由「模块数 + 画布尺寸」推导出的绘制度量。
 * 这里是唯一把格数换算成像素的地方：内容一长，格数变多、每格变窄，
 * 所有会跟着格子缩水的细节（字号、圆角、留白）都在这里兜住。
 */
export interface Metrics {
  /** 含静区的总格数 */
  total: number;
  /** 每格边长（px） */
  cell: number;
  /** 字符层字号（px）；0 表示格子太小，改为画点 */
  glyphFont: number;
  /** 模块圆角（px）；0 表示关闭圆角 */
  moduleRadius: number;
  /** 挖空区几何；没有 logo 或关闭挖空时为 null */
  hole: HoleMetrics | null;
}

export function computeMetrics(o: RenderOptions): Metrics {
  const n = o.matrix.size;
  const quiet = o.style.quiet;
  const total = n + quiet * 2;
  const cell = o.size / total;

  /* 字号压到 5px 以下，字符糊成一团、还会溢满整格，不如画点 */
  const glyphFont = cell >= 5 ? cell * 1.12 : 0;
  /* 圆角小于 1px 只剩抗锯齿的毛边，直接给直角 */
  const moduleRadius = cell >= 4 ? cell * o.style.moduleRadius : 0;

  let hole: HoleMetrics | null = null;
  if (o.hole) {
    /* 取整到整格，四条边才落在模块缝上；
       再给两侧各留 8 格，内容很短时也不会压到三个定位图案 */
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
      /* 留白上限是短边的一半减 1px，保证 logo 有地方落 */
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

/** #rrggbb + alpha → rgba()，避免用 globalAlpha 影响后续绘制 */
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
  // 只挖 7×7 眼睛本体，眼睛外一圈分隔带留给字符层；drawEyes 最后绘制，越界字符会被覆盖
  return (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
}

/** 每列的瀑布参数：条纹间距、拖尾长度、下落速度、相位、是否留空 */
interface Col {
  gap: number;
  tail: number;
  speed: number;
  phase: number;
  mute: boolean;
  bias: number;
}

/**
 * 每列的瀑布参数。间距、拖尾、速度都以「画布宽度」为基准再换算成格数：
 * 同一块画布上，21×21 的码和 137×137 的码，瀑布的浓密程度和下落速度看起来一致。
 */
function buildCols(n: number, cell: number, px: number): Col[] {
  const cols: Col[] = [];
  for (let c = 0; c < n; c++) {
    /* 同列两条水流之间约 16%–27% 画布宽 */
    const gap = (px * (0.16 + noise2(c, 3.1) * 0.11)) / cell;
    cols.push({
      gap,
      tail: gap * (0.86 + noise2(c, 7.7) * 0.16), // 拖尾接近间距，缝隙细一点
      speed: (px * (0.24 + noise2(c, 11.3) * 0.35)) / cell, // 每秒下落 24%–59% 画布宽
      phase: noise2(c, 15.9) * gap,
      mute: noise2(c, 21.5) < 0.07, // 少数列留空，透气
      bias: 0.82 + noise2(c, 27.1) * 0.36, // 每列整体浓淡不同
    });
  }
  return cols;
}

/**
 * 某格字符的亮度（0–1）。
 * 每列按 gap 均匀排布多个“头”，头以 speed 向下走，头上方 tail 格形成渐隐拖尾，
 * 所以整列几乎都亮但亮度有梯度 —— 这才是瀑布，而不是滴水。
 */
function streak(col: Col, r: number, t: number): number {
  if (col.mute) return 0;
  const head = col.phase + col.speed * t;
  const d = (((head - r) % col.gap) + col.gap) % col.gap; // 落后头多少格
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
  /* 格子很小时线宽会掉到 1px 以下，只剩一条抗锯齿灰带 */
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

  /* 等比放进挖空区、居中，四周留 pad 呼吸边：不拉伸、不裁切 */
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

      /* 波前顺序：中心向外 or 自上而下 */
      const nx = (c + quiet) / total;
      const ny = (r + quiet) / total;
      const dist =
        o.sweep === "down"
          ? clamp(ny * 1.05)
          : Math.min(1, Math.hypot(nx - 0.5, ny - 0.5) / 0.62);
      const d = clamp(dist + noise2(c, r) * 0.08);
      const p1 = frozen ? 1 : clamp((t - (rain + d * span)) / tCell);

      /* ---- 字符层 ---- */
      if (p1 < 1) {
        const col = cols[c];
        const b = streak(col, r, t);
        const holeNoise = noise2(c * 1.7 + 0.3, r * 2.3 + 0.7);
        if (b > 0.04 && holeNoise > 0.08) {
          const flick = 0.9 + 0.1 * noise2(c + tick, r);
          /* 字符在 p1 0→0.44 之间溶掉，模块同时浮现，两者重叠不留空档 */
          const fade = 1 - smooth(0, 0.44, p1);
          /* 下限 0.22 保证“墙”是实的，不散成灰点；上限 1 让水头压得住 */
          const a = clamp((0.22 + 0.8 * b) * flick * col.bias * fade);
          if (a > 0.015) {
            /* 极轻微抖动，破掉铅字般的网格感 */
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
              /* 格子已经比字号还小：画点，保留瀑布的流向，不硬塞认不出的字符 */
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

      /* ---- 模块层：直接以成品尺寸浮现，不做“长大” —— 长了会像麻点 ---- */
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
