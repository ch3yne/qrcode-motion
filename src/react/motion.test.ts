import { describe, expect, it } from "vitest";

import { prefersReducedMotion } from "./motion";

const QUERY = "(prefers-reduced-motion: reduce)";

describe("prefersReducedMotion", () => {
  it("returns false when no matchMedia is available", () => {
    expect(prefersReducedMotion(undefined)).toBe(false);
  });

  it("returns true when the system prefers reduced motion", () => {
    expect(prefersReducedMotion(() => ({ matches: true }))).toBe(true);
  });

  it("returns false when the system does not prefer reduced motion", () => {
    expect(prefersReducedMotion(() => ({ matches: false }))).toBe(false);
  });

  it("queries matchMedia with the standard reduced motion query", () => {
    const queries: string[] = [];
    const fake = (query: string) => {
      queries.push(query);
      return { matches: false };
    };

    prefersReducedMotion(fake);

    expect(queries).toEqual([QUERY]);
  });

  it("falls back to false when matchMedia throws", () => {
    const throwing = () => {
      throw new Error("matchMedia unavailable");
    };

    expect(prefersReducedMotion(throwing)).toBe(false);
  });
});
