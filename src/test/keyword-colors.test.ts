import { describe, expect, it } from "vitest";
import { DEFAULT_RULES, normalizeRules, parseBackup, styleFor, type ColorRule } from "@/lib/keyword-colors";

describe("styleFor", () => {
  it("사용자 규칙 단어가 들어가면 지정한 글자색·배경색을 반환한다", () => {
    const rules: ColorRule[] = [{ word: "등산", color: "#059669", bg: "#D1FAE5" }];
    expect(styleFor("등산대회", rules)).toEqual({ color: "#059669", background: "#D1FAE5" });
  });

  it("글자색만 지정하면 배경색은 없다", () => {
    const rules: ColorRule[] = [{ word: "독서", color: "#B45309" }];
    expect(styleFor("독서", rules)).toEqual({ color: "#B45309" });
  });

  it("사용자 규칙이 기본 규칙보다 우선한다", () => {
    // '시험'은 기본 규칙에서 붉은색. 사용자가 초록으로 바꾸면 초록이 이겨야 한다.
    const rules: ColorRule[] = [{ word: "시험", color: "#059669" }];
    expect(styleFor("단어시험", rules)).toEqual({ color: "#059669" });
  });

  it("규칙에 없는 단어는 색 없음, 기본 규칙 단어는 기본 색", () => {
    expect(styleFor("수학", [])).toEqual({});
    const first = styleFor("소방교육", []);
    expect(first.color).toBe(DEFAULT_RULES.find((r) => r.word === "소방교육")!.color);
  });

  it("빈 텍스트는 색 없음", () => {
    expect(styleFor("", [{ word: "x", color: "#000" }])).toEqual({});
  });

  it("같은 단어 규칙이 여러 개면 먼저 등록된 것이 이긴다", () => {
    const rules = normalizeRules([
      { word: "창중", color: "#059669" },
      { word: "창중", color: "#B45309" },
    ]);
    expect(styleFor("창중", rules)).toEqual({ color: "#059669" });
  });
});

describe("normalizeRules", () => {
  it("단어가 비었거나 색이 전혀 없는 규칙은 버린다", () => {
    expect(normalizeRules([{ word: "", color: "#000" }, { word: "x" }, { word: "y", color: "#111" }]))
      .toEqual([{ word: "y", color: "#111" }]);
  });
});

describe("parseBackup", () => {
  it("새 형식(v2): cells + rules를 나눠 돌려준다", () => {
    const d = { v: 2, cells: { "2026-03-02|0|0": { t: "국어" } }, rules: [{ word: "등산", color: "#059669" }] };
    expect(parseBackup(d)).toEqual({
      cells: d.cells,
      rules: [{ word: "등산", color: "#059669" }],
    });
  });

  it("구버전 백업(셀 맵)은 rules 없이 cells로 본다", () => {
    const d = { "2026-03-02|0|0": { t: "국어" } };
    expect(parseBackup(d)).toEqual({ cells: d, rules: [] });
  });

  it("배열·null 같은 잘못된 데이터는 null", () => {
    expect(parseBackup([1, 2])).toBeNull();
    expect(parseBackup(null)).toBeNull();
  });
});
