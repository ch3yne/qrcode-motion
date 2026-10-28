import { describe, expect, it } from "vitest";

import { makeMatrix } from "./matrix";

const URL_TEXT = "https://github.com/ch3yne/qrcode-motion";

describe("makeMatrix", () => {
  it("returns a square matrix whose size is a positive integer", () => {
    const matrix = makeMatrix(URL_TEXT);

    expect(Number.isInteger(matrix.size)).toBe(true);
    expect(matrix.size).toBeGreaterThan(0);
    expect(matrix.cells).toBeInstanceOf(Uint8Array);
    expect(matrix.cells.length).toBe(matrix.size * matrix.size);
  });

  it("encodes every cell as either 0 or 1", () => {
    const matrix = makeMatrix(URL_TEXT);
    const values = new Set(matrix.cells.values());

    expect([...values].sort((a, b) => a - b)).toEqual([0, 1]);
  });

  it("returns byte-identical cells for the same input", () => {
    const first = makeMatrix(URL_TEXT);
    const second = makeMatrix(URL_TEXT);

    expect(second.size).toBe(first.size);
    expect(Array.from(second.cells)).toEqual(Array.from(first.cells));
  });

  it("never shrinks when the payload grows", () => {
    const short = makeMatrix("A", "M");
    const long = makeMatrix("A".repeat(400), "M");

    expect(long.size).toBeGreaterThanOrEqual(short.size);
    expect(long.size).toBeGreaterThan(short.size);
    expect(long.cells.length).toBe(long.size * long.size);
  });

  it("gives ec=H a size no smaller than ec=L", () => {
    const low = makeMatrix(URL_TEXT, "L");
    const high = makeMatrix(URL_TEXT, "H");

    expect(high.size).toBeGreaterThanOrEqual(low.size);
  });
});
