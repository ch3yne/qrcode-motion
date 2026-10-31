## [Unreleased]

## [0.1.1] - 2026-10-31

### 变更

- 发布工作流改用 npm trusted publishing：只申请运行器的 OIDC 令牌，不再读取仓库里存放的长期 secret，仓内也不再保留长效发布凭据。
- Dependabot 对 TypeScript 大版本停止开 PR，等 `typescript-eslint` 放开 peer 区间后再升级，不再每周刷出必然 `npm ci` 失败的 PR。

## [0.1.0] - 2026-10-30

### 新增

- `QrMotion`：按列级联的字符动画，逐帧回落后得到可扫描的二维码，支持可选居中 Logo、手动重播与减弱动效回落。
- `makeMatrix`：与渲染框架无关的二维码矩阵生成，支持 `L`、`M`、`Q`、`H` 四档纠错等级。
- ESM 与 CJS 双格式产物、单一打平的类型声明，以及不进入包的本地演示页。
