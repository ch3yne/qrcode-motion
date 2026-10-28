# qrcode-motion

[English](./README.md) · **简体中文**

[![npm 版本](https://img.shields.io/npm/v/qrcode-motion)](https://www.npmjs.com/package/qrcode-motion) [![CI](https://github.com/ch3yne/qrcode-motion/actions/workflows/ci.yml/badge.svg)](https://github.com/ch3yne/qrcode-motion/actions/workflows/ci.yml) [![体积](https://img.shields.io/bundlephobia/minzip/qrcode-motion)](https://bundlephobia.com/package/qrcode-motion) [![许可证](https://img.shields.io/npm/l/qrcode-motion)](./LICENSE)

> 1.0.0 之前仍属预发布：公开 API 可能在次版本里调整，变更都记在[更新日志](./CHANGELOG.zh-CN.md)。

React 二维码组件。加载时先铺一层**字符瀑布**，再从中心向外逐格**凝结成码**；支持在中心放一个 logo。

![预览](https://raw.githubusercontent.com/ch3yne/qrcode-motion/main/preview.gif)

<sub>想要静态图？[preview.png](https://raw.githubusercontent.com/ch3yne/qrcode-motion/main/preview.png)</sub>

- 纯 canvas 绘制，无 CSS 依赖、无运行时样式注入
- 二维码矩阵用 `qrcode-generator` 生成，不是画一个像二维码的图案
- 中心挖空按**模块网格取整**，不切出半个方点；logo 等比放入，不拉伸也不裁切
- 圆角模块、圆角定位角都可调；`prefers-reduced-motion` 场景可直接关动画
- ESM + CJS 双格式，自带类型声明，标了 `"use client"`，可在 Next.js App Router 中使用

## 安装

```bash
npm i qrcode-motion
# 或 pnpm add qrcode-motion / yarn add qrcode-motion
```

`react`（`^18 || ^19`）作为 peer dependency，需要宿主自备。构建本仓需要 Node 26 或更高版本，这是 `engines` 声明的口径；发布出去的产物本身只是普通的 ESM 与 CJS。

## 用法

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

`qrcode-motion` 和 `qrcode-motion/react` 目前指向同一入口，两种写法都能用。建议用 `/react`：将来其他框架入口落地后，它依然正确。

不带 logo，就是纯粹的黑白二维码：

```tsx
<QrMotion value="https://example.com" />
```

换内容后想重播动画：

```tsx
<QrMotion value={token} logo="/my-logo.png" replayKey={token} />
```

## Props

| 名称                  | 类型                                 | 默认值       | 说明                                             |
| --------------------- | ------------------------------------ | ------------ | ------------------------------------------------ |
| `value`               | `string`                             | —            | 二维码内容                                       |
| `ecc`                 | `"L" \| "M" \| "Q" \| "H"`           | `"M"`        | 纠错等级。**加中心 logo 建议 `H`**               |
| `size`                | `number`                             | `320`        | 码面边长（px），按 devicePixelRatio 自动提分辨率 |
| `logo`                | `string \| HTMLImageElement \| null` | —            | 中心 logo。不传则不挖空                          |
| `logoRatio`           | `number`                             | 图片实际比例 | 显式指定宽/高，图片未加载时也能预留位置          |
| `hole`                | `Partial<HoleStyle> \| false`        | —            | 挖空参数，`false` 关闭挖空                       |
| `animated`            | `boolean`                            | `true`       | 是否播放瀑布动画                                 |
| `speed`               | `number`                             | `1`          | 动画速度倍数                                     |
| `sweep`               | `"radial" \| "down"`                 | `"radial"`   | 凝固方向：中心向外 / 自上而下                    |
| `tint`                | `"mono" \| "aurora"`                 | `"mono"`     | 成形后是否叠加色波                               |
| `ink`                 | `string`                             | `#0f1115`    | 模块颜色                                         |
| `paper`               | `string`                             | `#ffffff`    | 码面与挖空底色                                   |
| `accent`              | `string`                             | `#1f9bd4`    | `tint="aurora"` 的色波颜色                       |
| `quiet`               | `number`                             | `4`          | 静区模块数，低于 4 会影响识别率                  |
| `moduleScale`         | `number`                             | `0.955`      | 模块边长占格宽比例                               |
| `moduleRadius`        | `number`                             | `0.29`       | 模块圆角（单位为格）                             |
| `replayKey`           | `string \| number`                   | —            | 变化时重播动画                                   |
| `className` / `style` | —                                    | —            | 作用在 `<canvas>` 上                             |
| `ariaLabel`           | `string`                             | `"二维码"`   | 无障碍名称                                       |
| `onSettle`            | `() => void`                         | —            | 动画结束回调                                     |
| `onError`             | `(e: Error) => void`                 | —            | 内容非法或 logo 加载失败                         |

`HoleStyle`：

```ts
interface HoleStyle {
  cols: number; // 挖空宽度占符号总格数（含静区）的比例，默认 0.2
  aspect: number; // 高 / 宽，默认 1.22（竖版）
  padding: number; // logo 四周留白，占挖空短边的比例，默认 0.07
  radius: number; // 挖空圆角，占挖空短边的比例，默认 0.22
}
```

`cols` 与 `aspect` 在绘制时都会取整到整格，挖空还会被限制在 `模块数 − 16` 以内，永远碰不到三个定位图案。29×29 的码在默认参数下挖空为 7×9 格。

`padding` 和 `radius` 用比例而不是格数，是刻意的：内容一长，同一块画布里的模块变多、格子变窄，按格给的留白会缩到 1px，圆角也会直接消失。用比例，两者才不会跟着密度走。

## 内容长短的影响

模块数由内容决定，同一块 480px 画布可能装 21×21（7 字节），也可能装 177×177（约 1KB）。所有"看起来应当一致"的细节都锚在画布上，而不是锚在格数上：

| 量           | 锚定方式                 | 效果                                |
| ------------ | ------------------------ | ----------------------------------- |
| 瀑布条纹间距 | 画布宽度的 16%–27%       | 屏幕上条纹数量一致                  |
| 瀑布下落速度 | 每秒画布宽度的 24%–59%   | 视觉速度一致（px/s）                |
| 挖空宽度     | 占总格数的比例（`cols`） | logo 的像素尺寸不变                 |
| logo 留白    | 占挖空短边的比例         | 不管多少模块，都是 96px 挖空里的 7% |
| 挖空圆角     | 占挖空短边的比例         | 圆角轮廓一致                        |
| 模块圆角     | 按格，低于 4px 关闭      | 不出现次像素毛边                    |
| 字符层       | 按格，低于 5px 改画点    | 字符不会溢出格子                    |

480px 画布下，每格从 21×21 时的 16.6px 一路降到 137×137 时的 3.3px。低于每模块约 2px 解码器就放弃了，按 4 模块静区算，画布至少要 `2 × (模块数 + 8)` px。不够就调大 `size` 或缩短内容。

## 想改样式

```tsx
// 方形 logo 配方洞；圆点模块 + 大圆角
<QrMotion
  value="https://example.com"
  logo="/logo-square.png"
  moduleScale={1}
  moduleRadius={0.5}
  hole={{ cols: 0.22, aspect: 1 }}
/>

// 低端机 / 晕动敏感：直接出码，不播动画
<QrMotion value="https://example.com" animated={false} />

// 只保留瀑布的视觉，不要中心 logo
<QrMotion value="https://example.com" hole={false} />
```

## 中心 logo 的注意事项

- **纠错等级用 `H`**（可恢复约 30%）。挖空一般占码面 5–9%，余量足够。
- **挖空必须落在模块缝上**，所以宽高都是整数格。形状不必是正方形——方形（`aspect: 1`）和竖版（`aspect: 1.22`）都成立，只要四边对齐格缝。**不建议做圆形挖空**：圆的边缘必然切进半个模块，视觉上是一圈毛边。想要圆形观感，让 logo 图自己带圆形底色即可。
- **挖空形状要配素材**。竖版半身像塞进方洞，要么留白过多，要么切掉下巴。图片还没加载时可以先用 `logoRatio` 占位。
- **素材最好自带内边距，且底色与 `paper` 一致**；白色不一致时挖空区会出现一圈灰边。
- **动画期间不要期望能扫**：成形后画面完全静止，模块位置、定位图案、静区全程不动，只有字符层的透明度在变。

本项目 demo 用的是作者本人的头像，**只作为演示截图使用，不在 npm 包里**（`files` 只发布 `dist`，构建脚本也会断言 `dist` 中不含任何图片）。

## 可扫性

用 macOS 的 Vision（`VNDetectBarcodesRequest`）解码 demo 截图实测，内容 `https://example.com`，`ecc = "H"`，29×29 模块（含 4 模块静区共 37×37）：

| 尺寸                                 | 结果     |
| ------------------------------------ | -------- |
| 960 / 480 / 320 / 240 / 200 / 160 px | 均可解码 |
| 130 / 110 px（3.5 / 3.0 px/模块）    | 均可解码 |
| 90 px，0.8 模糊（2.4 px/模块）       | 可解码   |
| 70 px，0.8 模糊（1.9 px/模块）       | 失败     |
| 300 / 480 px，JPEG 质量 10           | 均可解码 |

实用下限约每模块 2 px。

## 可访问性

- 画布以 `role="img"` 暴露，可访问名来自 `ariaLabel`，默认值是 `QR code`。有语义需求时请传入编码内容，别让读屏软件只读出默认名。
- `respectReducedMotion` 默认 `true`：系统要求减少动效时，组件直接绘制落定态并跳过字符瀑布。媒体查询只在 effect 内读取，因此 SSR 与首屏不受影响。
- 想要彻底静态，用 `animated={false}`。
- 动画只是装饰：落定后的码本身承载全部信息，动效不额外传达内容。

## 兼容性

- React 18 / 19
- 浏览器需要 canvas 2D；`roundRect` 不存在时自动退化为直角
- Next.js App Router 可直接用，包入口已带 `"use client"`
- SSR 安全：模块顶层不触碰 `window` / `document`，`Image` 只在 effect 中创建

## 包结构

`qrcode-motion` 是单包多入口，和 Swiper、Motion 的做法一致：

```
qrcode-motion          → 框架无关的渲染核心（后续提供）
qrcode-motion/react    → React 组件        ← 当前可用
qrcode-motion/vue      → Vue 组件          （计划中）
```

绘图代码在 `src/core/`，不依赖 React。当前只发布 React 入口，但目录与 exports 已经留好位置，将来新增入口不会挪动已有路径。

## 开发

```bash
npm i
npm run dev            # 演示站点 http://localhost:5183
npm run typecheck
npm run lint           # eslint，同时覆盖 demo/ 与几个配置文件
npm run test           # vitest run
npm run test:coverage  # 带 src/core 覆盖率阈值的 vitest
npm run build:lib      # 构建 dist 并跑产物自检
npm run build:demo     # 构建演示站点到 demo-dist/
npm run size           # size-limit 对照 gzip 预算
npm run check          # 类型检查 + 格式 + 静态检查 + 测试 + 构建 + 包校验
```

## 参与贡献

- 提 PR 前先读 [CONTRIBUTING.zh-CN.md](./CONTRIBUTING.zh-CN.md)，发版流程也写在里面。
- 安全问题走 [SECURITY.zh-CN.md](./SECURITY.zh-CN.md) 里的私有渠道，不要开公开 issue。
- 版本变化记在[更新日志](./CHANGELOG.zh-CN.md)。

## License

MIT
