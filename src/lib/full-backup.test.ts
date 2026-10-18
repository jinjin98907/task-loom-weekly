import { describe, it, expect } from "vitest";
import { buildFullBackup, parseFullBackup } from "./full-backup";

const mem = (o: Record<string, string>) => ({ getItem: (k: string) => o[k] ?? null });

describe("full backup", () => {
  it("includes all four data sets", () => {
    const b = buildFullBackup(mem({
      "teacher-dashboard-v1": '{"2026-10-16":{}}', "teacher-yearly-timetable-v1": '{"a":1}',
      "teacher-yearly-color-rules-v1": '[{"w":"x"}]', "teacher-my-class-v1": "2" }));
    expect(b.dashboard).toEqual({ "2026-10-16": {} });
    expect(b.yearly).toEqual({ a: 1 });
    expect(b.rules).toEqual([{ w: "x" }]);
    expect(b.myClass).toBe(2);
  });
  it("restores everything from a combined backup", () => {
    const r = parseFullBackup({ app: "teacher-all", dashboard: {}, yearly: { a: 1 }, rules: [], myClass: 1 });
    expect(r).toEqual({ dashboard: "{}", yearly: '{"a":1}', rules: "[]", myClass: "1" });
  });
  it("accepts old timetable-only and dashboard-only files", () => {
    expect(parseFullBackup({ v: 2, cells: { a: 1 }, rules: [] })).toEqual({ yearly: '{"a":1}', rules: "[]" });
    expect(parseFullBackup({ "2026-10-16": {} })).toEqual({ dashboard: '{"2026-10-16":{}}' });
    expect(parseFullBackup([])).toBeNull();
  });
});

describe("memo backup", () => {
  it("includes and restores memos", () => {
    const b = buildFullBackup(mem({ "teacher-memos-v2": '[{"id":"a","title":"t","text":"x"}]' }));
    expect(b.memo).toEqual([{ id: "a", title: "t", text: "x" }]);
    expect(parseFullBackup({ app: "teacher-all", memo: [{ id: "a" }] })?.memo).toBe('[{"id":"a"}]');
  });
});
