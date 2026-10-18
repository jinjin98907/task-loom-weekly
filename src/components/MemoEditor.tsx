import { useEffect, useState } from "react";
import { AutoTextarea } from "@/components/AutoTextarea";
import { MEMOS_KEY, loadMemos, newMemoId, type Memo } from "@/lib/memos";

/** 여러 장의 메모(탭)와 자동 저장. 분할 패널과 단독 페이지가 함께 쓴다. */
export function MemoEditor() {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const load = () => {
      const list = loadMemos(localStorage);
      const safe = list.length ? list : [{ id: newMemoId(), title: "메모 1", text: "" }];
      setMemos(safe);
      setActiveId((cur) => (safe.some((m) => m.id === cur) ? cur : safe[0].id));
    };
    load();
    setReady(true);
    const onStorage = (e: StorageEvent) => { if (e.key === MEMOS_KEY) load(); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const save = (next: Memo[]) => {
    setMemos(next);
    if (!ready) return;
    const value = JSON.stringify(next);
    localStorage.setItem(MEMOS_KEY, value);
    try { window.dispatchEvent(new StorageEvent("storage", { key: MEMOS_KEY, newValue: value })); } catch { /* ignore */ }
  };

  const active = memos.find((m) => m.id === activeId) ?? memos[0];
  const update = (patch: Partial<Memo>) =>
    active && save(memos.map((m) => (m.id === active.id ? { ...m, ...patch } : m)));
  const add = () => {
    const m = { id: newMemoId(), title: `메모 ${memos.length + 1}`, text: "" };
    save([...memos, m]);
    setActiveId(m.id);
  };
  const remove = (id: string) => {
    const m = memos.find((x) => x.id === id);
    if (m?.text && !confirm(`'${m.title || "메모"}'를 지울까요?`)) return;
    const next = memos.filter((x) => x.id !== id);
    const safe = next.length ? next : [{ id: newMemoId(), title: "메모 1", text: "" }];
    save(safe);
    if (id === activeId) setActiveId(safe[0].id);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-1 border-b border-sky-mid px-2 py-1.5">
        {memos.map((m) => (
          <span key={m.id}
            className={`flex items-center rounded-md border text-xs ${m.id === active?.id ? "border-primary bg-sky-soft text-primary" : "border-sky-mid text-muted-foreground"}`}>
            <button onClick={() => setActiveId(m.id)} className="max-w-[9rem] truncate px-2 py-1">
              {m.title || "제목 없음"}
            </button>
            <button onClick={() => remove(m.id)} title="메모 지우기" className="px-1 opacity-60 hover:opacity-100">✕</button>
          </span>
        ))}
        <button onClick={add} className="rounded-md border border-dashed border-sky-mid px-2 py-1 text-xs text-primary hover:bg-sky-soft">
          ＋ 새 메모
        </button>
      </div>
      {active && (
        <div className="min-h-0 flex-1 overflow-auto p-3">
          <input value={active.title} onChange={(e) => update({ title: e.target.value })}
            placeholder="제목"
            className="mb-2 w-full border-b border-sky-mid bg-transparent pb-1 text-sm font-bold text-foreground outline-none" />
          <AutoTextarea value={active.text} onChange={(e) => update({ text: e.target.value })}
            placeholder="떠오르는 아이디어를 자유롭게 적어보세요. 자동 저장돼요."
            className="min-h-[50vh] w-full resize-none overflow-hidden bg-transparent text-sm leading-relaxed text-foreground outline-none" />
        </div>
      )}
    </div>
  );
}
