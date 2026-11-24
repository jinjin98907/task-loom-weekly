import { describe, expect, it } from "vitest";
import { ATTENDANCE_KINDS, attendanceEntries, documentSummary, emptyAttendance, normalizeAttendance, setAttendanceEntries } from "./attendance";
import { attendanceInRange } from "./attendance-range";
import { buildFullBackup, parseFullBackup, BACKUP_KEYS } from "./full-backup";

const [absent, late, trip] = ATTENDANCE_KINDS;

describe("학생별 출결 서류", () => {
  it("결석계와 선택 추가서류를 별도로 관리한다", () => {
    expect(absent.forms.map((form) => [form.label, form.optional])).toEqual([["결석계", false], ["추가서류", true]]);
    const saved = setAttendanceEntries(emptyAttendance(), absent, [{ name: "김가람", reason: "감기", documents: { absenceForm: true, additional: false } }]);
    expect(saved.absentDocuments).toEqual([{ absenceForm: true, additional: false }]);
    expect(documentSummary(attendanceEntries(saved, absent)[0] ?? { name: "", reason: "" }, absent)).toBe("결석계 제출");
  });
  it("지각에는 서류 항목과 제출 상태가 없다", () => {
    expect(late.forms).toEqual([]);
    expect(late.documents).toBeNull();
    expect(documentSummary({ name: "이가람", reason: "병원" }, late)).toBe("");
  });
  it("체험학습 신청서와 보고서 제출을 독립적으로 저장한다", () => {
    expect(trip.forms.map((form) => form.label)).toEqual(["신청서", "보고서"]);
    const saved = setAttendanceEntries(emptyAttendance(), trip, [{ name: "박가람", reason: "여행", documents: { application: true, report: false } }]);
    expect(saved.tripDocuments).toEqual([{ application: true, report: false }]);
    expect(documentSummary(attendanceEntries(saved, trip)[0] ?? { name: "", reason: "" }, trip)).toBe("신청서 제출 · 보고서 미제출");
  });
  it("학생 삭제 후 다른 학생의 서류 상태가 함께 이동한다", () => {
    const saved = setAttendanceEntries(emptyAttendance(), absent, [
      { name: "첫 학생", reason: "감기", documents: { absenceForm: true } },
      { name: "둘째 학생", reason: "독감", documents: { absenceForm: false, additional: true } },
    ]);
    const removed = setAttendanceEntries(saved, absent, attendanceEntries(saved, absent).slice(1));
    expect(removed.absent).toBe("둘째 학생");
    expect(removed.absentReason).toBe("독감");
    expect(removed.absentDocuments).toEqual([{ absenceForm: false, additional: true }]);
  });
  it("예전 기록은 제출을 임의로 체크하지 않는다", () => {
    const saved = normalizeAttendance({ absent: "김가람", absentReason: "감기" });
    expect(attendanceEntries(saved, absent)[0]?.documents).toBeUndefined();
    expect(documentSummary(attendanceEntries(saved, absent)[0] ?? { name: "", reason: "" }, absent)).toBe("결석계 미제출");
  });
  it("백업 복원 및 기간 모아보기에도 학생별 제출 상태가 유지된다", () => {
    const attendance = setAttendanceEntries(emptyAttendance(), trip, [{ name: "박가람", reason: "여행", documents: { application: true, report: true } }]);
    const dashboard = { "2026-11-24": { attendance } };
    const backup = buildFullBackup({ getItem: (key) => key === BACKUP_KEYS.dashboard ? JSON.stringify(dashboard) : null });
    const restored = parseFullBackup(backup)?.dashboard;
    expect(restored).toBeDefined();
    const rows = attendanceInRange(JSON.parse(restored ?? "{}"), "2026-11-24", "2026-11-24");
    expect(rows[0]?.tripDocuments).toEqual([{ application: true, report: true }]);
  });
});