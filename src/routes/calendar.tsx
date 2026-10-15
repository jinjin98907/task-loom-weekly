import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppTabs } from "@/components/AppTabs";
import { ALL_KEYS, dateKey, monthGrid, nextTag, type TodoTag } from "@/lib/calendar";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "업무 캘린더 | 우리반 대시보드" },
      { name: "description", content: "주간 대시보드의 체크사항을 월간 달력으로 모아보고 바로 추가·완료·수정하세요." },
      { property: "og:title", content: "업무 캘린더 — 우리반 대시보드" },
      { property: "og:description", content: "날짜별 업무 투두를 월간 달력으로 한눈에." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CalendarPage,
});

type Todo = { id: string; text: string; done: boolean; tag?: TodoTag | undefined };
type Day = { todos?: Todo[]; [k: string]: unknown };
type Store = Record<string, Day>;
const KEY = ALL_KEYS.dashboard;

const TAG_STYLE: Record<string, string> = {
  none: "border-sky-mid bg-sky-soft text-secondary-foreground",
  important: "border-destructive/40 bg-destructive/10 text-destructive",
  deadline: "border-amber-300 bg-amber-50 text-amber-800",
};
const TAG_LABEL: Record<string, string> = { none: "일반", important: "중요", deadline: "마감" };

function CalendarPage() {
  const [store, setStore] = useState<Store>({});
  const [loaded, setLoaded] = useState(false);
  const [ym, setYm] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [sel, setSel] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "important" | "deadline" | "open">("all");

  useEffect(() => {
    try { setStore(JSON.parse(localStorage.getItem(KEY) || "{}")); } catch {}
    setLoaded(true);
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) try { setStore(JSON.parse(e.newValue || "{}")); } catch {} };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  useEffect(() => { if (loaded) localStorage.setItem(KEY, JSON.stringify(store)); }, [store, loaded]);

  const weeks = useMemo(() => monthGrid(ym.y, ym.m), [ym]);
  const todayKey = dateKey(new Date());
  const todosOf = (k: string): Todo[] => store[k]?.todos ?? [];
  const setTodos = (k: string, fn: (t: Todo[]) => Todo[]) =>
    setStore((s) => ({ ...s, [k]: { notice: "", periods: ["", "", "", "", "", ""], ...s[k], todos: fn(s[k]?.todos ?? []) } }));
  const show = (t: Todo) => filter === "all" || (filter === "open" ? !t.done : t.tag === filter);
  const move = (n: number) => setYm(({ y, m }) => { const d = new Date(y, m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; });

  const backup = () => {
    const data = { app: "teacher-all", v: 1, dashboard: store,
      yearly: JSON.parse(localStorage.getItem(ALL_KEYS.yearly) || "{}"),
      rules: JSON.parse(localStorage.getItem(ALL_KEYS.rules) || "[]") };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = `우리반-전체-백업-${todayKey}.json`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
  };
  const restore = async (f: File) => {
    try {
      const d = JSON.parse(await f.text());
      if (!d || typeof d !== "object" || Array.isArray(d)) throw new Error();
      if (!confirm("현재 데이터를 백업 파일 내용으로 바꿀까요?")) return;
      if (d.app === "teacher-all") {
        localStorage.setItem(ALL_KEYS.yearly, JSON.stringify(d.yearly ?? {}));
        localStorage.setItem(ALL_KEYS.rules, JSON.stringify(d.rules ?? []));
        setStore(d.dashboard ?? {});
      } else setStore(d); // 주간 대시보드 백업 파일
    } catch { alert("올바른 백업 파일이 아니에요."); }
  };

  const btn = "rounded-lg border border-sky-mid bg-card px-3 py-1.5 text-sm font-semibold text-secondary-foreground hover:bg-sky-soft";

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <AppTabs />
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button className={btn} onClick={() => move(-1)}>◀ 이전 달</button>
          <h1 className="min-w-36 text-center font-display text-2xl text-foreground">{ym.y}년 {ym.m + 1}월</h1>
          <button className={btn} onClick={() => move(1)}>다음 달 ▶</button>
          <button onClick={() => { const d = new Date(); setYm({ y: d.getFullYear(), m: d.getMonth() }); setSel(todayKey); }}
            className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90">오늘</button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="rounded-lg border border-sky-mid bg-card px-2 py-1.5 text-sm">
            <option value="all">전체 보기</option><option value="open">미완료만</option>
            <option value="important">중요만</option><option value="deadline">마감만</option>
          </select>
          <button className={btn} onClick={backup}>💾 전체 데이터 백업</button>
          <label className={`${btn} cursor-pointer`}>📂 복원
            <input type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) restore(f); }} />
          </label>
        </div>
      </header>
      <p className="mb-2 flex gap-3 text-xs text-muted-foreground">
        {Object.keys(TAG_LABEL).map((k) => <span key={k} className={`rounded border px-1.5 ${TAG_STYLE[k]}`}>{TAG_LABEL[k]}</span>)}
        <span>· 날짜를 누르면 업무를 추가·수정할 수 있어요. 배지(●)를 누르면 중요/마감이 바뀌어요.</span>
      </p>

      <div className="overflow-hidden rounded-xl border border-sky-mid">
        <div className="grid grid-cols-7 bg-sky-soft text-center text-sm font-semibold">
          {"일월화수목금토".split("").map((d, i) => <div key={d} className={`py-2 ${i === 0 ? "text-destructive" : i === 6 ? "text-primary" : "text-secondary-foreground"}`}>{d}</div>)}
        </div>
        {weeks.map((w, wi) => (
          <div key={wi} className="grid grid-cols-7 border-t border-sky-mid">
            {w.map((d) => {
              const k = dateKey(d); const out = d.getMonth() !== ym.m; const list = todosOf(k).filter(show);
              const total = todosOf(k).length;
              return (
                <div key={k} onClick={() => setSel(k)}
                  className={`min-h-28 cursor-pointer border-l border-sky-mid p-1.5 first:border-l-0 hover:bg-sky-soft/40 ${out ? "bg-muted/60 opacity-60" : ""} ${k === todayKey ? "bg-today ring-2 ring-inset ring-primary" : ""}`}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className={`font-semibold ${d.getDay() === 0 ? "text-destructive" : "text-foreground"}`}>{d.getDate()}</span>
                    {total > 0 && <span className={`rounded-full px-1.5 text-[10px] font-bold ${total >= 4 ? "bg-primary text-primary-foreground" : "bg-sky-mid text-secondary-foreground"}`}>{total}</span>}
                  </div>
                  <div className="space-y-0.5">
                    {list.slice(0, 4).map((t) => (
                      <div key={t.id} className={`truncate rounded border px-1 text-[11px] leading-5 ${TAG_STYLE[t.tag ?? "none"]} ${t.done ? "line-through opacity-50" : ""}`}>{t.text.split("\n")[0]}</div>
                    ))}
                    {list.length > 4 && <div className="text-[10px] text-muted-foreground">+{list.length - 4}개 더</div>}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {sel && <DayEditor k={sel} todos={todosOf(sel)} onChange={(fn) => setTodos(sel, fn)} onClose={() => setSel(null)} />}
    </div>
  );
}

function DayEditor({ k, todos, onChange, onClose }: { k: string; todos: Todo[]; onChange: (fn: (t: Todo[]) => Todo[]) => void; onClose: () => void }) {
  const [text, setText] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const d = new Date(k + "T00:00:00");
  const add = () => { const t = text.trim(); if (!t) return; onChange((l) => [...l, { id: crypto.randomUUID(), text: t, done: false }]); setText(""); };
  const save = (id: string) => { const t = draft.trim(); onChange((l) => t ? l.map((x) => x.id === id ? { ...x, text: t } : x) : l.filter((x) => x.id !== id)); setEditing(null); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-card p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">{d.getMonth() + 1}월 {d.getDate()}일 ({"일월화수목금토"[d.getDay()]}) 체크사항</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <ul className="mb-3 max-h-80 space-y-1 overflow-auto">
          {todos.length === 0 && <li className="text-sm text-muted-foreground">아직 업무가 없어요.</li>}
          {todos.map((t) => (
            <li key={t.id} className={`flex items-start gap-2 rounded border px-2 py-1 text-sm ${TAG_STYLE[t.tag ?? "none"]}`}>
              <input type="checkbox" className="mt-1 accent-sky-strong" checked={t.done} onChange={() => onChange((l) => l.map((x) => x.id === t.id ? { ...x, done: !x.done } : x))} />
              {editing === t.id ? (
                <textarea autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={() => save(t.id)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); save(t.id); } }} className="flex-1 rounded border border-sky-mid bg-background p-1 text-foreground" />
              ) : (
                <span onDoubleClick={() => { setEditing(t.id); setDraft(t.text); }} className={`flex-1 whitespace-pre-wrap ${t.done ? "line-through opacity-50" : ""}`}>{t.text}</span>
              )}
              <button title="중요/마감 바꾸기" onClick={() => onChange((l) => l.map((x) => x.id === t.id ? { ...x, tag: nextTag(x.tag) } : x))} className="text-xs font-semibold">● {TAG_LABEL[t.tag ?? "none"]}</button>
              <button title="수정" onClick={() => { setEditing(t.id); setDraft(t.text); }} className="text-xs">✎</button>
              <button title="삭제" onClick={() => onChange((l) => l.filter((x) => x.id !== t.id))} className="text-xs hover:text-destructive">✕</button>
            </li>
          ))}
        </ul>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="새 업무 (Enter 추가, Shift+Enter 줄바꿈)"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); add(); } }}
          className="w-full rounded border border-sky-mid bg-background p-2 text-sm" rows={2} />
        <button onClick={add} className="mt-2 w-full rounded-lg bg-primary py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90">추가</button>
      </div>
    </div>
  );
}
