import { useCallback, useEffect, useRef, useState } from "react";
import {
  addSnapshot, changedAreas, readState, recordChange, redoStep, sameState, snapshotKey, undoStep,
  HISTORY_KEYS, type DataState, type Snapshot, type UndoStacks,
} from "@/lib/history";
import { OWNER_KEY } from "@/lib/cloud-local-owner";

const ownerOf = () => localStorage.getItem(OWNER_KEY) || "guest";

function loadSnapshots(owner: string): Snapshot[] {
  try { const v = JSON.parse(localStorage.getItem(snapshotKey(owner)) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}
function saveSnapshots(owner: string, list: Snapshot[]) {
  let l = list;
  while (l.length) {
    try { localStorage.setItem(snapshotKey(owner), JSON.stringify(l)); return; } catch { l = l.slice(0, -1); }
  }
}

function applyState(target: DataState) {
  for (const key of HISTORY_KEYS) {
    const old = localStorage.getItem(key);
    const v = target[key] ?? null;
    if (old === v) continue;
    if (v === null) localStorage.removeItem(key); else localStorage.setItem(key, v);
    window.dispatchEvent(new StorageEvent("storage", { key, oldValue: old, newValue: v }));
  }
}

const fmt = (t: number) => {
  const d = new Date(t), now = new Date();
  const time = d.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });
  if (d.toDateString() === now.toDateString()) return `오늘 ${time}`;
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return `어제 ${time}`;
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${time}`;
};

export function HistoryControls() {
  const last = useRef<DataState | null>(null);
  const owner = useRef("guest");
  const stacks = useRef<UndoStacks>({ undo: [], redo: [], lastPushAt: 0 });
  const [counts, setCounts] = useState({ undo: 0, redo: 0 });
  const [open, setOpen] = useState(false);
  const [snaps, setSnaps] = useState<Snapshot[]>([]);

  const sync = () => setCounts({ undo: stacks.current.undo.length, redo: stacks.current.redo.length });

  useEffect(() => {
    owner.current = ownerOf();
    last.current = readState(localStorage);
    const l = addSnapshot(loadSnapshots(owner.current), last.current, Date.now());
    saveSnapshots(owner.current, l);
    const tick = () => {
      const cur = readState(localStorage);
      const o = ownerOf();
      if (o !== owner.current) {
        // 계정이 바뀌면 다른 계정의 기록이 섞이지 않도록 초기화
        owner.current = o; last.current = cur;
        stacks.current = { undo: [], redo: [], lastPushAt: 0 }; sync();
        return;
      }
      if (last.current && !sameState(cur, last.current)) {
        stacks.current = recordChange(stacks.current, last.current, Date.now()); sync();
        last.current = cur;
        saveSnapshots(o, addSnapshot(loadSnapshots(o), cur, Date.now()));
      }
    };
    const id = setInterval(tick, 700);
    return () => clearInterval(id);
  }, []);

  const go = useCallback((dir: "undo" | "redo") => {
    const cur = readState(localStorage);
    const res = dir === "undo" ? undoStep(stacks.current, cur) : redoStep(stacks.current, cur);
    if (!res) return;
    stacks.current = res.stacks;
    applyState(res.target);
    last.current = readState(localStorage);
    sync();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return; // 글자 입력 중엔 브라우저 기본 되돌리기
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) { e.preventDefault(); go("undo"); }
      else if (k === "y" || (k === "z" && e.shiftKey)) { e.preventDefault(); go("redo"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const openList = () => { setSnaps(loadSnapshots(owner.current)); setOpen(true); };
  const restore = (s: Snapshot) => {
    if (!confirm(`${fmt(s.at)} 상태로 되돌릴까요?\n지금 상태도 버전 기록에 남아서 다시 돌아올 수 있어요.`)) return;
    const cur = readState(localStorage);
    saveSnapshots(owner.current, addSnapshot(loadSnapshots(owner.current), cur, Date.now(), true));
    stacks.current = recordChange({ ...stacks.current, lastPushAt: 0 }, cur, Date.now());
    applyState(s.state);
    last.current = readState(localStorage);
    sync(); setOpen(false);
  };

  const btn = "rounded-full px-2.5 py-1.5 text-sm font-semibold text-secondary-foreground transition hover:bg-sky-soft disabled:opacity-35 disabled:hover:bg-transparent";
  return (
    <>
      <div className="fixed bottom-3 left-3 z-40 flex items-center gap-0.5 rounded-full border border-sky-mid bg-card/95 p-1 shadow-md backdrop-blur print:hidden">
        <button type="button" className={btn} disabled={!counts.undo} onClick={() => go("undo")} title="되돌리기 (Ctrl+Z)" aria-label="되돌리기">↶</button>
        <button type="button" className={btn} disabled={!counts.redo} onClick={() => go("redo")} title="다시 실행 (Ctrl+Y)" aria-label="다시 실행">↷</button>
        <span className="h-4 w-px bg-border" />
        <button type="button" className={btn} onClick={openList} title="버전 기록">🕒 버전 기록</button>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4" onClick={() => setOpen(false)}>
          <div className="max-h-[80vh] w-full max-w-md overflow-auto rounded-xl border border-sky-mid bg-card p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">🕒 버전 기록</h2>
              <button type="button" className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>닫기</button>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">자료를 고치면 1분 간격으로 최근 20개까지 자동 저장돼요. 이 기기에만 보관돼요.</p>
            {snaps.length === 0 && <p className="text-sm text-muted-foreground">아직 기록이 없어요.</p>}
            <ul className="space-y-2">
              {snaps.map((s, i) => (
                <li key={s.at + ":" + i} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                  <div>
                    <div className="text-sm font-semibold text-foreground">{i === 0 ? `${fmt(s.at)} (최신)` : fmt(s.at)}</div>
                    <div className="text-xs text-muted-foreground">{changedAreas(snaps[i + 1]?.state, s.state).join(", ") || "변경 없음"}</div>
                  </div>
                  {i > 0 && (
                    <button type="button" className="shrink-0 rounded-lg border border-sky-mid bg-sky-soft px-2.5 py-1 text-xs font-semibold text-secondary-foreground hover:bg-sky-mid" onClick={() => restore(s)}>이 시점으로 복원</button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
