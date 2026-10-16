import { normalizeAttendance, type Attendance } from "@/lib/attendance";

export type AttendanceRow = Attendance & { date: string };

export function isAttendanceDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function attendanceRangeError(start: string, end: string): string | null {
  if (!isAttendanceDate(start) || !isAttendanceDate(end)) return "시작일과 종료일을 선택해 주세요.";
  if (start > end) return "종료일은 시작일과 같거나 이후여야 해요.";
  return null;
}

/** Read only recorded attendance, including both range boundaries, in date order. */
export function attendanceInRange(store: unknown, start: string, end: string): AttendanceRow[] {
  if (attendanceRangeError(start, end) || !store || typeof store !== "object" || Array.isArray(store)) return [];

  return Object.entries(store)
    .filter(([date]) => isAttendanceDate(date) && date >= start && date <= end)
    .map(([date, day]): AttendanceRow => {
      const raw = day && typeof day === "object" ? (day as { attendance?: Partial<Attendance> }).attendance : undefined;
      return { date, ...normalizeAttendance(raw) };
    })
    .filter((row) => [row.absent, row.late, row.trip].some((text) => text.trim().length > 0))
    .sort((a, b) => a.date.localeCompare(b.date));
}