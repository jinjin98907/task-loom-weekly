export type Attendance = {
  absent: string;
  late: string;
  trip: string;
  absentReason: string;
  lateReason: string;
  tripReason: string;
  absentDocuments?: StudentDocuments[];
  tripDocuments?: StudentDocuments[];
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
  ...(Array.isArray(a?.absentDocuments) ? { absentDocuments: a.absentDocuments.map(normalizeDocuments) } : {}),
  ...(Array.isArray(a?.tripDocuments) ? { tripDocuments: a.tripDocuments.map(normalizeDocuments) } : {}),
});

export type StudentDocuments = Partial<Record<"absenceForm" | "additional" | "application" | "report", boolean>>;
export type StudentEntry = { name: string; reason: string; documents?: StudentDocuments };

function normalizeDocuments(value: unknown): StudentDocuments {
  if (!value || typeof value !== "object") return {};
  const source = value as Record<string, unknown>;
  return Object.fromEntries(["absenceForm", "additional", "application", "report"].filter((key) => typeof source[key] === "boolean").map((key) => [key, source[key]]));
}

export const ATTENDANCE_KINDS = [
  { label: "결석", n: "absent", r: "absentReason", documents: "absentDocuments", forms: [{ key: "absenceForm", label: "결석계", optional: false }, { key: "additional", label: "추가서류", optional: true }] },
  { label: "지각", n: "late", r: "lateReason", documents: null, forms: [] },
  { label: "체험학습", n: "trip", r: "tripReason", documents: "tripDocuments", forms: [{ key: "application", label: "신청서", optional: false }, { key: "report", label: "보고서", optional: false }] },
] as const;
export type AttendanceKind = (typeof ATTENDANCE_KINDS)[number];

export function attendanceEntries(value: Attendance, kind: AttendanceKind): StudentEntry[] {
  const documents = kind.documents ? value[kind.documents] : undefined;
  return toEntries(value[kind.n], value[kind.r]).map((entry, i) => ({ ...entry, ...(documents?.[i] ? { documents: documents[i] } : {}) }));
}

export function setAttendanceEntries(value: Attendance, kind: AttendanceKind, entries: StudentEntry[]): Attendance {
  const clean = [...entries];
  while (clean.length && !clean.at(-1)?.name && !clean.at(-1)?.reason) clean.pop();
  const lines = fromEntries(clean);
  return { ...value, [kind.n]: lines.names, [kind.r]: lines.reasons, ...(kind.documents ? { [kind.documents]: clean.map((entry) => normalizeDocuments(entry.documents)) } : {}) };
}

export function documentSummary(entry: StudentEntry, kind: AttendanceKind): string {
  return kind.forms.flatMap((form) => entry.documents?.[form.key] ? [`${form.label} 제출`] : form.optional ? [] : [`${form.label} 미제출`]).join(" · ");
}

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
