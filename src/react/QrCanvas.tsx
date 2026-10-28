import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { drawFrame, type RenderOptions } from "../core/render";

export interface QrCanvasProps {
  options: RenderOptions;
  /** 变化时重播整段动画 */
  replayKey: string;
  ariaLabel: string;
  className?: string;
  style?: CSSProperties;
  onSettle?: () => void;
}

/**
 * 只负责「把一帧帧画到 canvas 上」这一件事。
 * 绘制逻辑全在 core/render.ts，本身不依赖 React —— 将来加 Vue / vanilla 入口时，
 * 复制的是这个循环，不是绘图代码。
 */
export function QrCanvas({
  options,
  replayKey,
  ariaLabel,
  className,
  style,
  onSettle,
}: QrCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const onSettleRef = useRef(onSettle);
  onSettleRef.current = onSettle;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    let raf = 0;
    const born = performance.now() / 1000;
    let lastDraw = 0;
    let settledFired = false;

    const loop = () => {
      const o = optionsRef.current;
      const now = performance.now() / 1000;
      const { rain, span, cell } = o.timing;
      const settleAt = rain + span + cell + 0.3;

      const settled = !o.animated || now - born > settleAt;

      /* 静止且无色波时不必按帧重绘，4fps 足够，省电 */
      if (settled && o.tint === "mono" && now - lastDraw < 0.25) {
        raf = requestAnimationFrame(loop);
        return;
      }
      lastDraw = now;

      drawFrame(canvas, o, now - born, dpr);

      if (settled && !settledFired) {
        settledFired = true;
        onSettleRef.current?.();
      }
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
    };
  }, [replayKey]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        width: options.size,
        height: options.size,
        display: "block",
        ...style,
      }}
      role="img"
      aria-label={ariaLabel}
    />
  );
}
