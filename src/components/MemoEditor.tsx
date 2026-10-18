import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { AutoTextarea } from "@/components/AutoTextarea";
import {
  MEMOS_KEY, descendantIds, indentLines, loadMemos, newMemoId, parseLines, searchMemos, visibleLines, type Memo,
} from "@/lib/memos";

/** 하위 페이지 트리·검색·토글/들여쓰기를 지원하는 메모장. 분할 패널과 단독 페이지가 함께 쓴다. */
export function MemoEditor() {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"edit" | "view">("edit");
  const [closed, setClosed] = useState<Set<number>>(new Set());
  const [showTree, setShowTree] = useState(true);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const load = () => {
      const list = loadMemos(localStorage);
      const safe = list.length ? list : [{ id: newMemoId(), title: "메모 1", text: "" }];
      setMemos(safe);
      setActiveId((cur) => (safe.some((m) => m.id === cur) ? cur : safe[0]!.id));
    };
    load();
    setReady(true);
    const onStorage = (e: StorageEvent) => { if (e.key === MEMOS_KEY) load(); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => { setClosed(new Set()); }, [activeId]);

  const save = (next: Memo[]) => {
    setMemos(next);
    if (!ready) return;
    const value = JSON.stringify(next);
    localStorage.setItem(MEMOS_KEY, value);
    try { window.dispatchEvent(new StorageEvent("storage", { key: MEMOS_KEY, newValue: value })); } catch { /* ignore */ }
  };

  const active = memos.find((m) => m.id === activeId) ?? memos[0];
  const patch = (id: string, p: Partial<Memo>) => save(memos.map((m) => (m.id === id ? { ...m, ...p } : m)));
  const update = (p: Partial<Memo>) => active && patch(active.id, p);

  const add = (parentId?: string) => {
    const m: Memo = { id: newMemoId(), title: parentId ? "새 하위 페이지" : `메모 ${memos.filter((x) => !x.parentId).length + 1}`, text: "" };
    if (parentId) m.parentId = parentId;
    save([...memos.map((x) => (x.id === parentId ? { ...x, closed: false } : x)), m]);
    setActiveId(m.id);
    setQuery("");
  };
  const remove = (id: string) => {
    const ids = descendantIds(memos, id);
    const m = memos.find((x) => x.id === id);
    const sub = ids.length - 1;
    if ((m?.text || sub) && !confirm(`'${m?.title || "메모"}'${sub ? `와 하위 페이지 ${sub}개` : ""}를 지울까요?`)) return;
    const next = memos.filter((x) => !ids.includes(x.id));
    const safe = next.length ? next : [{ id: newMemoId(), title: "메모 1", text: "" }];
    save(safe);
    if (ids.includes(activeId)) setActiveId(m?.parentId && safe.some((x) => x.id === m.parentId) ? m.parentId : safe[0]!.id);
  };

  // 현재 페이지 위치(상위 경로)
  const crumbs: Memo[] = [];
  for (let c = active; c?.parentId; ) { c = memos.find((x) => x.id === c!.parentId); if (c) crumbs.unshift(c); else break; }
  const children = active ? memos.filter((m) => m.parentId === active.id) : [];

  const setText = (text: string, s?: number, e?: number) => {
    update({ text });
    if (s !== undefined) requestAnimationFrame(() => { const t = taRef.current; if (t) { t.focus(); t.setSelectionRange(s, e ?? s); } });
  };
  const onKey = (ev: KeyboardEvent<HTMLTextAreaElement>) => {
    if (ev.key !== "Tab" || !active) return;
    ev.preventDefault();
    const t = ev.currentTarget;
    const r = indentLines(active.text, t.selectionStart, t.selectionEnd, ev.shiftKey);
    setText(r.text, r.start, r.end);
  };
  const indentBtn = (out: boolean) => {
    const t = taRef.current;
    if (!t || !active) return;
    const r = indentLines(active.text, t.selectionStart, t.selectionEnd, out);
    setText(r.text, r.start, r.end);
  };
  const insertToggle = () => {
    if (!active) return;
    setMode("edit");
    const t = taRef.current;
    const pos = t ? t.selectionStart : active.text.length;
    const ls = active.text.lastIndexOf("\n", pos - 1) + 1;
    const indent = /^\s*/.exec(active.text.slice(ls))![0];
    const before = active.text.slice(0, pos);
    const lead = before && !before.endsWith("\n") ? "\n" + indent : "";
    const ins = `${lead}> 토글 제목\n${indent}  `;
    const titleStart = pos + lead.length + 2;
    setText(before + ins + active.text.slice(pos), titleStart, titleStart + 5);
  };

  const results = query.trim() ? searchMemos(memos, query) : [];
  const snippet = (m: Memo) => {
    const k = query.trim().toLowerCase();
    const i = m.text.toLowerCase().indexOf(k);
    if (i < 0) return "";
    return (i > 15 ? "…" : "") + m.text.slice(Math.max(0, i - 15), i + 40).replace(/\n/g, " ");
  };

  const renderTree = (parentId: string | undefined, depth: number): React.ReactNode =>
    memos.filter((m) => (m.parentId ?? undefined) === parentId).map((m) => {
      const kids = memos.some((x) => x.parentId === m.id);
      const on = m.id === active?.id;
      return (
        <div key={m.id}>
          <div className={`group flex items-center rounded text-xs ${on ? "bg-sky-soft text-primary" : "text-foreground hover:bg-sky-soft/60"}`}
            style={{ paddingLeft: depth * 12 }}>
            <button onClick={() => kids && patch(m.id, { closed: !m.closed })}
              className={`w-4 shrink-0 text-[10px] text-muted-foreground ${kids ? "" : "invisible"}`} aria-label="접기/펼치기">
              {m.closed ? "▶" : "▼"}
            </button>
            <button onClick={() => setActiveId(m.id)} className="min-w-0 flex-1 truncate py-1 text-left">
              📄 {m.title || "제목 없음"}
            </button>
            <button onClick={() => add(m.id)} title="하위 페이지 추가" className="px-1 opacity-0 group-hover:opacity-70 hover:!opacity-100">＋</button>
            <button onClick={() => remove(m.id)} title="지우기" className="px-1 opacity-0 group-hover:opacity-70 hover:!opacity-100">✕</button>
          </div>
          {kids && !m.closed && renderTree(m.id, depth + 1)}
        </div>
      );
    });

  const rows = active ? visibleLines(parseLines(active.text), closed) : [];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-1 border-b border-sky-mid px-2 py-1.5">
        <button onClick={() => setShowTree((v) => !v)} title="페이지 목록" className="rounded border border-sky-mid px-1.5 py-1 text-xs text-primary hover:bg-sky-soft">☰</button>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="🔍 메모 검색 (제목·내용)"
          className="min-w-0 flex-1 rounded-md border border-sky-mid bg-background px-2 py-1 text-xs outline-none focus:border-primary" />
        {query && <button onClick={() => setQuery("")} className="px-1 text-xs text-muted-foreground">✕</button>}
      </div>

      <div className="flex min-h-0 flex-1">
        {showTree && (
          <aside className="flex w-44 shrink-0 flex-col border-r border-sky-mid">
            <div className="min-h-0 flex-1 overflow-auto p-1">
              {query.trim() ? (
                results.length ? results.map((m) => (
                  <button key={m.id} onClick={() => setActiveId(m.id)}
                    className={`block w-full rounded px-2 py-1 text-left text-xs hover:bg-sky-soft ${m.id === active?.id ? "bg-sky-soft text-primary" : ""}`}>
                    <div className="truncate font-medium">📄 {m.title || "제목 없음"}</div>
                    {snippet(m) && <div className="truncate text-[10px] text-muted-foreground">{snippet(m)}</div>}
                  </button>
                )) : <p className="p-2 text-xs text-muted-foreground">검색 결과가 없어요.</p>
              ) : renderTree(undefined, 0)}
            </div>
            <button onClick={() => add()} className="m-1 rounded-md border border-dashed border-sky-mid px-2 py-1 text-xs text-primary hover:bg-sky-soft">＋ 새 페이지</button>
          </aside>
        )}

        {active && (
          <div className="min-h-0 flex-1 overflow-auto p-3">
            {crumbs.length > 0 && (
              <div className="mb-1 flex flex-wrap gap-1 text-[11px] text-muted-foreground">
                {crumbs.map((c) => (
                  <span key={c.id}><button onClick={() => setActiveId(c.id)} className="hover:text-primary hover:underline">{c.title || "제목 없음"}</button> /</span>
                ))}
              </div>
            )}
            <input value={active.title} onChange={(e) => update({ title: e.target.value })} placeholder="제목"
              className="mb-2 w-full border-b border-sky-mid bg-transparent pb-1 text-sm font-bold text-foreground outline-none" />

            <div className="mb-2 flex flex-wrap items-center gap-1 text-xs">
              <div className="flex overflow-hidden rounded-md border border-sky-mid">
                <button onClick={() => setMode("edit")} className={`px-2 py-0.5 ${mode === "edit" ? "bg-sky-soft text-primary" : "text-muted-foreground"}`}>✏️ 편집</button>
                <button onClick={() => setMode("view")} className={`px-2 py-0.5 ${mode === "view" ? "bg-sky-soft text-primary" : "text-muted-foreground"}`}>📖 토글 보기</button>
              </div>
              <button onClick={insertToggle} className="rounded-md border border-sky-mid px-2 py-0.5 text-primary hover:bg-sky-soft">▶ 토글</button>
              {mode === "edit" && <>
                <button onClick={() => indentBtn(false)} title="들여쓰기 (Tab)" className="rounded-md border border-sky-mid px-2 py-0.5 text-primary hover:bg-sky-soft">→ 들여쓰기</button>
                <button onClick={() => indentBtn(true)} title="내어쓰기 (Shift+Tab)" className="rounded-md border border-sky-mid px-2 py-0.5 text-primary hover:bg-sky-soft">← 내어쓰기</button>
              </>}
              <button onClick={() => add(active.id)} className="rounded-md border border-sky-mid px-2 py-0.5 text-primary hover:bg-sky-soft">＋ 하위 페이지</button>
            </div>

            {mode === "edit" ? (
              <>
                <AutoTextarea ref={taRef} value={active.text} onChange={(e) => update({ text: e.target.value })} onKeyDown={onKey}
                  placeholder={"떠오르는 아이디어를 자유롭게 적어보세요. 자동 저장돼요.\nTab: 들여쓰기 · Shift+Tab: 내어쓰기 · '> '로 시작하면 토글"}
                  className="min-h-[40vh] w-full resize-none overflow-hidden bg-transparent font-sans text-sm leading-relaxed text-foreground outline-none" />
              </>
            ) : (
              <div className="min-h-[40vh] text-sm leading-relaxed text-foreground">
                {rows.length === 1 && !rows[0]!.text ? <p className="text-muted-foreground">내용이 없어요.</p> : rows.map((r) => (
                  <div key={r.idx} style={{ paddingLeft: r.depth * 18 }} className="flex min-h-[1.6em] items-start whitespace-pre-wrap">
                    {r.toggle ? (
                      <button onClick={() => setClosed((s) => { const n = new Set(s); n.has(r.idx) ? n.delete(r.idx) : n.add(r.idx); return n; })}
                        className="flex items-start gap-1 text-left font-medium hover:text-primary">
                        <span className={`mt-0.5 inline-block w-3 text-[10px] text-muted-foreground transition-transform ${closed.has(r.idx) || !r.hasChildren ? "" : "rotate-90"}`}>▶</span>
                        {r.text || "토글"}
                      </button>
                    ) : <span>{r.text}</span>}
                  </div>
                ))}
              </div>
            )}

            {children.length > 0 && (
              <div className="mt-4 border-t border-sky-mid pt-2">
                <p className="mb-1 text-[11px] text-muted-foreground">하위 페이지</p>
                {children.map((c) => (
                  <button key={c.id} onClick={() => setActiveId(c.id)} className="block w-full truncate rounded px-2 py-1 text-left text-xs hover:bg-sky-soft">📄 {c.title || "제목 없음"}</button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
