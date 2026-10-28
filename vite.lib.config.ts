import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * 组件库的 JS 产物：ESM + CJS，输出到 dist/react/。类型声明由 scripts/build-dts.mjs 打平。
 *
 * 现在是单入口（React），但产物已按框架分目录 —— 将来加 Vue 或 vanilla 入口时，
 * 只是多一个 src/vue/index.ts 和一条 exports，不会动到已发布的路径。
 *
 * - react / react-dom / jsx-runtime 必须外置，否则会把开发版 React 内联进包里
 * - qrcode-generator 作为运行时依赖外置，不在包内重复分发
 * - 入口加 "use client"：组件用了 hooks，RSC 下必须声明为客户端模块
 */
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
    target: "es2019",
    lib: {
      entry: "src/react/index.ts",
      formats: ["es", "cjs"],
      fileName: (format) =>
        format === "es" ? "react/index.js" : "react/index.cjs",
    },
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "qrcode-generator",
      ],
      output: {
        banner: '"use client";',
        exports: "named",
      },
    },
  },
});
