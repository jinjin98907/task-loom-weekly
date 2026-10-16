import { describe, expect, it } from "vitest";
import { normalizeNotices } from "@/lib/day-data";

describe("normalizeNotices", () => {
  it("예전 안내사항 글 한 칸을 줄바꿈 기준으로 항목으로 옮긴다", () => {
    const out = normalizeNotices({ notice: "체험학습: 체육관\n\n결석/지각: 없음\n" });
    expect(out.map((t) => t.text)).toEqual(["체험학습: 체육관", "결석/지각: 없음"]);
    expect(out.every((t) => t.done === false)).toBe(true);
    expect(new Set(out.map((t) => t.id)).size).toBe(2);
  });

  it("이미 항목 목록으로 저장된 안내사항을 그대로 쓴다", () => {
    const items = [{ id: "a", text: "운동회 준비", done: true }];
    expect(normalizeNotices({ notices: items, notice: "무시" })).toEqual(items);
  });

  it("글이 없으면 빈 목록", () => {
    expect(normalizeNotices({})).toEqual([]);
    expect(normalizeNotices({ notice: "   \n  " })).toEqual([]);
  });
});
