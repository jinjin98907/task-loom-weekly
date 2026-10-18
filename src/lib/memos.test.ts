import { describe, expect, it } from "vitest";
import { descendantIds, indentLines, normalizeMemos, parseLines, searchMemos, visibleLines } from "./memos";

describe("memo pages", () => {
  it("keeps parentId and lifts orphans to top level", () => {
    const m = normalizeMemos([{ id: "a", title: "A", text: "" }, { id: "b", title: "B", text: "", parentId: "a" }, { id: "c", title: "C", text: "", parentId: "zz" }]);
    expect(m[1]!.parentId).toBe("a");
    expect(m[2]!.parentId).toBeUndefined();
  });
  it("deleting a page includes all sub pages", () => {
    const m = normalizeMemos([{ id: "a" }, { id: "b", parentId: "a" }, { id: "c", parentId: "b" }, { id: "d" }]);
    expect(descendantIds(m, "a").sort()).toEqual(["a", "b", "c"]);
  });
  it("search matches title and body", () => {
    const m = normalizeMemos([{ id: "a", title: "운동회", text: "" }, { id: "b", title: "x", text: "운동장 준비" }, { id: "c", title: "y", text: "z" }]);
    expect(searchMemos(m, "운동").map((x) => x.id)).toEqual(["a", "b"]);
  });
});

describe("indent and toggle", () => {
  it("Tab indents by 2 spaces, Shift+Tab removes", () => {
    expect(indentLines("a\nb", 0, 3, false).text).toBe("  a\n  b");
    expect(indentLines("  a\nb", 0, 5, true).text).toBe("a\nb");
  });
  it("closed toggle hides deeper lines only", () => {
    const rows = parseLines("> 제목\n  내용1\n  내용2\n다음");
    expect(visibleLines(rows, new Set([0])).map((r) => r.text)).toEqual(["제목", "다음"]);
    expect(visibleLines(rows, new Set()).length).toBe(4);
  });
});
