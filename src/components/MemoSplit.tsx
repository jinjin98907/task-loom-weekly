import { useEffect, useRef, useState, type ReactNode } from "react";

const MEMO_KEY = "teacher-memo-v1";
const UI_KEY = "teacher-memo-ui-v1";

export function MemoSplit({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pct, setPct] = useState(25); // memo width %
  const [text, setText] = useState("");
  const [ready, setReady] = useState(false);
  const dragging = useRef(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setText(localStorage.getItem(MEMO_KEY) ?? "");
    try {
      const ui = JSON.parse(localStorage.getItem(UI_KEY) ?? "{}");
      if (typeof ui.pct === "number") setPct(ui.pct);
      if (ui.open) setOpen(true);
    } catch { /* ignore */ }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(MEMO_KEY, text);
  }, [text, ready]);
  useEffect(() => {
    if (ready) localStorage.setItem(UI_KEY, JSON.stringify({ open, pct }));
  }, [open, pct, ready]);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!dragging.current || !wrap.current) return;
      const r = wrap.current.getBoundingClientRect();
      const p = ((r.right - e.clientX) / r.width) * 100;
      setPct(Math.min(85, Math.max(15, p)));
    };
    const up = () => {
      dragging.current = false;
      document.body.style.userSelect = "";
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  if (!open) {
    return (
      <>
        {children}
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 rounded-full border border-sky-mid bg-background px-4 py-3 text-sm font-semibold text-primary shadow-lg hover:bg-sky-soft"
        >
          📝 아이디어 메모장
        </button>
      </>
    );
  }

  const presets: [string, number][] = [["1 : 3", 25], ["1 : 1", 50], ["3 : 1", 75]];

  return (
    <div ref={wrap} className="flex h-screen w-full flex-col md:flex-row">
      <div className="min-h-0 min-w-0 flex-1 overflow-auto">{children}</div>
      <div
        onPointerDown={() => {
          dragging.current = true;
          document.body.style.userSelect = "none";
        }}
        className="hidden w-2 shrink-0 cursor-col-resize bg-sky-mid/50 hover:bg-sky-mid md:block"
        title="드래그해서 크기 조절"
      />
      <aside
        style={{ ["--memo-w" as string]: `${pct}%` }}
        className="flex h-[45vh] shrink-0 flex-col border-t border-sky-mid bg-background md:h-auto md:w-[var(--memo-w)] md:border-t-0"
      >
        <div className="flex flex-wrap items-center gap-1 border-b border-sky-mid px-3 py-2">
          <span className="mr-auto text-sm font-bold text-primary">📝 아이디어 메모장</span>
          <span className="hidden gap-1 md:flex">
            {presets.map(([label, v]) => (
              <button
                key={label}
                onClick={() => setPct(v)}
                title={`메모장 : 화면 = ${label}`}
                className={`rounded border px-2 py-0.5 text-xs ${Math.round(pct) === v ? "border-primary text-primary" : "border-sky-mid text-muted-foreground"} hover:bg-sky-soft`}
              >
                {label}
              </button>
            ))}
          </span>
          <button
            onClick={() => setOpen(false)}
            className="rounded border border-sky-mid px-2 py-0.5 text-xs text-muted-foreground hover:bg-sky-soft"
          >
            닫기 ✕
          </button>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="떠오르는 아이디어를 자유롭게 적어보세요. 자동 저장돼요."
          className="min-h-0 flex-1 resize-none bg-background p-3 text-sm leading-relaxed text-foreground outline-none"
        />
      </aside>
    </div>
  );
}
