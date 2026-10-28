/**
 * 产物自检：源码正确不代表发出去的包正确，这里只检查 dist。
 * 任何一条不过就以非零码退出，避免把坏包发出去。
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

/* 1. "use client" 必须是 ESM 的第一条语句，否则 RSC 下整个包被判为服务端模块 */
check(
  /^["']use client["'];/.test(esm.trimStart()),
  'ESM 首条语句是 "use client"',
  'ESM 缺少 "use client" 指令（Rollup 会剥掉它，需要 banner 兜住）',
);

/* 2. 不能内联 React 或 jsx-runtime */
check(
  !/process\.env/.test(esm),
  "产物中没有 process.env",
  "产物中残留 process.env，说明内联了开发版 React",
);
check(
  /from\s*["']react\/jsx-runtime["']/.test(esm),
  "jsx-runtime 保持外置",
  "jsx-runtime 没有被外部引入，可能已被内联",
);
check(
  /from\s*["']qrcode-generator["']/.test(esm),
  "qrcode-generator 保持外置",
  "qrcode-generator 被内联，应与依赖一起外置",
);
check(
  !/__SECRET_INTERNALS/.test(esm) && !/react\.production\.min/.test(esm),
  "React 本体未被内联",
  "React 本体被内联进产物",
);

/* 3. 类型声明齐全，且导出的是新名字 */
check(
  dts.includes("QrMotionProps"),
  "d.ts 含 QrMotionProps",
  "d.ts 缺少 QrMotionProps",
);
check(dts.includes("LogoSource"), "d.ts 含 LogoSource", "d.ts 缺少 LogoSource");
check(
  !/\bCreativeQr\b/.test(dts) && !/\bCreativeQr\b/.test(esm),
  "产物中已无旧名 CreativeQr",
  "产物里仍残留旧名 CreativeQr，改名没覆盖全",
);

/* 4. CJS 消费者也要有类型 */
check(
  readdirSync(join(DIST, "react")).includes("index.d.cts"),
  "d.cts 存在（CJS 类型可用）",
  "缺少 react/index.d.cts，require 场景拿不到类型",
);

/* 5. 包里不能出现个人素材（递归查，产物已按框架分目录） */
const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
const images = walk(DIST).filter((f) => /\.(png|jpe?g|webp|gif|svg)$/i.test(f));
check(
  images.length === 0,
  "dist 不含任何图片素材",
  `dist 里混进了图片：${images.map((f) => relative(DIST, f)).join(", ")}`,
);

/* 6. 目录结构要符合 exports 的承诺 */
check(
  readFileSync(join(DIST, "react/index.cjs"), "utf8").length > 0,
  "产物落在 dist/react/ 下",
  "产物路径与 package.json 的 exports 不一致",
);

for (const m of passes) console.log(`✓ ${m}`);
for (const m of fails) console.error(`✗ ${m}`);
console.log(`\n${passes.length} passed, ${fails.length} failed`);
if (fails.length) process.exit(1);
