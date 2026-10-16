import { describe, expect, it } from "vitest";

import { emptyAttendance, normalizeAttendance } from "@/lib/attendance";

describe("출결 칸", () => {
  it("빈 출결은 결석·지각·교외 체험학습 세 항목과 각 사유 칸을 모두 가진다", () => {
    expect(emptyAttendance()).toEqual({
      absent: "",
      late: "",
      trip: "",
      absentReason: "",
      lateReason: "",
      tripReason: "",
    });
  });

  it("교외 체험학습 칸이 없는 예전 저장 데이터도 여섯 칸으로 불러온다", () => {
    expect(normalizeAttendance({ absent: "홍길동", late: "김철수" })).toEqual({
      absent: "홍길동",
      late: "김철수",
      trip: "",
      absentReason: "",
      lateReason: "",
      tripReason: "",
    });
  });

  it("교외 체험학습 내용과 사유를 그대로 유지한다", () => {
    const saved = normalizeAttendance({ trip: "이영희, 박민수", tripReason: "가족 여행" });
    expect(saved.trip).toBe("이영희, 박민수");
    expect(saved.tripReason).toBe("가족 여행");
  });

  it("결석·지각 사유를 그대로 유지한다", () => {
    const saved = normalizeAttendance({ absent: "학생 A", absentReason: "독감", late: "학생 B", lateReason: "병원 진료" });
    expect(saved.absentReason).toBe("독감");
    expect(saved.lateReason).toBe("병원 진료");
  });

  it("값이 없는 기록도 빈 칸 여섯 개로 처리한다", () => {
    expect(normalizeAttendance(undefined)).toEqual(emptyAttendance());
    expect(normalizeAttendance({ absent: null as unknown as string })).toEqual(emptyAttendance());
  });
});
