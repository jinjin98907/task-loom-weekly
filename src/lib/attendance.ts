export type Attendance = { absent: string; late: string; trip: string };

export const emptyAttendance = (): Attendance => ({ absent: "", late: "", trip: "" });

const str = (v: unknown) => (typeof v === "string" ? v : "");

// 예전 저장 데이터(백업 포함)에는 trip 칸이 없을 수 있어 항상 세 칸으로 채운다.
export const normalizeAttendance = (a: Partial<Attendance> | undefined): Attendance => ({
  absent: str(a?.absent),
  late: str(a?.late),
  trip: str(a?.trip),
});
