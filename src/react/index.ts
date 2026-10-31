/**
 * qrcode-motion/react: the React entry point.
 *
 * The component ships no brand assets; the centre logo is passed in through `logo`.
 * Drawing code lives in ../core/render.ts and is framework-agnostic, so a future Vue or vanilla
 * entry reuses the same implementation.
 */
export { QrMotion } from "./QrMotion";
export type { QrMotionProps, LogoSource } from "./QrMotion";
export { QrCanvas } from "./QrCanvas";
export type { QrCanvasProps } from "./QrCanvas";

export { makeMatrix } from "../core/matrix";
export type { EcLevel, Matrix } from "../core/matrix";

export {
  DEFAULT_HOLE,
  DEFAULT_STYLE,
  DEFAULT_TIMING,
  drawFrame,
} from "../core/render";
export type { HoleStyle, QrStyle, RenderOptions, Timing } from "../core/render";
