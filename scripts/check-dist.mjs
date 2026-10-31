/**
 * Artifact self-check: correct source does not mean a correct published package, so only dist is
 * inspected here. Any failing check exits non-zero to keep a broken package from shipping.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const DIST = "dist";
const ENTRY = "react/index.js";
const read = (f) => readFileSync(join(DIST, f), "utf8");

const fails = [];
const passes = [];
const check = (cond, okMsg, failMsg) =>
  cond ? passes.push(okMsg) : fails.push(failMsg);

const esm = read(ENTRY);
read("react/index.cjs");
const dts = read("react/index.d.ts");

/* 1. "use client" must be the first ESM statement, or RSC treats the whole package as a server module */
check(
  /^["']use client["'];/.test(esm.trimStart()),
  'ESM starts with the "use client" directive',
  'ESM is missing the "use client" directive (Rollup strips it, so the banner has to restore it)',
);

/* 2. React and jsx-runtime must not be inlined */
check(
  !/process\.env/.test(esm),
  "no process.env in the output",
  "process.env left in the output, so the development React build got inlined",
);
check(
  /from\s*["']react\/jsx-runtime["']/.test(esm),
  "jsx-runtime stays external",
  "jsx-runtime is not imported from outside, so it may be inlined",
);
check(
  /from\s*["']qrcode-generator["']/.test(esm),
  "qrcode-generator stays external",
  "qrcode-generator was inlined; it is a dependency and belongs outside",
);
check(
  !/__SECRET_INTERNALS/.test(esm) && !/react\.production\.min/.test(esm),
  "React itself is not inlined",
  "React itself was inlined into the output",
);

/* 3. Declarations are complete and export the current names */
check(
  dts.includes("QrMotionProps"),
  "d.ts contains QrMotionProps",
  "d.ts is missing QrMotionProps",
);
check(
  dts.includes("LogoSource"),
  "d.ts contains LogoSource",
  "d.ts is missing LogoSource",
);
check(
  !/\bCreativeQr\b/.test(dts) && !/\bCreativeQr\b/.test(esm),
  "no CreativeQr left in the artifacts",
  "CreativeQr is still in the artifacts; the rename did not cover everything",
);

/* 4. CJS consumers need types too */
check(
  readdirSync(join(DIST, "react")).includes("index.d.cts"),
  "index.d.cts exists, so CJS types resolve",
  "react/index.d.cts is missing; require consumers get no types",
);

/* 5. No personal assets in the package (recursive, since artifacts are split per framework) */
const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
const images = walk(DIST).filter((f) => /\.(png|jpe?g|webp|gif|svg)$/i.test(f));
check(
  images.length === 0,
  "dist contains no image assets",
  `images leaked into dist: ${images.map((f) => relative(DIST, f)).join(", ")}`,
);

/* 6. Directory layout has to match what exports promises */
check(
  readFileSync(join(DIST, "react/index.cjs"), "utf8").length > 0,
  "artifacts land under dist/react/",
  "artifact paths do not match package.json exports",
);

for (const m of passes) console.log(`✓ ${m}`);
for (const m of fails) console.error(`✗ ${m}`);
console.log(`\n${passes.length} passed, ${fails.length} failed`);
if (fails.length) process.exit(1);
