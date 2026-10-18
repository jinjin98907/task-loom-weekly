import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { MemoEditor } from "@/components/MemoEditor";

const UI_KEY = "teacher-memo-ui-v1";
export const MEMO_TOGGLE_EVENT = "teacher-memo-toggle";
export const toggleMemo = () => window.dispatchEvent(new Event(MEMO_TOGGLE_EVENT));

export function MemoSplit({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pct, setPct] = useState(25); // memo width %, 100 = 전체 화면
  const [ready, setReady] = useState(false);
  const dragging = useRef(false);
  const wrap = useRef<HTMLDivElement>(null);
  const onMemoPage = useRouterState({ select: (s) => s.location.pathname === "/memo" });

  useEffect(() => {
    try {
      const ui = JSON.parse(localStorage.getItem(UI_KEY) ?? "{}");
      if (typeof ui.pct === "number") setPct(ui.pct);
      if (ui.open) setOpen(true);
    } catch { /* ignore */ }
    setReady(true);
    const t = () => setOpen((o) => !o);
    window.addEventListener(MEMO_TOGGLE_EVENT, t);
    return () => window.removeEventListener(MEMO_TOGGLE_EVENT, t);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(UI_KEY, JSON.stringify({ open, pct }));
  }, [open, pct, ready]);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!dragging.current || !wrap.current) return;
      const r = wrap.current.getBoundingClientRect();
      setPct(Math.min(85, Math.max(15, ((r.right - e.clientX) / r.width) * 100)));
    };
    const up = () => { dragging.current = false; document.body.style.userSelect = ""; };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, []);

  if (!open || onMemoPage) return <>{children}</>;

  const full = pct >= 100;
  const presets: [string, number][] = [["1 : 3", 25], ["1 : 1", 50], ["전체 화면", 100]];

  return (
    <div ref={wrap} className="flex h-screen w-full flex-col md:flex-row">
      <div className={`min-h-0 min-w-0 flex-1 overflow-auto ${full ? "hidden" : ""}`}>{children}</div>
      {!full && (
        <div
          onPointerDown={() => { dragging.current = true; document.body.style.userSelect = "none"; }}
          className="hidden w-2 shrink-0 cursor-col-resize bg-sky-mid/50 hover:bg-sky-mid md:block"
          title="드래그해서 크기 조절"
        />
      )}
      <aside
        style={{ ["--memo-w" as string]: `${pct}%` }}
        className={`flex shrink-0 flex-col bg-background ${full ? "h-screen w-full" : "h-[50vh] rounded-t-2xl border-t border-sky-mid shadow-lg md:h-auto md:w-[var(--memo-w)] md:rounded-none md:border-t-0 md:shadow-none"}`}
      >
        {!full && <div className="mx-auto mt-1.5 h-1 w-10 rounded-full bg-sky-mid md:hidden" />}
        <div className="flex flex-wrap items-center gap-1 border-b border-sky-mid px-3 py-2">
          <span className="mr-auto text-sm font-bold text-primary">📝 아이디어 메모장</span>
          {presets.map(([label, v]) => (
            <button key={label} onClick={() => setPct(v)} title={label === "전체 화면" ? "메모장만 보기" : `메모장 : 화면 = ${label}`}
              className={`rounded border px-2 py-0.5 text-xs ${Math.round(pct) === v ? "border-primary text-primary" : "border-sky-mid text-muted-foreground"} hover:bg-sky-soft ${label === "전체 화면" ? "" : "hidden md:inline-block"}`}>
              {label}
            </button>
          ))}
          {full && (
            <button onClick={() => setPct(25)} className="rounded border border-sky-mid px-2 py-0.5 text-xs text-muted-foreground hover:bg-sky-soft">
              분할로 돌아가기
            </button>
          )}
          <Link to="/memo" className="rounded border border-sky-mid px-2 py-0.5 text-xs text-muted-foreground hover:bg-sky-soft" title="단독 페이지로 열기">↗</Link>
          <button onClick={() => setOpen(false)} className="rounded border border-sky-mid px-2 py-0.5 text-xs text-muted-foreground hover:bg-sky-soft">
            닫기 ✕
          </button>
        </div>
        <MemoEditor />
      </aside>
    </div>
  );
}
