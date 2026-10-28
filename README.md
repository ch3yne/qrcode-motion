# qrcode-motion

**English** · [简体中文](./README.zh-CN.md)

[![npm version](https://img.shields.io/npm/v/qrcode-motion)](https://www.npmjs.com/package/qrcode-motion) [![CI](https://github.com/ch3yne/qrcode-motion/actions/workflows/ci.yml/badge.svg)](https://github.com/ch3yne/qrcode-motion/actions/workflows/ci.yml) [![minzipped size](https://img.shields.io/bundlephobia/minzip/qrcode-motion)](https://bundlephobia.com/package/qrcode-motion) [![license](https://img.shields.io/npm/l/qrcode-motion)](./LICENSE)

> Pre-1.0: the public API can still change in a minor release until `1.0.0`. The [changelog](./CHANGELOG.md) carries the entries.

An animated QR code for React. A cascade of characters pours in first, then settles from the center outward into a real, scannable QR code — with an optional logo at the center.

![preview](https://raw.githubusercontent.com/ch3yne/qrcode-motion/main/preview.gif)

<sub>Prefer a still frame? [preview.png](https://raw.githubusercontent.com/ch3yne/qrcode-motion/main/preview.png)</sub>

- Pure canvas rendering. No CSS files, no runtime style injection
- The matrix comes from `qrcode-generator` — it's a genuine QR code, not a drawing that looks like one
- The center hole is **snapped to the module grid**, so no half-dots get cut off; the logo is fitted proportionally, never stretched or cropped
- Rounded modules and rounded finder eyes are configurable; drop the animation entirely with `animated={false}`
- ESM + CJS, typed, marked `"use client"`, works in the Next.js App Router
- Verified scannable down to 90px with Vision on macOS — see [Scannability](#scannability)

## Install

```bash
npm i qrcode-motion
# pnpm add qrcode-motion / yarn add qrcode-motion
```

`react` (`^18 || ^19`) is a peer dependency. Building this repository needs Node 26 or newer, which is what `engines` declares; the published bundle itself is plain ESM and CJS.

## Usage

```tsx
import { QrMotion } from "qrcode-motion/react";

export function Login() {
  return (
    <QrMotion
      value="https://example.com"
      ecc="H"
      size={320}
      logo="/my-logo.png"
    />
  );
}
```

`qrcode-motion` and `qrcode-motion/react` resolve to the same entry today, so either import works. Prefer the `/react` form — it stays correct when other framework entries land.

Without a logo it renders a plain black-and-white code:

```tsx
<QrMotion value="https://example.com" />
```

Replay when the content changes:

```tsx
<QrMotion value={token} logo="/my-logo.png" replayKey={token} />
```

## Props

| Prop                  | Type                                 | Default           | Description                                                       |
| --------------------- | ------------------------------------ | ----------------- | ----------------------------------------------------------------- |
| `value`               | `string`                             | —                 | Content to encode                                                 |
| `ecc`                 | `"L" \| "M" \| "Q" \| "H"`           | `"M"`             | Error correction level. Use `H` when a logo is present            |
| `size`                | `number`                             | `320`             | Side length in px. Backing store scales with devicePixelRatio     |
| `logo`                | `string \| HTMLImageElement \| null` | —                 | Center logo. Omit to skip the hole entirely                       |
| `logoRatio`           | `number`                             | image's own ratio | Explicit width/height, so layout is stable before the image loads |
| `hole`                | `Partial<HoleStyle> \| false`        | —                 | Hole geometry; `false` disables the hole                          |
| `animated`            | `boolean`                            | `true`            | Play the cascade animation                                        |
| `speed`               | `number`                             | `1`               | Animation speed multiplier                                        |
| `sweep`               | `"radial" \| "down"`                 | `"radial"`        | Settle direction: center-out or top-down                          |
| `tint`                | `"mono" \| "aurora"`                 | `"mono"`          | `aurora` adds a color wave after settling                         |
| `ink`                 | `string`                             | `#0f1115`         | Module color                                                      |
| `paper`               | `string`                             | `#ffffff`         | Background and hole color                                         |
| `accent`              | `string`                             | `#1f9bd4`         | Wave color for `tint="aurora"`                                    |
| `quiet`               | `number`                             | `4`               | Quiet zone in modules. Below 4 hurts recognition                  |
| `moduleScale`         | `number`                             | `0.955`           | Module size relative to cell width                                |
| `moduleRadius`        | `number`                             | `0.29`            | Module corner radius in cells                                     |
| `replayKey`           | `string \| number`                   | —                 | Change it to replay the animation                                 |
| `className` / `style` | —                                    | —                 | Applied to the `<canvas>`                                         |
| `ariaLabel`           | `string`                             | `"二维码"`        | Accessible name                                                   |
| `onSettle`            | `() => void`                         | —                 | Fired when the animation finishes                                 |
| `onError`             | `(e: Error) => void`                 | —                 | Invalid content, or logo failed to load                           |

`HoleStyle`:

```ts
interface HoleStyle {
  cols: number; // hole width as a share of the total grid, default 0.2
  aspect: number; // height / width, default 1.22 (portrait)
  padding: number; // breathing room around the logo, as a share of the hole's short side, default 0.07
  radius: number; // hole corner radius, as a share of the hole's short side, default 0.22
}
```

`cols` and `aspect` are rounded to whole modules at draw time, and the hole is capped at `modules - 16`, so it can never reach the three finder patterns. On a 29×29 code the default yields a 7×9 hole.

`padding` and `radius` are shares rather than cell counts on purpose. A longer payload packs more modules into the same canvas, so a cell-based value would shrink along with them — the logo would end up with 1 px of breathing room and the corner radius would vanish. Shares keep both constant.

## Content length

Module count follows the payload, so the same 480 px canvas holds anything from 21×21 (7 bytes) to 177×177 (~1 KB). Everything that should look the same at any density is derived from the canvas, not from a cell count:

| Quantity               | Anchored to                       | Effect                                         |
| ---------------------- | --------------------------------- | ---------------------------------------------- |
| Cascade streak spacing | 16–27% of canvas width            | Same number of streaks per screen              |
| Cascade fall speed     | 24–59% of canvas width per second | Same apparent speed in px/s                    |
| Hole width             | share of the grid (`cols`)        | Logo keeps its pixel size                      |
| Logo breathing room    | share of the hole                 | 7% of a ~96 px hole, whatever the module count |
| Hole corner radius     | share of the hole                 | Same rounded outline                           |
| Module corner radius   | cell size, off below 4 px         | No sub-pixel mush                              |
| Character layer        | cell size, dots below 5 px        | Glyphs never overflow their cell               |

At 480 px the module size runs 16.6 px at 21×21 down to 3.3 px at 137×137. Below roughly 2 px per module decoders give up, which for a 4-module quiet zone means a canvas of at least `2 × (modules + 8)` px. Short of that, raise `size` or shorten the payload.

## Recipes

```tsx
// Square logo → square hole. Dot modules, fully rounded.
<QrMotion
  value="https://example.com"
  logo="/logo-square.png"
  moduleScale={1}
  moduleRadius={0.5}
  hole={{ cols: 0.22, aspect: 1 }}
/>

// Skip the animation on low-end devices or for reduced-motion users
<QrMotion value="https://example.com" animated={false} />

// Cascade only, no center logo
<QrMotion value="https://example.com" hole={false} />
```

## About the center logo

- **Use `ecc="H"`** (recovers ~30%). The hole typically takes 5–9% of the code area, so there's plenty of headroom.
- **The hole must be snapped to the module grid.** That's why it's an integer number of modules in each direction. Any aspect ratio works as long as it lands on grid lines — square (`aspect: 1`) and portrait (`aspect: 1.22`) are both fine; a circular hole is not recommended, because its edge cuts through half-modules and shows as a ragged rim. Use a rectangular or rounded-rectangle hole and let the image carry its own circular background.
- **Match the hole to the asset.** A portrait photo in a square hole either leaves too much padding or crops the chin. Pass `logoRatio` if the image hasn't loaded yet.
- **Give the asset its own padding and a background that matches `paper`.** A white logo on a slightly different white leaves a grey ring around the hole.
- **Don't expect it to scan mid-animation.** Once settled the frame is completely static: module positions, finder patterns and the quiet zone never move — only the character layer's opacity changes.

The demo uses the author's own avatar as the sample logo. It is **demo material only and is not published** — `files` ships `dist`, and the build asserts that no images land in the package.

## Scannability

Measured with Apple Vision (`VNDetectBarcodesRequest`) on screenshots of the built demo, `value = "https://example.com"`, `ecc = "H"`, 29×29 modules (37×37 including the 4-module quiet zone):

| Size                                   | Result  |
| -------------------------------------- | ------- |
| 960 / 480 / 320 / 240 / 200 / 160 px   | decodes |
| 130 / 110 px (3.5 / 3.0 px per module) | decodes |
| 90 px, 0.8 blur (2.4 px per module)    | decodes |
| 70 px, 0.8 blur (1.9 px per module)    | fails   |
| 300 / 480 px, JPEG quality 10          | decodes |

Practical floor is about 2 px per module.

## Accessibility

- The canvas is exposed as `role="img"` and named by `ariaLabel`, which defaults to `QR code`. Pass the encoded value when it matters, so screen readers announce something meaningful.
- `respectReducedMotion` defaults to `true`: when the system asks for reduced motion, the component draws the settled code and skips the cascade. The media query is read inside an effect, so SSR and the first paint are unaffected.
- `animated={false}` stops the motion outright for anyone who wants a static code.
- The motion is decorative: nothing in the animation carries information that the settled code does not.

## Compatibility

- React 18 / 19
- Requires canvas 2D. Falls back to square corners when `roundRect` is unavailable
- Next.js App Router: the entry carries `"use client"`
- SSR safe: no `window` / `document` access at module scope; `Image` is created inside an effect

## Structure

`qrcode-motion` is one package with per-framework entries, the same layout Swiper and Motion use:

```
qrcode-motion          → core renderer (framework-free), coming later
qrcode-motion/react    → React component   ← available today
qrcode-motion/vue      → Vue component     (planned)
```

The drawing code lives in `src/core/`, which has no React dependency. Today only the React entry is published; the package layout already reserves room so adding other entries won't move existing paths.

## Development

```bash
npm i
npm run dev            # demo at http://localhost:5183
npm run typecheck
npm run lint           # eslint, which also covers demo/ and the config files
npm run test           # vitest run
npm run test:coverage  # vitest with the src/core coverage thresholds
npm run build:lib      # build dist/ and run the artifact checks
npm run build:demo     # build the demo site into demo-dist/
npm run size           # size-limit against the gzip budget
npm run check          # typecheck + format + lint + test + build + package lint
```

## Contributing

- Read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull request; it also documents the release flow.
- Report vulnerabilities through the private route in [SECURITY.md](./SECURITY.md), not in a public issue.
- Release notes live in [CHANGELOG.md](./CHANGELOG.md).

## License

MIT
