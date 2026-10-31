/**
 * Flattens the per-file declarations from tsc into one dist/react/index.d.ts. Those files
 * import each other extensionless, which node16 resolution rejects; a single file resolves nothing.
 */
import { rollup } from "rollup";
import dts from "rollup-plugin-dts";
import { rmSync } from "node:fs";

const bundle = await rollup({
  input: ".dts-tmp/react/index.d.ts",
  plugins: [dts()],
});
await bundle.write({ file: "dist/react/index.d.ts", format: "es" });
await bundle.close();
rmSync(".dts-tmp", { recursive: true, force: true });
console.log("✓ dist/react/index.d.ts (flattened)");
