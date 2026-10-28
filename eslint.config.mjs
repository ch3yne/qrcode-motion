import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

/* 兜底作用域：仓内所有源码扩展名都在这里，新增的 ts/tsx/mjs 文件默认进 lint，不再逐目录列白名单 */
const allSources = ["**/*.{js,mjs,cjs,ts,tsx}"];
const sources = ["src/**/*.{ts,tsx}"];
const demoFiles = ["demo/**/*.{ts,tsx}"];
/*
 * 类型感知范围只取 tsconfig.json include 里的 ts/tsx（src 与 demo）。
 * scripts/**\/*.mjs 与三个 vite/vitest 配置保持非类型感知：vitest.config.ts 根本不在 tsconfig 的 include 里，
 * 给它挂 projectService 只会换来一条「was not found by the project service」的 parser 报错，检查反而变少。
 */
const typedSources = [...sources, ...demoFiles];
const scriptFiles = ["scripts/**/*.mjs"];
const configFiles = [
  "vite.config.ts",
  "vite.lib.config.ts",
  "vitest.config.ts",
];

const reactRules = {
  "react-hooks/rules-of-hooks": "error",
  "react-hooks/exhaustive-deps": "warn",
};

export default [
  {
    ignores: [
      "dist/**",
      "demo-dist/**",
      "node_modules/**",
      "preview.png",
      "preview.gif",
      "AGENTS.md",
    ],
  },
  {
    files: allSources,
    ...js.configs.recommended,
  },
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: allSources,
  })),
  ...tseslint.configs.strictTypeChecked.map((config) => ({
    ...config,
    files: typedSources,
  })),
  {
    files: typedSources,
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: typedSources,
    rules: {
      /* 豁免 1/3：render.ts 用模板字面量拼 CSS 颜色（rgb/rgba 的整数通道），数值插值无损且确定；该规则要防的是对象/Symbol 被隐式转成 "[object Object]" 或抛错，0–255 的整数通道不可能走到那条路径，改成 String(x) 只会把颜色拼接写得更难读 */
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        { allowNumber: true },
      ],
    },
  },
  {
    files: sources,
    languageOptions: { globals: { ...globals.browser } },
    plugins: { "react-hooks": reactHooks },
    /* React Compiler 规则组（refs、use-memo、set-state-in-effect、purity、immutability、globals、static-components、preserve-manual-memoization）本次不引入、留待专项评估：它们面向 React Compiler 编译目标，而本库在 render 期写 latest-ref、在 useMemo 内派发错误，按其判定改动等于改发布代码的运行时语义 */
    rules: reactRules,
  },
  {
    files: demoFiles,
    languageOptions: { globals: { ...globals.browser } },
    plugins: { "react-hooks": reactHooks },
    rules: reactRules,
  },
  {
    files: [...configFiles, ...scriptFiles],
    languageOptions: { globals: { ...globals.node } },
  },
];
