// 주간 대시보드 ↔ 학년 전체 시간표 과목 연동 (browser-safe, pure helpers)
export type YCell = { t: string; c?: string | undefined; b?: string | undefined };
export type YCells = Record<string, YCell>;

export const YEARLY_KEY = "teacher-yearly-timetable-v1";
export const MY_CLASS_KEY = "teacher-my-class-v1";

/** 연간 시간표 칸 키: 날짜|반(0~2)|교시(0~5) */
export const cellKey = (date: string, cls: number, period: number) => `${date}|${cls}|${period}`;

/** 과목 읽기: 연간 시간표가 기준, 없으면 예전 대시보드 값 */
export function subjectFor(cells: YCells, date: string, cls: number, period: number, legacy = ""): string {
  const c = cells[cellKey(date, cls, period)];
  return c ? c.t : legacy;
}

/** 과목 쓰기: 수동 색상은 유지하고 글자만 바꿈 */
export function setSubject(cells: YCells, date: string, cls: number, period: number, t: string): YCells {
  const k = cellKey(date, cls, period);
  return { ...cells, [k]: { ...cells[k], t } };
}

export function normalizeClass(v: unknown, count = 9): number {
  const n = Math.floor(Number(v));
  return n >= 0 && n < count ? n : 0;
}

/** 학년 학급 수 (1~9반, 기본 3반) */
export const CLASS_COUNT_KEY = "teacher-class-count-v1";
export const MAX_CLASSES = 9;
export function normalizeClassCount(v: unknown): number {
  const n = Math.floor(Number(v));
  return n >= 1 && n <= MAX_CLASSES ? n : 3;
}
export const classLabels = (count: number) => Array.from({ length: normalizeClassCount(count) }, (_, i) => `${i + 1}반`);
