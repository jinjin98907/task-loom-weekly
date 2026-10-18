import { describe, expect, it } from "vitest";
import { addSnapshot, recordChange, redoStep, undoStep, MAX_SNAPSHOTS, HISTORY_KEYS, type DataState } from "./history";

const st = (v: string): DataState => Object.fromEntries(HISTORY_KEYS.map((k, i) => [k, i === 0 ? v : null]));

describe("undo/redo", () => {
  it("undo returns previous state and redo brings it back", () => {
    let s = recordChange({ undo: [], redo: [], lastPushAt: 0 }, st("a"), 10_000);
    const u = undoStep(s, st("b"))!;
    expect(u.target).toEqual(st("a"));
    const r = redoStep(u.stacks, st("a"))!;
    expect(r.target).toEqual(st("b"));
    s = r.stacks;
    expect(s.undo.length).toBe(1);
  });
  it("rapid changes within 1.5s merge into one step", () => {
    let s = recordChange({ undo: [], redo: [], lastPushAt: 0 }, st("a"), 10_000);
    s = recordChange(s, st("b"), 10_500);
    expect(s.undo).toEqual([st("a")]);
    s = recordChange(s, st("c"), 13_000);
    expect(s.undo.length).toBe(2);
  });
});

describe("snapshots", () => {
  it("keeps at most 20 versions, newest first", () => {
    let l: ReturnType<typeof addSnapshot> = [];
    for (let i = 0; i < 25; i++) l = addSnapshot(l, st(String(i)), i * 120_000);
    expect(l.length).toBe(MAX_SNAPSHOTS);
    expect(l[0]?.state).toEqual(st("24"));
  });
  it("changes within a minute update the latest version instead of adding", () => {
    let l = addSnapshot([], st("a"), 0);
    l = addSnapshot(l, st("b"), 30_000);
    expect(l.length).toBe(1);
    expect(l[0]?.state).toEqual(st("b"));
  });
});
