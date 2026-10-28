/**
 * 把 tsc 产出的逐文件声明打平成单文件 dist/react/index.d.ts。
 * 逐文件声明里的相对导入不带扩展名，在 node16 解析下会失败，
 * 打平后只剩一个文件，任何解析模式都能正常工作。
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
console.log("✓ dist/react/index.d.ts（已打平）");
