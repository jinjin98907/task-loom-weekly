// 전체 데이터 통합 백업/복원 (브라우저 안전, 순수 로직)
export const BACKUP_KEYS = {
  dashboard: "teacher-dashboard-v1",
  yearly: "teacher-yearly-timetable-v1",
  rules: "teacher-yearly-color-rules-v1",
  myClass: "teacher-my-class-v1",
  memo: "teacher-memos-v2",
} as const;

type Obj = { app?: unknown; dashboard?: unknown; yearly?: unknown; rules?: unknown; myClass?: unknown; memo?: unknown; cells?: unknown; [k: string]: unknown };
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);
const read = (s: Pick<Storage, "getItem">, k: string, fb: unknown) => {
  try { const r = s.getItem(k); return r == null ? fb : JSON.parse(r); } catch { return fb; }
};

export function buildFullBackup(s: Pick<Storage, "getItem">, now = new Date()) {
  return {
    app: "teacher-all",
    version: 2,
    exportedAt: now.toISOString(),
    dashboard: read(s, BACKUP_KEYS.dashboard, {}),
    yearly: read(s, BACKUP_KEYS.yearly, {}),
    rules: read(s, BACKUP_KEYS.rules, []),
    myClass: Number(read(s, BACKUP_KEYS.myClass, 0)) || 0,
    memo: read(s, BACKUP_KEYS.memo, []),
  };
}

/** 복원할 키→값(문자열) 목록. 알 수 없는 형식이면 null. */
export function parseFullBackup(d: unknown): Partial<Record<keyof typeof BACKUP_KEYS, string>> | null {
  if (!isObj(d)) return null;
  const out: Partial<Record<keyof typeof BACKUP_KEYS, string>> = {};
  if (d.app === "teacher-all") {
    if (isObj(d.dashboard)) out.dashboard = JSON.stringify(d.dashboard);
    if (isObj(d.yearly)) out.yearly = JSON.stringify(d.yearly);
    if (Array.isArray(d.rules)) out.rules = JSON.stringify(d.rules);
    if (Array.isArray(d.memo)) out.memo = JSON.stringify(d.memo);
    if (d.myClass !== undefined) out.myClass = String([0, 1, 2, 3, 4, 5, 6, 7, 8].includes(Number(d.myClass)) ? Number(d.myClass) : 0);
    return out;
  }
  // 예전 학년 시간표 전용 백업 { v, cells, rules }
  if (isObj(d.cells)) {
    out.yearly = JSON.stringify(d.cells);
    if (Array.isArray(d.rules)) out.rules = JSON.stringify(d.rules);
    return out;
  }
  // 예전 주간 대시보드 전용 백업 (날짜 키 객체)
  out.dashboard = JSON.stringify(d);
  return out;
}
