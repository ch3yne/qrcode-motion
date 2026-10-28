/**
 * 双格式的类型声明：CJS 消费者要走 .d.cts，否则 TS 在 require 场景下解析不到类型。
 * 两份声明内容一致，直接复制。
 */
import { copyFileSync } from "node:fs";

copyFileSync("dist/react/index.d.ts", "dist/react/index.d.cts");
console.log("✓ dist/react/index.d.cts");
