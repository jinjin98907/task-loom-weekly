import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

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

type Todo = { id: string; text: string; done: boolean };
type DayData = { todos: Todo[]; notice: string; periods: string[] };
type Store = Record<string, DayData>;

const KEY = "teacher-dashboard-v1";
const DAYS = ["일", "월", "화", "수", "목", "금", "토"];
const emptyDay = (): DayData => ({ todos: [], notice: "", periods: ["", "", "", "", "", ""] });
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

  useEffect(() => {
    try { setStore(JSON.parse(localStorage.getItem(KEY) || "{}")); } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => { if (loaded) localStorage.setItem(KEY, JSON.stringify(store)); }, [store, loaded]);

  const days = useMemo(() => Array.from({ length: showWeekend ? 7 : 5 }, (_, i) => {
    const d = new Date(monday); d.setDate(d.getDate() + i); return d;
  }), [monday, showWeekend]);
  const todayKey = keyOf(new Date());

  const get = (k: string) => store[k] ?? emptyDay();
  const update = (k: string, fn: (d: DayData) => DayData) => setStore((s) => ({ ...s, [k]: fn(s[k] ?? emptyDay()) }));
  const shift = (w: number) => { const d = new Date(monday); d.setDate(d.getDate() + w * 7); setMonday(d); };

  const end = days[days.length - 1] ?? monday;
  const cols = `120px repeat(${days.length}, minmax(0, 1fr))`;

  return (
    <div className="min-h-screen bg-background p-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-foreground">🏫 우리반 주간 대시보드</h1>
          <p className="text-sm text-muted-foreground">
            {monday.getFullYear()}년 {monday.getMonth() + 1}월 {monday.getDate()}일 – {end.getMonth() + 1}월 {end.getDate()}일
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="mr-2 flex items-center gap-1 text-sm text-muted-foreground">
            <input type="checkbox" className="accent-sky-strong" checked={showWeekend} onChange={(e) => setShowWeekend(e.target.checked)} />
            주말 보기
          </label>
          <NavBtn onClick={() => shift(-1)}>◀ 이전 주</NavBtn>
          <button onClick={() => setMonday(mondayOf(new Date()))} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90">오늘</button>
          <NavBtn onClick={() => shift(1)}>다음 주 ▶</NavBtn>
        </div>
      </header>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="grid border-b bg-sky-soft" style={{ gridTemplateColumns: cols }}>
          <div className="p-3" />
          {days.map((d) => {
            const isToday = keyOf(d) === todayKey;
            return (
              <div key={keyOf(d)} className={`border-l p-3 text-center font-display text-lg ${isToday ? "bg-sky-strong text-primary-foreground" : "text-foreground"}`}>
                {d.getMonth() + 1}월 {d.getDate()}일 ({DAYS[d.getDay()]})
              </div>
            );
          })}
        </div>

        <Row label="✅ 체크사항" cols={cols}>
          {days.map((d) => { const k = keyOf(d); return (
            <Cell key={k} today={k === todayKey}><TodoCell data={get(k)} onChange={(fn) => update(k, fn)} /></Cell>
          ); })}
        </Row>

        <Row label="📢 공지사항" cols={cols}>
          {days.map((d) => { const k = keyOf(d); return (
            <Cell key={k} today={k === todayKey}>
              <textarea
                value={get(k).notice}
                onChange={(e) => { const v = e.target.value; update(k, (x) => ({ ...x, notice: v })); }}
                placeholder={"체험학습: \n결석/지각: \n전달사항: "}
                className="min-h-28 w-full resize-y rounded-lg border border-sky-mid bg-sky-soft/50 p-2 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-ring"
              />
            </Cell>
          ); })}
        </Row>

        {[0, 1, 2, 3, 4, 5].map((p) => (
          <Row key={p} label={`${p + 1}교시`} cols={cols}>
            {days.map((d) => { const k = keyOf(d); const v = get(k).periods[p]; return (
              <Cell key={k} today={k === todayKey}>
                <input
                  value={v}
                  onChange={(e) => { const val = e.target.value; update(k, (x) => { const ps = [...x.periods]; ps[p] = val; return { ...x, periods: ps }; }); }}
                  placeholder="과목"
                  className={`w-full rounded-xl px-3 py-2 text-center font-semibold outline-none transition focus:ring-2 focus:ring-ring ${v ? "bg-sky-mid text-secondary-foreground" : "bg-muted text-muted-foreground"}`}
                />
              </Cell>
            ); })}
          </Row>
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

function TodoCell({ data, onChange }: { data: DayData; onChange: (fn: (d: DayData) => DayData) => void }) {
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const add = () => {
    const t = draft.trim(); if (!t) return;
    onChange((d) => ({ ...d, todos: [...d.todos, { id: crypto.randomUUID(), text: t, done: false }] }));
    setDraft("");
  };
  const save = (id: string) => {
    const t = editText.trim();
    onChange((d) => ({ ...d, todos: t ? d.todos.map((x) => (x.id === id ? { ...x, text: t } : x)) : d.todos.filter((x) => x.id !== id) }));
    setEditing(null);
  };

  return (
    <div className="space-y-1.5">
      {data.todos.map((t) => (
        <div key={t.id} className="group flex items-start gap-2 rounded-lg p-1.5 hover:bg-sky-soft">
          <input type="checkbox" checked={t.done} className="mt-1 accent-sky-strong"
            onChange={() => onChange((d) => ({ ...d, todos: d.todos.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)) }))} />
          {editing === t.id ? (
            <textarea autoFocus value={editText} rows={Math.max(2, editText.split("\n").length)}
              onChange={(e) => setEditText(e.target.value)} onBlur={() => save(t.id)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); save(t.id); } if (e.key === "Escape") setEditing(null); }}
              className="flex-1 resize-none rounded border border-input p-1 text-sm outline-none" />
          ) : (
            <p onDoubleClick={() => { setEditing(t.id); setEditText(t.text); }}
              className={`flex-1 cursor-text whitespace-pre-wrap break-words text-sm leading-snug ${t.done ? "text-muted-foreground line-through" : ""}`}>{t.text}</p>
          )}
          <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
            <button title="편집" onClick={() => { setEditing(t.id); setEditText(t.text); }} className="text-xs text-muted-foreground hover:text-primary">✎</button>
            <button title="삭제" onClick={() => onChange((d) => ({ ...d, todos: d.todos.filter((x) => x.id !== t.id) }))} className="text-xs text-muted-foreground hover:text-destructive">✕</button>
          </div>
        </div>
      ))}
      <textarea value={draft} rows={Math.max(1, draft.split("\n").length)} onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); add(); } }}
        placeholder="+ 업무 추가 (Shift+Enter 줄바꿈)"
        className="w-full resize-none rounded-lg border border-dashed border-sky-mid bg-transparent p-1.5 text-sm outline-none focus:border-solid focus:ring-2 focus:ring-ring" />
    </div>
  );
}
