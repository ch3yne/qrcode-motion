import { defineConfig } from "vitest/config";

/* Only the pure logic under src is tested; the code under test touches no DOM, so node is enough */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    /* text for terminal and CI logs, html for humans, lcov for external tools; output lands in coverage/ (gitignored) and CI uploads it as an artifact */
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts"],
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "coverage",
      /* The fake 2D context lets render.ts draw in the node environment. A run below any threshold fails. */
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
