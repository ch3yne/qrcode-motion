import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { drawFrame, type RenderOptions } from "../core/render";

export interface QrCanvasProps {
  options: RenderOptions;
  /** Replays the whole animation when it changes */
  replayKey: string;
  ariaLabel: string;
  className?: string;
  style?: CSSProperties;
  onSettle?: () => void;
}

/**
 * Draws one frame at a time onto the canvas.
 * All drawing lives in core/render.ts and is framework-agnostic, so a future Vue or vanilla entry
 * copies this loop and reuses the drawing code.
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

      /* Settled and without the wave nothing changes per frame, so 4fps saves power */
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
