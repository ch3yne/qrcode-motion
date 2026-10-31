import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

/* Catch-all scope: every source extension in the repo is linted by default, so a new ts/tsx/mjs file needs no per-directory allowlist entry. */
const allSources = ["**/*.{js,mjs,cjs,ts,tsx}"];
const sources = ["src/**/*.{ts,tsx}"];
const demoFiles = ["demo/**/*.{ts,tsx}"];
/*
 * Type-aware linting covers only the ts/tsx files listed in tsconfig.json: src and demo.
 * scripts/**\/*.mjs and the three vite/vitest configs stay type-unaware. vitest.config.ts is not in tsconfig.json's include, so attaching projectService only produces a "was not found by the project service" parser error and fewer rules run in exchange.
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
      /* Exemption 1 of 3: render.ts builds CSS colour strings from integer channels inside a template literal. The rule guards against objects and symbols turning into "[object Object]" or throwing; an integer in 0-255 cannot reach that path, and String(x) would only make the colour concatenation harder to read. */
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
    /* React Compiler rule set (refs, use-memo, set-state-in-effect, purity, immutability, globals, static-components, preserve-manual-memoization) is left out on purpose: those rules target the compiler build, while this library writes a latest-ref during render and raises errors inside useMemo, so adopting them would change the runtime semantics of shipped code. Revisit as a separate evaluation. */
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
