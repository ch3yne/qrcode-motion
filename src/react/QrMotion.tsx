import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { makeMatrix, type EcLevel, type Matrix } from "../core/matrix";
import {
  DEFAULT_HOLE,
  DEFAULT_STYLE,
  DEFAULT_TIMING,
  type HoleStyle,
  type QrStyle,
  type RenderOptions,
  type Timing,
} from "../core/render";
import { QrCanvas } from "./QrCanvas";
import { prefersReducedMotion } from "./motion";

/** 中心 logo：图片地址、已加载的 Image，或 null（不挖空） */
export type LogoSource = string | HTMLImageElement | null;

export interface QrMotionProps {
  /** 二维码内容 */
  value: string;
  /** 纠错等级，默认 M；加中心 logo 建议 H */
  ecc?: EcLevel;
  /** 码面边长（px），默认 320 */
  size?: number;

  /** 中心 logo，不传则不挖空 */
  logo?: LogoSource;
  /** 显式指定 logo 宽高比（宽/高），图片未加载时也能预留位置 */
  logoRatio?: number;
  /** 设为 false 彻底关闭中心挖空 */
  hole?: Partial<HoleStyle> | false;

  /** 是否播放“字符瀑布 → 凝成二维码”，默认 true */
  animated?: boolean;
  /** 默认 true：系统偏好减弱动态效果时直接呈现落定态；传 false 保持纯 animated 语义 */
  respectReducedMotion?: boolean;
  /** 动画速度倍数，默认 1 */
  speed?: number;
  /** 凝固方向：由中心向外（默认）或自上而下 */
  sweep?: "radial" | "down";
  /** mono 纯黑白；aurora 成形后叠加色波，默认 mono */
  tint?: "mono" | "aurora";

  /** 模块颜色，默认 #0f1115 */
  ink?: string;
  /** 码面与挖空底色，默认 #ffffff */
  paper?: string;
  /** aurora 色波颜色，默认 #1f9bd4 */
  accent?: string;
  /** 静区模块数，默认 4 */
  quiet?: number;
  /** 模块边长占格宽比例，默认 0.955 */
  moduleScale?: number;
  /** 模块圆角（格），默认 0.29 */
  moduleRadius?: number;

  /** 变化时重播整段动画 */
  replayKey?: string | number;

  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
  /** 动画结束（或静态渲染完成）时回调 */
  onSettle?: () => void;
  /** 内容非法或 logo 加载失败时回调 */
  onError?: (error: Error) => void;
}

const ERR = {
  value: "QrMotion: `value` 不能为空",
  logo: "QrMotion: logo 加载失败，已回退为无 logo 的二维码",
};

/** 加载 logo；字符串走 Image，Image 实例直接用，null 表示关闭 */
function useLogo(source: LogoSource | undefined, onError?: (e: Error) => void) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const current = useRef<string | null>(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    if (!source) {
      current.current = null;
      setImage(null);
      return;
    }
    if (typeof source !== "string") {
      current.current = null;
      setImage(source);
      return;
    }
    if (typeof window === "undefined") return;

    /* 同一地址不重复加载，避免父组件重渲染时闪一下 */
    if (current.current === source) return;
    current.current = source;

    let alive = true;
    const el = new Image();
    el.onload = () => {
      if (alive) setImage(el);
    };
    el.onerror = () => {
      if (!alive) return;
      setImage(null);
      onErrorRef.current?.(new Error(ERR.logo));
    };
    el.src = source;

    return () => {
      alive = false;
      el.onload = null;
      el.onerror = null;
    };
  }, [source]);

  return image;
}

type StyleFields = Pick<
  QrMotionProps,
  "ink" | "paper" | "accent" | "moduleScale" | "moduleRadius" | "quiet"
>;

function resolveStyle(p: StyleFields): QrStyle {
  return {
    ink: p.ink ?? DEFAULT_STYLE.ink,
    paper: p.paper ?? DEFAULT_STYLE.paper,
    accent: p.accent ?? DEFAULT_STYLE.accent,
    moduleScale: p.moduleScale ?? DEFAULT_STYLE.moduleScale,
    moduleRadius: p.moduleRadius ?? DEFAULT_STYLE.moduleRadius,
    quiet: Math.max(0, Math.round(p.quiet ?? DEFAULT_STYLE.quiet)),
  };
}

function resolveTiming(speed?: number): Timing {
  const s = speed && speed > 0 ? speed : 1;
  return {
    rain: DEFAULT_TIMING.rain / s,
    span: DEFAULT_TIMING.span / s,
    cell: DEFAULT_TIMING.cell / s,
  };
}

export function QrMotion(props: QrMotionProps) {
  const {
    value,
    ecc = "M",
    size = 320,
    logo,
    logoRatio,
    hole,
    animated = true,
    respectReducedMotion = true,
    speed,
    sweep = "radial",
    tint = "mono",
    ink,
    paper,
    accent,
    quiet,
    moduleScale,
    moduleRadius,
    replayKey = "",
    className,
    style,
    ariaLabel,
    onSettle,
    onError,
  } = props;

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const [reducedMotion, setReducedMotion] = useState(false);

  /* matchMedia 只在 effect 里读：render 期不碰 window，服务端渲染才不会取不到对象 */
  useEffect(() => {
    if (!respectReducedMotion || typeof window === "undefined") return;

    /* matchMedia 是 window 的方法，脱离 window 调用会非法调用，先绑定 */
    const matchMedia = window.matchMedia.bind(window);
    setReducedMotion(prefersReducedMotion(matchMedia));
  }, [respectReducedMotion]);

  /* 内容或纠错等级变了就重建矩阵；出错时退化为空矩阵，不抛到渲染树 */
  const matrix = useMemo<Matrix | null>(() => {
    if (!value) {
      onErrorRef.current?.(new Error(ERR.value));
      return null;
    }
    try {
      return makeMatrix(value, ecc);
    } catch (e) {
      onErrorRef.current?.(e instanceof Error ? e : new Error(String(e)));
      return null;
    }
  }, [value, ecc]);

  const image = useLogo(logo, onError);
  const qrStyle = useMemo<QrStyle>(
    () =>
      resolveStyle({ ink, paper, accent, moduleScale, moduleRadius, quiet }),
    [ink, paper, accent, moduleScale, moduleRadius, quiet],
  );

  const holeOff = hole === false;
  const holeCols = holeOff ? undefined : hole?.cols;
  const holeAspect = holeOff ? undefined : hole?.aspect;
  const holePadding = holeOff ? undefined : hole?.padding;
  const holeRadius = holeOff ? undefined : hole?.radius;

  const holeStyle = useMemo<HoleStyle | null>(
    () =>
      holeOff
        ? null
        : {
            ...DEFAULT_HOLE,
            cols: holeCols ?? DEFAULT_HOLE.cols,
            aspect: holeAspect ?? DEFAULT_HOLE.aspect,
            padding: holePadding ?? DEFAULT_HOLE.padding,
            radius: holeRadius ?? DEFAULT_HOLE.radius,
          },
    [holeOff, holeCols, holeAspect, holePadding, holeRadius],
  );

  const timing = useMemo<Timing>(() => resolveTiming(speed), [speed]);

  const ratio =
    logoRatio && logoRatio > 0
      ? logoRatio
      : image && image.naturalHeight > 0
        ? image.naturalWidth / image.naturalHeight
        : 1;

  /* 只有 respectReducedMotion 为 true 时才可能改写，为 false 时恒为 false，动画路径不变 */
  const still = respectReducedMotion && reducedMotion;

  /* 没有 logo 时不挖空，避免出现一块空白洞 */
  const options = useMemo<RenderOptions | null>(
    () =>
      matrix
        ? {
            matrix,
            size,
            animated: animated && !still,
            tint,
            sweep,
            style: qrStyle,
            hole: image ? holeStyle : null,
            timing,
            logo: image,
            logoRatio: ratio,
          }
        : null,
    [
      matrix,
      size,
      animated,
      still,
      tint,
      sweep,
      qrStyle,
      holeStyle,
      timing,
      image,
      ratio,
    ],
  );

  if (!options) return null;

  return (
    <QrCanvas
      options={options}
      replayKey={String(replayKey)}
      ariaLabel={ariaLabel ?? "QR code"}
      className={className}
      style={style}
      onSettle={onSettle}
    />
  );
}
