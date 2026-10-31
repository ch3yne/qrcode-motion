import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Library JS output: ESM + CJS into dist/react/. Type declarations are flattened by scripts/build-dts.mjs.
 *
 * Single entry today (React), but the output is already split per framework: adding a Vue or vanilla
 * entry means one more src/vue/index.ts and one more exports field, with published paths untouched.
 *
 * - react / react-dom / jsx-runtime must stay external, or the development React build gets inlined
 * - qrcode-generator is a runtime dependency and stays external instead of being redistributed
 * - the banner adds "use client": the components use hooks and must be a client module under RSC
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
