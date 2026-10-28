# 参与贡献 qrcode-motion

感谢你愿意花时间参与。本文说明本地开发回路、守护每次改动的脚本，以及本仓保持的约定。

## 环境要求

- Node.js >= 26，在 `package.json` 的 `engines` 中声明。
- npm，随 Node.js 一起安装。
- 用 `npm ci` 严格按 `package-lock.json` 装依赖。

## 本地开发

`npm run dev` 在 5183 端口启动 Vite 并提供演示页，入口是 `demo/main.tsx`。演示页不会进入发布包。

## 脚本

下列每个脚本都是 `package.json` 的实值；本表只是索引，不是第二处事实来源。

| 脚本             | 实际命令                                                                                                                                                          | 用途                                         |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `typecheck`      | `tsc --noEmit`                                                                                                                                                    | 全量类型检查，不产生产物                     |
| `lint`           | `eslint .`                                                                                                                                                        | 按 flat config 检查 `src/**` 与 `scripts/**` |
| `lint:fix`       | `eslint . --fix`                                                                                                                                                  | 同一次检查，顺手改掉可自动修复的问题         |
| `format`         | `prettier --write .`                                                                                                                                              | 就地格式化整个仓                             |
| `format:check`   | `prettier --check .`                                                                                                                                              | 只校验格式，不写盘                           |
| `test`           | `vitest run`                                                                                                                                                      | 跑一次 `src/**/*.test.ts`                    |
| `test:watch`     | `vitest`                                                                                                                                                          | 同一套用例的 watch 模式                      |
| `build:lib`      | `vite build --config vite.lib.config.ts && tsc -p tsconfig.build.json && node scripts/build-dts.mjs && node scripts/postbuild.mjs && node scripts/check-dist.mjs` | 构建库并自检产物                             |
| `build:demo`     | `vite build`                                                                                                                                                      | 构建演示页，产物在 `demo-dist/`              |
| `build`          | `npm run build:lib && npm run build:demo`                                                                                                                         | 两条构建都跑                                 |
| `check:package`  | `publint && attw --pack . --profile node16`                                                                                                                       | 检查包结构与双格式类型解析                   |
| `dev`            | `vite --port 5183`                                                                                                                                                | 本地演示服务器                               |
| `check`          | `npm run typecheck && npm run format:check && npm run lint && npm run test && npm run build:lib && npm run check:package`                                         | 提交前的完整门禁                             |
| `prepublishOnly` | `npm run typecheck && npm run build:lib`                                                                                                                          | 发版前的 npm 生命周期门禁                    |

`build:lib` 按顺序跑五个阶段：Vite 库构建、按 `tsconfig.build.json` 产出声明、`scripts/build-dts.mjs` 把逐文件声明打平成 `dist/react/index.d.ts`、`scripts/postbuild.mjs` 复制出 `dist/react/index.d.cts`、`scripts/check-dist.mjs` 校验产物。任一阶段失败即非零退出。

## 提交之前

跑 `npm run check`。它是六步链——typecheck、format:check、lint、test、build:lib、check:package——任一步非零即停。只改文档也必须至少跑 `npm run format:check` 与 `npm run lint`。

## 测试

- 新逻辑的测试放在 `src/**/*.test.ts`，与被测代码同目录。
- 运行器是 Vitest，node 环境，配置在 `vitest.config.ts`，只收集 `src/**`。
- 用例必须确定性：不许用 `Date.now`、`performance.now`、`Math.random`。依赖挂钟或随机的用例无法复现失败。
- 不写 snapshot 测试。
- 画布绘制通过记录型假 ctx 驱动，不要为此引入 DOM 测试库。

## 代码风格

静态检查来自 `eslint.config.mjs` 的 flat config：`src/**` 用 typescript-eslint recommended，另外 `react-hooks/rules-of-hooks` 为 error、`react-hooks/exhaustive-deps` 为 warn。排版来自 Prettier。

不做行内豁免。不要写 `eslint-disable` 注释：需要放宽某条规则就改配置，并在提交信息里说清理由。

## 注释

注释用中文，只解释为什么——为什么这样算、为什么必须这个顺序——不复述下一行做了什么。行为变了，注释跟着一起改。

## 文档

`README.md` 与 `README.zh-CN.md` 必须同步改，本文件也必须与 `CONTRIBUTING.zh-CN.md` 同步改。文档只用仓内相对路径，不写本机绝对路径。

## 提交信息

使用 Conventional Commits：`feat`、`fix`、`docs`、`style`、`chore`、`test`、`refactor`、`perf`。subject 一句话，正文说明为什么。一个提交只做一件事。

## 拉取请求

CI 十条步骤全绿才可合并。不提交 `dist/`、`demo-dist/`、`node_modules/`。

## 发布

1. 把 `CHANGELOG.md` 与 `CHANGELOG.zh-CN.md` 的 `[Unreleased]` 落成新版本条目，同一提交内改 `package.json` 的 `version`，再跑 `npm run check`。
2. 本地打 annotated tag：`git tag -a v<version> -m "qrcode-motion <version>"`。
3. 推送提交与 tag；`v*` tag 触发 `.github/workflows/release.yml`，在运行器上重跑门禁链后执行 `npm publish --provenance --access public`。
4. 发布令牌取自仓库 secret `NPM_TOKEN`，不要在本机直接发布。
5. 已发布版本不覆写；发错了用 `npm deprecate` 标记，再发补丁版本。

## 我们不接受的做法

- 覆写已发布版本。
- 在提交里带凭据或本机绝对路径。
