import { describe, expect, it } from "vitest";

import { emptyAttendance, normalizeAttendance } from "@/lib/attendance";

describe("출결 칸", () => {
  it("빈 출결은 결석·지각·교외 체험학습 세 칸을 모두 가진다", () => {
    expect(emptyAttendance()).toEqual({ absent: "", late: "", trip: "" });
  });

  it("교외 체험학습 칸이 없는 예전 저장 데이터도 세 칸으로 불러온다", () => {
    expect(normalizeAttendance({ absent: "홍길동", late: "김철수" })).toEqual({
      absent: "홍길동",
      late: "김철수",
      trip: "",
    });
  });

  it("교외 체험학습 내용을 그대로 유지한다", () => {
    expect(normalizeAttendance({ trip: "이영희, 박민수" }).trip).toBe("이영희, 박민수");
  });

  it("값이 없는 기록도 빈 칸 세 개로 처리한다", () => {
    expect(normalizeAttendance(undefined)).toEqual({ absent: "", late: "", trip: "" });
    expect(normalizeAttendance({ absent: null as unknown as string })).toEqual({
      absent: "",
      late: "",
      trip: "",
    });
  });
});
