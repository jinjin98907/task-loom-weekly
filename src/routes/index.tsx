import { createFileRoute } from "@tanstack/react-router";
import { AppTabs } from "@/components/AppTabs";
import { AutoTextarea } from "@/components/AutoTextarea";
import { TodoList } from "@/components/TodoList";
import { subjectFit } from "@/lib/subject-fit";

import { useEffect, useMemo, useState } from "react";
import { type Attendance, emptyAttendance, normalizeAttendance } from "@/lib/attendance";
import { normalizeNotices, type Todo } from "@/lib/day-data";
import { normalizeRules, styleFor, type ColorRule } from "@/lib/keyword-colors";
import { cellKey, MY_CLASS_KEY, normalizeClass, setSubject, subjectFor, YEARLY_KEY, type YCells } from "@/lib/class-sync";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "우리반 주간 대시보드 | 초등 교사 업무·시간표" },
      { name: "description", content: "초등 교사를 위한 주간 업무, 공지사항, 1~6교시 시간표 대시보드" },
      { property: "og:title", content: "우리반 주간 대시보드" },
      { property: "og:description", content: "주간 업무와 시간표를 한눈에 관리하세요." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

type DayData = { todos: Todo[]; notices: Todo[]; notice?: string; attendance: Attendance; periods: string[]; details?: string[] };
type Store = Record<string, DayData>;

const KEY = "teacher-dashboard-v1";
const DAYS = ["일", "월", "화", "수", "목", "금", "토"];
const emptyDay = (): DayData => ({ todos: [], notices: [], attendance: emptyAttendance(), periods: ["", "", "", "", "", ""] });
const keyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const mondayOf = (d: Date) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - diff);
  return x;
};

function Dashboard() {
  const [store, setStore] = useState<Store>({});
  const [loaded, setLoaded] = useState(false);
  const [monday, setMonday] = useState(() => mondayOf(new Date()));
  const [showWeekend, setShowWeekend] = useState(false);
  const [rules, setRules] = useState<ColorRule[]>([]);
  const [yCells, setYCells] = useState<YCells>({});
  const [myClass, setMyClass] = useState(0);

  useEffect(() => {
    try { setStore(JSON.parse(localStorage.getItem(KEY) || "{}")); } catch {}
    const readShared = () => {
      try { setRules(normalizeRules(JSON.parse(localStorage.getItem("teacher-yearly-color-rules-v1") || "[]"))); } catch {}
      try { setYCells(JSON.parse(localStorage.getItem(YEARLY_KEY) || "{}")); } catch {}
      setMyClass(normalizeClass(localStorage.getItem(MY_CLASS_KEY)));
    };
    readShared();
    setLoaded(true);
    // 다른 창/탭에서 학년 시간표를 고치면 즉시 반영
    const onStorage = (e: StorageEvent) => { if (!e.key || e.key === YEARLY_KEY || e.key === MY_CLASS_KEY || e.key === "teacher-yearly-color-rules-v1") readShared(); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  useEffect(() => { if (loaded) localStorage.setItem(KEY, JSON.stringify(store)); }, [store, loaded]);
  // 과목 칸 = 학년 전체 시간표의 내 학급 칸 (세부 내용은 대시보드에만 저장)
  const editSubject = (k: string, p: number, val: string) => {
    let cur: YCells = {};
    try { cur = JSON.parse(localStorage.getItem(YEARLY_KEY) || "{}"); } catch {}
    const next = setSubject(cur, k, myClass, p, val);
    localStorage.setItem(YEARLY_KEY, JSON.stringify(next));
    setYCells(next);
  };

  const weeks = useMemo(() => Array.from({ length: 4 }, (_, w) => Array.from({ length: showWeekend ? 7 : 5 }, (_, i) => {
    const d = new Date(monday); d.setDate(d.getDate() + w * 7 + i); return d;
  })), [monday, showWeekend]);
  const days = weeks[0]!;
  const lastWeek = weeks[3]!;
  const todayKey = keyOf(new Date());

  const get = (k: string): DayData => {
    const d = store[k];
    if (!d) return emptyDay();
    return { ...emptyDay(), ...d, attendance: normalizeAttendance(d.attendance), notices: normalizeNotices(d) };
  };
  const update = (k: string, fn: (d: DayData) => DayData) => setStore((s) => {
    const cur = s[k] ?? emptyDay();
    const base: DayData = { ...emptyDay(), ...cur, notices: normalizeNotices(cur) };
    delete base.notice; // 예전 형식(긴 글 한 칸)은 항목 목록으로 옮겼으니 지운다
    return { ...s, [k]: fn(base) };
  });
  const shift = (w: number) => { const d = new Date(monday); d.setDate(d.getDate() + w * 7); setMonday(d); };

  const end = lastWeek[lastWeek.length - 1] ?? monday;
  const cols = `120px repeat(${days.length}, minmax(0, 1fr))`;

  return (
    <div className="min-h-screen bg-background p-6">
      <AppTabs />
      <header className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-foreground">🏫 우리반 주간 대시보드</h1>
          <p className="text-sm text-muted-foreground">
            {monday.getFullYear()}년 {monday.getMonth() + 1}월 {monday.getDate()}일 – {end.getMonth() + 1}월 {end.getDate()}일
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <NavBtn onClick={() => {
            const blob = new Blob([JSON.stringify(store, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = `우리반-대시보드-백업-${keyOf(new Date())}.json`;
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 30000);
          }}>💾 데이터 전체 백업</NavBtn>
          <label className="cursor-pointer rounded-lg border border-sky-mid bg-sky-soft px-4 py-2 text-sm font-semibold text-secondary-foreground transition hover:bg-sky-mid">
            📂 데이터 복원
            <input type="file" accept="application/json,.json" className="hidden" onChange={async (e) => {
              const f = e.target.files?.[0]; e.target.value = "";
              if (!f) return;
              try {
                const data = JSON.parse(await f.text());
                if (typeof data !== "object" || data === null || Array.isArray(data)) throw new Error();
                if (confirm("현재 데이터를 백업 파일 내용으로 바꿀까요?")) setStore(data);
              } catch { alert("올바른 백업 파일이 아니에요."); }
            }} />
          </label>
          <span className="mx-1 h-6 w-px bg-border" />
          <label className="flex items-center gap-1 text-sm text-muted-foreground">
            내 학급
            <select aria-label="내 학급" value={myClass} onChange={(e) => { const n = normalizeClass(e.target.value); setMyClass(n); localStorage.setItem(MY_CLASS_KEY, String(n)); }} className="rounded-lg border border-sky-mid bg-card px-2 py-1.5 text-sm font-semibold text-secondary-foreground">
              <option value={0}>1반</option><option value={1}>2반</option><option value={2}>3반</option>
            </select>
          </label>
          <label className="mr-2 flex items-center gap-1 text-sm text-muted-foreground">
            <input type="checkbox" className="accent-sky-strong" checked={showWeekend} onChange={(e) => setShowWeekend(e.target.checked)} />
            주말 보기
          </label>
          <NavBtn onClick={() => shift(-1)}>◀ 이전 주</NavBtn>
          <button onClick={() => setMonday(mondayOf(new Date()))} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90">오늘</button>
          <NavBtn onClick={() => shift(1)}>다음 주 ▶</NavBtn>
        </div>
      </header>


      <div className="space-y-6">
      {weeks.map((days, wi) => (
      <section key={wi}>
        <h2 className="mb-2 font-display text-lg text-secondary-foreground">
          {wi === 0 ? "📌 " : ""}{days[0]!.getMonth() + 1}월 {days[0]!.getDate()}일 주간
        </h2>
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="grid border-b bg-sky-soft" style={{ gridTemplateColumns: cols }}>
          <div className="p-2" />
          {days.map((d) => {
            const isToday = keyOf(d) === todayKey;
            return (
              <div key={keyOf(d)} className={`border-l p-2 text-center font-display text-base ${isToday ? "bg-sky-strong text-primary-foreground" : "text-foreground"}`}>
                {d.getMonth() + 1}월 {d.getDate()}일 ({DAYS[d.getDay()]})
              </div>
            );
          })}
        </div>

        <Row label="✅ 체크사항" cols={cols}>
          {days.map((d) => { const k = keyOf(d); return (
            <Cell key={k} today={k === todayKey}><TodoList items={get(k).todos} onChange={(fn) => update(k, (x) => ({ ...x, todos: fn(x.todos) }))} placeholder="+ 업무 추가 (Shift+Enter 줄바꿈)" /></Cell>
          ); })}
        </Row>

        <Row label="📢 안내사항" cols={cols}>
          {days.map((d) => { const k = keyOf(d); return (
            <Cell key={k} today={k === todayKey}>
              <TodoList items={get(k).notices} onChange={(fn) => update(k, (x) => ({ ...x, notices: fn(x.notices) }))} placeholder="+ 안내 추가 (Shift+Enter 줄바꿈)" />
            </Cell>
          ); })}
        </Row>

        <Row label="👤 출결" cols={cols}>
          {days.map((d) => { const k = keyOf(d); const a = get(k).attendance; return (
            <Cell key={k} today={k === todayKey}>
              <div className="space-y-1">
                <label className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-1">
                  <span className="text-[11px] font-semibold text-primary">결석</span>
                  <textarea
                    value={a.absent}
                    onChange={(e) => { const v = e.target.value; update(k, (x) => ({ ...x, attendance: { ...x.attendance, absent: v } })); }}
                    placeholder="이름 입력"
                    rows={1}
                    className="min-h-8 min-w-0 w-full resize-y rounded-lg border border-sky-mid bg-sky-soft/60 p-1.5 text-sm leading-snug text-foreground outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>
                <label className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-1">
                  <span className="text-[11px] font-semibold text-primary">지각</span>
                  <textarea
                    value={a.late}
                    onChange={(e) => { const v = e.target.value; update(k, (x) => ({ ...x, attendance: { ...x.attendance, late: v } })); }}
                    placeholder="이름 입력"
                    rows={1}
                    className="min-h-8 min-w-0 w-full resize-y rounded-lg border border-sky-mid bg-sky-soft/60 p-1.5 text-sm leading-snug text-foreground outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>
                <label className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-1">
                  <span className="text-[11px] font-semibold text-primary">교외 체험학습</span>
                  <textarea
                    value={a.trip}
                    onChange={(e) => { const v = e.target.value; update(k, (x) => ({ ...x, attendance: { ...x.attendance, trip: v } })); }}
                    placeholder="이름 입력"
                    rows={1}
                    className="min-h-8 min-w-0 w-full resize-y rounded-lg border border-sky-mid bg-sky-soft/60 p-1.5 text-sm leading-snug text-foreground outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>
              </div>
            </Cell>
          ); })}
        </Row>

        {[0, 1, 2, 3, 4, 5].map((p) => (
          <Row key={p} label={`${p + 1}교시`} cols={cols}>
            {days.map((d) => { const k = keyOf(d); const v = subjectFor(yCells, k, myClass, p, get(k).periods[p] ?? ""); const yc = yCells[cellKey(k, myClass, p)]; const det = get(k).details?.[p] ?? ""; const st = { ...styleFor(v, rules), ...(yc?.c ? { color: yc.c } : {}), ...(yc?.b ? { background: yc.b } : {}) }; const fit = subjectFit(v); return (
              <Cell key={k} today={k === todayKey}>
                <div className="flex overflow-hidden rounded-lg border border-sky-mid/70">
                  <AutoTextarea
                    value={v}
                    onChange={(e) => editSubject(k, p, e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); e.currentTarget.blur(); } }}
                    placeholder="과목"
                    rows={fit.rows}
                    style={{ flex: 1, color: st.color, background: st.background }}
                    className={`min-w-0 resize-none overflow-hidden break-words border-r border-sky-mid/70 px-1 py-1 text-center font-semibold leading-tight outline-none focus:ring-2 focus:ring-inset focus:ring-ring ${fit.fontClass} ${st.background ? "" : "bg-sky-soft"} ${v ? "" : "text-muted-foreground"}`}
                  />
                  <AutoTextarea
                    value={det}
                    rows={Math.max(1, det.split("\n").length)}
                    onChange={(e) => { const val = e.target.value; update(k, (x) => { const ds = [...(x.details ?? ["", "", "", "", "", ""])]; ds[p] = val; return { ...x, details: ds }; }); }}
                    placeholder="수업 내용·준비물·메모"
                    style={{ flex: 5 }}
                    className="min-w-0 resize-none overflow-hidden bg-card px-1.5 py-1 text-xs leading-snug text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-inset focus:ring-ring"
                  />

                </div>
              </Cell>
            ); })}
          </Row>
        ))}
      </div>
      </section>
      ))}
      </div>
    </div>
  );
}

function NavBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button onClick={onClick} className="rounded-lg border border-sky-mid bg-sky-soft px-4 py-2 text-sm font-semibold text-secondary-foreground transition hover:bg-sky-mid">{children}</button>;
}

function Row({ label, cols, children }: { label: string; cols: string; children: React.ReactNode }) {
  return (
    <div className="grid border-b last:border-b-0" style={{ gridTemplateColumns: cols }}>
      <div className="flex items-center justify-center bg-sky-soft p-3 font-display text-base text-secondary-foreground">{label}</div>
      {children}
    </div>
  );
}

function Cell({ today, children }: { today: boolean; children: React.ReactNode }) {
  return <div className={`border-l p-2 ${today ? "bg-today" : ""}`}>{children}</div>;
}
