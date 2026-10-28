import { defineConfig } from "vitest/config";

/* 只跑 src 下的纯逻辑测试：被测算代码不碰 DOM，node 环境足够 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    /* text 给终端与 CI 日志；html 供人翻看；lcov 给外部工具；产物落 coverage/（已 gitignore），CI 以 artifact 上传 */
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts"],
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "coverage",
      /* 阈值只对纯逻辑层生效，就是约定的 90/90/80/90：
         假 2D 上下文让 render.ts 的画布绘制在 node 环境也测得动。数字只允许上调，回落即失败 */
      thresholds: {
        "src/core/**/*.ts": {
          lines: 90,
          functions: 90,
          branches: 80,
          statements: 90,
        },
      },
    },
  },
});
