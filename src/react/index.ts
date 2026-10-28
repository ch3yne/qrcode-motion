/**
 * qrcode-motion/react —— React 入口。
 *
 * 组件本身不含任何品牌素材：中心 logo 由使用方通过 `logo` 传入。
 * 绘图代码在 ../core/render.ts，与框架无关，将来新增 Vue / vanilla 入口时复用同一份。
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
