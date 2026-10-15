import { describe, expect, it } from "vitest";
import { dateKey, monthGrid, nextTag } from "@/lib/calendar";

describe("monthGrid", () => {
  it("October 2026 starts on Sunday Sep 27 and has 5 weeks", () => {
    const g = monthGrid(2026, 9);
    expect(dateKey(g[0]![0]!)).toBe("2026-09-27");
    expect(g.length).toBe(5);
    expect(dateKey(g[4]![6]!)).toBe("2026-10-31");
  });
  it("tag cycles normal → important → deadline → normal", () => {
    expect(nextTag(undefined)).toBe("important");
    expect(nextTag("important")).toBe("deadline");
    expect(nextTag("deadline")).toBe(undefined);
  });
});
