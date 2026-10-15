// Pure month-grid helpers for the 업무 캘린더 page.
export const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Weeks (Sun–Sat) covering the given month; each week has 7 dates. */
export function monthGrid(year: number, month: number): Date[][] {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  const last = new Date(year, month + 1, 0);
  const weeks: Date[][] = [];
  const cur = new Date(start);
  while (cur <= last || weeks.length === 0) {
    const w: Date[] = [];
    for (let i = 0; i < 7; i++) { w.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
    weeks.push(w);
  }
  return weeks;
}

export type TodoTag = "important" | "deadline";
export const TAG_ORDER: (TodoTag | undefined)[] = [undefined, "important", "deadline"];
export const nextTag = (t?: TodoTag) => TAG_ORDER[(TAG_ORDER.indexOf(t) + 1) % TAG_ORDER.length];

/** Bundle every app store into one backup object. */
export const ALL_KEYS = { dashboard: "teacher-dashboard-v1", yearly: "teacher-yearly-timetable-v1", rules: "teacher-yearly-color-rules-v1" } as const;
