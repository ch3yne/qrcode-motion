import { describe, expect, it } from "vitest";

import { makeMatrix } from "./matrix";
import {
  DEFAULT_HOLE,
  DEFAULT_STYLE,
  DEFAULT_TIMING,
  computeMetrics,
  drawFrame,
  type HoleMetrics,
  type RenderOptions,
} from "./render";

const SIZE = 240;
/* 每格不到 4px：字号与圆角都该被判为关掉 */
const SIZE_TINY = 100;
const DPR = 2;
const LOGO = { width: 64, height: 64 } as unknown as CanvasImageSource;

interface RecordedCall {
  method: string;
  args: unknown[];
  fillStyle: string | CanvasGradient | CanvasPattern;
}

/** 记录每次调用的假 2D 上下文：属性赋值落在字段上，方法调用按顺序入栈 */
class RecordingContext {
  readonly calls: RecordedCall[] = [];
  fillStyle: string | CanvasGradient | CanvasPattern = "";
  strokeStyle: string | CanvasGradient | CanvasPattern = "";
  lineWidth = 1;
  globalAlpha = 1;
  font = "";
  textAlign: CanvasTextAlign = "start";
  textBaseline: CanvasTextBaseline = "alphabetic";

  private record(method: string, args: unknown[]) {
    this.calls.push({ method, args, fillStyle: this.fillStyle });
  }

  setTransform(...a: unknown[]) {
    this.record("setTransform", a);
  }
  clearRect(...a: unknown[]) {
    this.record("clearRect", a);
  }
  fillRect(...a: unknown[]) {
    this.record("fillRect", a);
  }
  beginPath(...a: unknown[]) {
    this.record("beginPath", a);
  }
  roundRect(...a: unknown[]) {
    this.record("roundRect", a);
  }
  rect(...a: unknown[]) {
    this.record("rect", a);
  }
  arc(...a: unknown[]) {
    this.record("arc", a);
  }
  fill(...a: unknown[]) {
    this.record("fill", a);
  }
  stroke(...a: unknown[]) {
    this.record("stroke", a);
  }
  save(...a: unknown[]) {
    this.record("save", a);
  }
  restore(...a: unknown[]) {
    this.record("restore", a);
  }
  fillText(...a: unknown[]) {
    this.record("fillText", a);
  }
  drawImage(...a: unknown[]) {
    this.record("drawImage", a);
  }
}

const MATRIX = makeMatrix("https://github.com/ch3yne/qrcode-motion");

function options(over: Partial<RenderOptions> = {}): RenderOptions {
  return {
    matrix: MATRIX,
    size: SIZE,
    animated: true,
    tint: "mono",
    sweep: "radial",
    style: DEFAULT_STYLE,
    hole: null,
    timing: DEFAULT_TIMING,
    logo: null,
    logoRatio: 1,
    ...over,
  };
}

function target(ctx: RecordingContext = new RecordingContext()) {
  const canvas = { width: 0, height: 0, getContext: () => ctx };
  return { canvas: canvas as unknown as HTMLCanvasElement, ctx };
}

/** 没有 roundRect 的运行时：rr() 必须退回直角路径 */
class LegacyContext extends RecordingContext {
  constructor() {
    super();
    Object.defineProperty(this, "roundRect", { value: undefined });
  }
}

function callsOf(ctx: RecordingContext, method: string): RecordedCall[] {
  return ctx.calls.filter((call) => call.method === method);
}

function holeOf(over: Partial<RenderOptions> = {}): HoleMetrics {
  const hole = computeMetrics(options(over)).hole;
  if (!hole) throw new Error("expected hole geometry");
  return hole;
}

describe("computeMetrics", () => {
  it("derives the module cell from the matrix size and the quiet zone", () => {
    const metrics = computeMetrics(options());

    expect(metrics.total).toBe(MATRIX.size + 2 * DEFAULT_STYLE.quiet);
    expect(metrics.cell).toBeCloseTo(SIZE / metrics.total, 9);
    expect(metrics.glyphFont).toBeGreaterThan(0);
    expect(metrics.moduleRadius).toBeGreaterThan(0);
  });

  it("reports no hole geometry when the hole is off", () => {
    expect(computeMetrics(options({ hole: null })).hole).toBeNull();
  });

  it("keeps the hole inside the canvas", () => {
    const metrics = computeMetrics(options({ hole: DEFAULT_HOLE }));
    const hole = metrics.hole;
    if (!hole) throw new Error("expected hole geometry");

    expect(hole.x).toBeGreaterThanOrEqual(0);
    expect(hole.y).toBeGreaterThanOrEqual(0);
    expect(hole.x + hole.w).toBeLessThanOrEqual(SIZE);
    expect(hole.y + hole.h).toBeLessThanOrEqual(SIZE);
    expect(hole.w).toBeCloseTo(hole.cols * metrics.cell, 9);
    expect(hole.h).toBeCloseTo(hole.rows * metrics.cell, 9);
  });

  it("turns the glyph font and the module radius off once the cells get too small", () => {
    const metrics = computeMetrics(options({ size: SIZE_TINY }));

    expect(metrics.cell).toBeLessThan(4);
    expect(metrics.glyphFont).toBe(0);
    expect(metrics.moduleRadius).toBe(0);
  });

  it("caps the hole at the symbol size minus the eye bands", () => {
    const hole = holeOf({
      hole: { cols: 1, aspect: 1, padding: 0, radius: 0 },
    });

    expect(hole.cols).toBe(MATRIX.size - 16);
    expect(hole.rows).toBe(MATRIX.size - 16);
    expect(hole.x).toBeCloseTo(SIZE / 2 - hole.w / 2, 9);
    expect(hole.y).toBeCloseTo(SIZE / 2 - hole.h / 2, 9);
    expect(hole.pad).toBe(0);
    expect(hole.radius).toBe(0);
  });

  it("clamps the hole padding and radius to the short side", () => {
    const hole = holeOf({
      hole: { cols: 0.2, aspect: 1.22, padding: 0.9, radius: 0.9 },
    });
    const short = Math.min(hole.w, hole.h);

    expect(hole.pad).toBeCloseTo(short / 2 - 1, 9);
    expect(hole.radius).toBeCloseTo(short / 2, 9);
    /* 留白吃到上限，logo 仍有两个像素的落点 */
    expect(hole.w - hole.pad * 2).toBeGreaterThan(0);
    expect(hole.h - hole.pad * 2).toBeGreaterThan(0);
  });
});

describe("defaults", () => {
  it("pins the published style, hole and timing values", () => {
    expect(DEFAULT_STYLE.ink).toBe("#0f1115");
    expect(DEFAULT_STYLE.paper).toBe("#ffffff");
    expect(DEFAULT_STYLE.accent).toBe("#1f9bd4");
    expect(DEFAULT_STYLE.moduleScale).toBe(0.955);
    expect(DEFAULT_STYLE.moduleRadius).toBe(0.29);
    expect(DEFAULT_STYLE.quiet).toBe(4);

    expect(DEFAULT_HOLE).toEqual({
      cols: 0.2,
      aspect: 1.22,
      padding: 0.07,
      radius: 0.22,
    });

    expect(DEFAULT_TIMING).toEqual({ rain: 1.05, span: 0.62, cell: 0.46 });
  });
});

describe("drawFrame", () => {
  it("sizes the backing store by the device pixel ratio", () => {
    const { canvas } = target();

    drawFrame(canvas, options(), 0, DPR);

    expect(canvas.width).toBe(Math.round(SIZE * DPR));
    expect(canvas.height).toBe(Math.round(SIZE * DPR));
  });

  it("paints the paper colour across the whole canvas first", () => {
    const { canvas, ctx } = target();

    drawFrame(canvas, options(), 0, DPR);

    const paper = ctx.calls.find(
      (call) =>
        call.method === "fillRect" &&
        call.args[0] === 0 &&
        call.args[1] === 0 &&
        call.args[2] === SIZE &&
        call.args[3] === SIZE,
    );
    expect(paper).toBeDefined();
    expect(paper?.fillStyle).toBe(DEFAULT_STYLE.paper);
  });

  it("outlines and fills all three eye markers", () => {
    const { canvas, ctx } = target();

    drawFrame(canvas, options(), 1, DPR);

    const strokes = ctx.calls.filter((call) => call.method === "stroke");
    const fills = ctx.calls.filter((call) => call.method === "fill");
    expect(strokes.length).toBeGreaterThanOrEqual(3);
    expect(fills.length).toBeGreaterThanOrEqual(3);
  });

  it("renders the rain, the wave front and the settled frame without throwing", () => {
    for (const t of [0, 1, 3]) {
      const { canvas, ctx } = target();

      expect(() => {
        drawFrame(canvas, options(), t, DPR);
      }).not.toThrow();
      expect(ctx.calls.length).toBeGreaterThan(0);
    }
  });

  it("renders the frozen frame without falling back to the glyph layer", () => {
    const { canvas, ctx } = target();

    expect(() => {
      drawFrame(canvas, options({ animated: false }), 0, DPR);
    }).not.toThrow();

    const glyphs = ctx.calls.filter((call) => call.method === "fillText");
    expect(glyphs.length).toBe(0);
    expect(ctx.calls.some((call) => call.method === "stroke")).toBe(true);
  });

  it("reuses the backing store when the pixel size has not changed", () => {
    const ctx = new RecordingContext();
    const store = { width: 0, height: 0 };
    let writes = 0;
    const canvas = {
      get width() {
        return store.width;
      },
      set width(value: number) {
        store.width = value;
        writes += 1;
      },
      get height() {
        return store.height;
      },
      set height(value: number) {
        store.height = value;
        writes += 1;
      },
      getContext: () => ctx,
    } as unknown as HTMLCanvasElement;

    drawFrame(canvas, options(), 0, DPR);
    expect(writes).toBe(2);

    drawFrame(canvas, options(), 0.5, DPR);

    expect(writes).toBe(2);
    expect(callsOf(ctx, "setTransform").length).toBe(2);
  });

  it("draws the logo inside the hole without stretching it", () => {
    const over = { hole: DEFAULT_HOLE, logo: LOGO, logoRatio: 1 };
    const { canvas, ctx } = target();

    drawFrame(canvas, options(over), 0, DPR);

    const hole = holeOf(over);
    const side = hole.w - hole.pad * 2;
    const drawn = callsOf(ctx, "drawImage");
    expect(drawn.length).toBe(1);

    const [, x, y, w, h] = drawn[0].args as [
      unknown,
      number,
      number,
      number,
      number,
    ];
    expect(w).toBeCloseTo(side, 9);
    expect(h).toBeCloseTo(side, 9);
    expect(x).toBeCloseTo(hole.x + (hole.w - w) / 2, 9);
    expect(y).toBeCloseTo(hole.y + (hole.h - h) / 2, 9);
    /* 挖空区先被纸色填掉，logo 才落在上面 */
    expect(
      callsOf(ctx, "fill").some(
        (call) => call.fillStyle === DEFAULT_STYLE.paper,
      ),
    ).toBe(true);
  });

  it("fits a tall logo by its height instead of its width", () => {
    const over = { hole: DEFAULT_HOLE, logo: LOGO, logoRatio: 0.4 };
    const { canvas, ctx } = target();

    drawFrame(canvas, options(over), 0, DPR);

    const hole = holeOf(over);
    const tall = hole.h - hole.pad * 2;
    const [, , , w, h] = callsOf(ctx, "drawImage")[0].args as [
      unknown,
      unknown,
      unknown,
      number,
      number,
    ];
    expect(h).toBeCloseTo(tall, 9);
    expect(w).toBeCloseTo(tall * 0.4, 9);
  });

  it("treats a non-positive logo ratio as square", () => {
    const over = { hole: DEFAULT_HOLE, logo: LOGO, logoRatio: 1 };
    const square = target();
    const zero = target();

    drawFrame(square.canvas, options(over), 0, DPR);
    drawFrame(zero.canvas, options({ ...over, logoRatio: 0 }), 0, DPR);

    expect(zero.ctx.calls).toEqual(square.ctx.calls);
  });

  it("fades the logo in with the settle and shows it fully when frozen", () => {
    const over = { hole: DEFAULT_HOLE, logo: LOGO };
    const mid = target();
    const frozen = target();

    drawFrame(mid.canvas, options(over), 0.35, DPR);
    drawFrame(frozen.canvas, options({ ...over, animated: false }), 0, DPR);

    expect(mid.ctx.globalAlpha).toBeCloseTo(0.5, 9);
    expect(frozen.ctx.globalAlpha).toBe(1);
  });

  it("falls back to square primitives when the runtime has no roundRect", () => {
    const over = { hole: DEFAULT_HOLE, logo: LOGO };
    const modern = target();
    const legacy = target(new LegacyContext());

    drawFrame(modern.canvas, options(over), 0, DPR);
    drawFrame(legacy.canvas, options(over), 0, DPR);

    expect(callsOf(modern.ctx, "rect").length).toBe(0);
    expect(callsOf(legacy.ctx, "roundRect").length).toBe(0);
    /* 同一批矩形全部改走 rect：只少一个圆角参数，几何不变 */
    const squares = callsOf(legacy.ctx, "rect").map((call) =>
      (call.args as number[]).slice(0, 4),
    );
    expect(squares.length).toBe(callsOf(modern.ctx, "roundRect").length);
    expect(squares).toEqual(
      callsOf(modern.ctx, "roundRect").map((call) =>
        (call.args as number[]).slice(0, 4),
      ),
    );
  });

  it("returns early when the canvas has no 2d context", () => {
    let asked = 0;
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => {
        asked += 1;
        return null;
      },
    } as unknown as HTMLCanvasElement;

    expect(() => {
      drawFrame(canvas, options(), 0, DPR);
    }).not.toThrow();

    expect(asked).toBe(1);
    expect(canvas.width).toBe(Math.round(SIZE * DPR));
  });

  it("draws dots instead of glyphs once the cells are smaller than the font floor", () => {
    const { canvas, ctx } = target();

    drawFrame(canvas, options({ size: SIZE_TINY }), 0.05, DPR);

    const cell = SIZE_TINY / (MATRIX.size + 2 * DEFAULT_STYLE.quiet);
    expect(callsOf(ctx, "fillText").length).toBe(0);

    const dots = callsOf(ctx, "arc");
    expect(dots.length).toBeGreaterThan(0);
    expect(dots[0].args[2]).toBeCloseTo(Math.max(0.6, cell * 0.3), 9);
  });

  it("sweeps the wave front downwards so the top of the symbol settles first", () => {
    const radial = target();
    const down = target();

    drawFrame(radial.canvas, options({ sweep: "radial" }), 1.6, DPR);
    drawFrame(down.canvas, options({ sweep: "down" }), 1.6, DPR);

    /* fillText 的第二个坐标是 y：字符层只剩下方那截，说明波前是从上往下推的 */
    const radialY = callsOf(radial.ctx, "fillText").map(
      (call) => call.args[2] as number,
    );
    const downY = callsOf(down.ctx, "fillText").map(
      (call) => call.args[2] as number,
    );

    expect(radialY.length).toBeGreaterThan(0);
    expect(downY.length).toBeGreaterThan(0);
    expect(Math.min(...downY)).toBeGreaterThan(Math.min(...radialY));
    expect(Math.min(...downY)).toBeGreaterThan(SIZE / 2);
  });

  it("waves the accent through the settled modules when tinted", () => {
    const tinted = target();
    const repeat = target();
    const early = target();
    const monoEarly = target();

    drawFrame(tinted.canvas, options({ tint: "aurora" }), 2.5, DPR);
    drawFrame(repeat.canvas, options({ tint: "aurora" }), 2.5, DPR);
    drawFrame(early.canvas, options({ tint: "aurora" }), 1, DPR);
    drawFrame(monoEarly.canvas, options(), 1, DPR);

    const waves = callsOf(tinted.ctx, "fill")
      .map((call) => call.fillStyle)
      .filter(
        (style): style is string =>
          typeof style === "string" && style.startsWith("rgb("),
      );
    expect(waves.length).toBeGreaterThan(1);
    expect(new Set(waves).size).toBeGreaterThan(1);
    /* 色波只在 ink 与 accent 之间取值 */
    expect(waves.every((style) => /^rgb\(\d+,\d+,\d+\)$/.test(style))).toBe(
      true,
    );
    /* 同一帧画两遍完全一致：没有随机，也没有读时钟 */
    expect(repeat.ctx.calls).toEqual(tinted.ctx.calls);
    /* 符号沉完之前不打色波 */
    expect(early.ctx.calls).toEqual(monoEarly.ctx.calls);
  });
});
