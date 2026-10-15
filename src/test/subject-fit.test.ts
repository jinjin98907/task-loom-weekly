import { describe, expect, it } from "vitest";
import { MAX_SUBJECT_ROWS, subjectFit } from "@/lib/subject-fit";

describe("과목 칸 글자 맞춤 규칙", () => {
  it("비어 있거나 짧은 과목명은 글씨를 줄이지 않고 한 줄", () => {
    expect(subjectFit("")).toEqual({ fontClass: "text-xs", rows: 1, charsPerLine: 3 });
    expect(subjectFit("수학")).toEqual({ fontClass: "text-xs", rows: 1, charsPerLine: 3 });
  });

  it("5글자(재량휴업일)는 글씨를 11px로 줄이고 2줄", () => {
    expect(subjectFit("재량휴업일")).toEqual({ fontClass: "text-[11px]", rows: 2, charsPerLine: 4 });
  });

  it("7글자(창의적체험활동)도 11px, 2줄", () => {
    expect(subjectFit("창의적체험활동")).toEqual({ fontClass: "text-[11px]", rows: 2, charsPerLine: 4 });
  });

  it("10글자는 10px로 더 줄이고 2줄", () => {
    expect(subjectFit("학교자체학습활동나흘")).toEqual({ fontClass: "text-[10px]", rows: 2, charsPerLine: 5 });
  });

  it("20글자는 가장 작은 9px, 4줄", () => {
    expect(subjectFit("가".repeat(20))).toEqual({ fontClass: "text-[9px]", rows: 4, charsPerLine: 6 });
  });

  it("줄바꿈은 줄 수에 그대로 반영", () => {
    expect(subjectFit("수\n\n학")).toEqual({ fontClass: "text-xs", rows: 3, charsPerLine: 3 });
  });

  it("아주 길어도 8줄을 넘지 않는다", () => {
    expect(subjectFit("가".repeat(200)).rows).toBe(MAX_SUBJECT_ROWS);
  });

  it("칸 폭을 직접 주면 그 폭에 맞춰 줄 수를 센다", () => {
    expect(subjectFit("수학", 1)).toEqual({ fontClass: "text-xs", rows: 2, charsPerLine: 1 });
  });
});
