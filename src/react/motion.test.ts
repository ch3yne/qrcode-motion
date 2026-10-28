import { describe, expect, it } from "vitest";

import { prefersReducedMotion } from "./motion";

const QUERY = "(prefers-reduced-motion: reduce)";

describe("prefersReducedMotion", () => {
  it("没有可用的 matchMedia 时按不减弱处理", () => {
    expect(prefersReducedMotion(undefined)).toBe(false);
  });

  it("系统偏好减弱动态效果时返回 true", () => {
    expect(prefersReducedMotion(() => ({ matches: true }))).toBe(true);
  });

  it("系统未偏好减弱动态效果时返回 false", () => {
    expect(prefersReducedMotion(() => ({ matches: false }))).toBe(false);
  });

  it("用标准的减弱动态效果查询串调用 matchMedia", () => {
    const queries: string[] = [];
    const fake = (query: string) => {
      queries.push(query);
      return { matches: false };
    };

    prefersReducedMotion(fake);

    expect(queries).toEqual([QUERY]);
  });

  it("matchMedia 抛错时回退为不减弱", () => {
    const throwing = () => {
      throw new Error("matchMedia 不可用");
    };

    expect(prefersReducedMotion(throwing)).toBe(false);
  });
});
