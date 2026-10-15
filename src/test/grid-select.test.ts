import { describe, expect, it } from "vitest";
import { inSel, selToTSV } from "@/lib/grid-select";

describe("grid selection copy", () => {
  it("copies a dragged range as rows and tabs, even when dragged backwards", () => {
    const get = (r: number, c: number) => `${r}-${c}`;
    expect(selToTSV({ r0: 1, c0: 2, r1: 0, c1: 1 }, get)).toBe("0-1\t0-2\n1-1\t1-2");
  });
  it("knows which cells are inside the range", () => {
    expect(inSel({ r0: 2, c0: 2, r1: 0, c1: 0 }, 1, 1)).toBe(true);
    expect(inSel({ r0: 2, c0: 2, r1: 0, c1: 0 }, 3, 1)).toBe(false);
  });
});
