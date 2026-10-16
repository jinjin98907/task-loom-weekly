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

export type StudentEntry = { name: string; reason: string };

/** 이름·사유 칸은 줄 단위로 짝을 이룬다 (n번째 줄 이름 ↔ n번째 줄 사유). */
export const toEntries = (names: string, reasons: string): StudentEntry[] => {
  const n = names.split("\n");
  const r = reasons.split("\n");
  const len = Math.max(n.length, r.length);
  return Array.from({ length: len }, (_, i) => ({ name: n[i] ?? "", reason: r[i] ?? "" }));
};

export const fromEntries = (list: StudentEntry[]): { names: string; reasons: string } => {
  const clean = list.map((e) => ({ name: e.name.replace(/\n/g, " "), reason: e.reason.replace(/\n/g, " ") }));
  while (clean.length && !clean.at(-1)?.name && !clean.at(-1)?.reason) clean.pop();
  return { names: clean.map((e) => e.name).join("\n"), reasons: clean.map((e) => e.reason).join("\n") };
};
