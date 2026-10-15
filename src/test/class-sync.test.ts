import { describe, expect, it } from "vitest";
import { normalizeClass, setSubject, subjectFor } from "@/lib/class-sync";

describe("class sync", () => {
  it("dashboard subject reads the selected class's yearly cell", () => {
    const cells = { "2026-10-15|1|0": { t: "창중" }, "2026-10-15|0|0": { t: "국" } };
    expect(subjectFor(cells, "2026-10-15", 1, 0)).toBe("창중");
    expect(subjectFor(cells, "2026-10-15", 0, 0)).toBe("국");
  });
  it("editing on the dashboard writes to that class only and keeps manual colors", () => {
    const cells = { "2026-10-15|2|3": { t: "수", c: "#DC2626" } };
    const next = setSubject(cells, "2026-10-15", 2, 3, "과");
    expect(next["2026-10-15|2|3"]).toEqual({ t: "과", c: "#DC2626" });
    expect(next["2026-10-15|0|3"]).toBeUndefined();
  });
  it("falls back to old dashboard value when the yearly cell is empty", () => {
    expect(subjectFor({}, "2026-10-15", 0, 0, "국어")).toBe("국어");
  });
  it("class choice defaults to 1반", () => {
    expect(normalizeClass("2")).toBe(2);
    expect(normalizeClass(null)).toBe(0);
  });
});
