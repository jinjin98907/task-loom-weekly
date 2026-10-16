import { describe, expect, it } from "vitest";
import { attendanceInRange, attendanceRangeError } from "./attendance-range";

describe("기간별 출결 모아보기", () => {
  it("선택 기간의 시작일과 종료일을 모두 포함하고 날짜순으로 모은다", () => {
    const store = {
      "2026-10-16": { attendance: { trip: "테스트 학생 C" } },
      "2026-10-17": { attendance: { absent: "기간 밖" } },
      "2026-10-14": { attendance: { absent: "기간 밖" } },
      "2026-10-15": { attendance: { absent: "테스트 학생 A", late: "테스트 학생 B" } },
    };
    expect(attendanceInRange(store, "2026-10-15", "2026-10-16")).toEqual([
      {
        date: "2026-10-15",
        absent: "테스트 학생 A",
        late: "테스트 학생 B",
        trip: "",
        absentReason: "",
        lateReason: "",
        tripReason: "",
      },
      {
        date: "2026-10-16",
        absent: "",
        late: "",
        trip: "테스트 학생 C",
        absentReason: "",
        lateReason: "",
        tripReason: "",
      },
    ]);
  });

  it("하루만 선택해도 결석·지각·교외 체험학습 원문, 사유, 줄바꿈을 유지한다", () => {
    const attendance = {
      absent: "학생 A\n학생 B",
      late: "학생 C",
      trip: "학생 D (오전)",
      absentReason: "독감",
      lateReason: "",
      tripReason: "가족 여행",
    };
    expect(attendanceInRange({ "2026-10-15": { attendance } }, "2026-10-15", "2026-10-15"))
      .toEqual([{ date: "2026-10-15", ...attendance }]);
  });

  it("출결이 없는 날짜나 빈 기록은 제외한다", () => {
    expect(attendanceInRange({
      "2026-10-15": { todos: [{ text: "업무" }] },
      "2026-10-16": { attendance: { absent: "  ", late: "", trip: "\n" } },
    }, "2026-10-01", "2026-10-31")).toEqual([]);
  });

  it("종료일이 시작일보다 앞이면 조회하지 않는다", () => {
    expect(attendanceRangeError("2026-10-16", "2026-10-15")).not.toBeNull();
    expect(attendanceInRange({ "2026-10-15": { attendance: { absent: "학생 A" } } }, "2026-10-16", "2026-10-15")).toEqual([]);
  });

  it("날짜 미선택 또는 존재하지 않는 날짜는 조회하지 않는다", () => {
    expect(attendanceRangeError("", "2026-10-15")).not.toBeNull();
    expect(attendanceRangeError("2026-02-30", "2026-03-01")).not.toBeNull();
    expect(attendanceRangeError("2026-10-15", "2026-10-15")).toBeNull();
  });
});