/**
 * Types for both module formats: CJS consumers resolve .d.cts, and without it TypeScript finds
 * no types under require. Both declarations are identical, so this copies one to the other.
 */
import { copyFileSync } from "node:fs";

copyFileSync("dist/react/index.d.ts", "dist/react/index.d.cts");
console.log("✓ dist/react/index.d.cts");
