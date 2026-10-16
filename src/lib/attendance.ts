export type Attendance = {
  absent: string;
  late: string;
  trip: string;
  absentReason: string;
  lateReason: string;
  tripReason: string;
};

export const emptyAttendance = (): Attendance => ({
  absent: "",
  late: "",
  trip: "",
  absentReason: "",
  lateReason: "",
  tripReason: "",
});

const str = (v: unknown) => (typeof v === "string" ? v : "");

// 예전 저장 데이터(백업 포함)에는 trip·사유 칸이 없을 수 있어 항상 여섯 칸으로 채운다.
export const normalizeAttendance = (a: Partial<Attendance> | undefined): Attendance => ({
  absent: str(a?.absent),
  late: str(a?.late),
  trip: str(a?.trip),
  absentReason: str(a?.absentReason),
  lateReason: str(a?.lateReason),
  tripReason: str(a?.tripReason),
});
