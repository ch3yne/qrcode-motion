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

/** Centre logo: an image URL, a loaded Image, or null for no cut-out */
export type LogoSource = string | HTMLImageElement | null;

export interface QrMotionProps {
  /** QR payload */
  value: string;
  /** Error correction level, default M; H is advised together with a centre logo */
  ecc?: EcLevel;
  /** Symbol edge length in px, default 320 */
  size?: number;

  /** Centre logo; omit it to draw no cut-out */
  logo?: LogoSource;
  /** Explicit logo aspect ratio (width / height), so space can be reserved before the image loads */
  logoRatio?: number;
  /** Set to false to turn the centre cut-out off */
  hole?: Partial<HoleStyle> | false;

  /** Whether to play the character rain settling into the code, default true */
  animated?: boolean;
  /** Default true: renders the settled frame when the system prefers reduced motion; false keeps the plain animated behaviour */
  respectReducedMotion?: boolean;
  /** Animation speed multiplier, default 1 */
  speed?: number;
  /** Settle direction: centre outwards (default) or top down */
  sweep?: "radial" | "down";
  /** mono is plain black on white; aurora adds a colour wave after the settle, default mono */
  tint?: "mono" | "aurora";

  /** Module colour, default #0f1115 */
  ink?: string;
  /** Canvas and cut-out background, default #ffffff */
  paper?: string;
  /** Aurora wave colour, default #1f9bd4 */
  accent?: string;
  /** Quiet zone width in modules, default 4 */
  quiet?: number;
  /** Module edge length as a fraction of the cell width, default 0.955 */
  moduleScale?: number;
  /** Module corner radius in cells, default 0.29 */
  moduleRadius?: number;

  /** Replays the whole animation when it changes */
  replayKey?: string | number;

  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
  /** Called when the animation settles, or when the static frame is done */
  onSettle?: () => void;
  /** Called when the payload is invalid or the logo fails to load */
  onError?: (error: Error) => void;
}

const ERR = {
  value: "QrMotion: `value` must not be empty",
  logo: "QrMotion: logo failed to load, falling back to a code without a logo",
};

/** Loads the logo: strings go through Image, an Image instance is used as is, null turns it off */
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

    /* Skip reloading the same URL, which would flash on every parent re-render */
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

  /* matchMedia is read in an effect only; touching window during render breaks server rendering */
  useEffect(() => {
    if (!respectReducedMotion || typeof window === "undefined") return;

    /* matchMedia is a window method and throws when called detached, so bind it first */
    const matchMedia = window.matchMedia.bind(window);
    setReducedMotion(prefersReducedMotion(matchMedia));
  }, [respectReducedMotion]);

  /* Rebuild the matrix when the payload or level changes; failures return null rather than reaching the render tree */
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

  /* Only respectReducedMotion can set this; with it false the animation path is untouched */
  const still = respectReducedMotion && reducedMotion;

  /* No logo means no cut-out, which would otherwise leave an empty hole */
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
