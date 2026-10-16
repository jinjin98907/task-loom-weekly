import { useState } from "react";
import { newTodoId, type Todo } from "@/lib/day-data";

type Props = {
  items: Todo[];
  onChange: (fn: (items: Todo[]) => Todo[]) => void;
  placeholder: string;
};

/**
 * 체크사항·안내사항 공용 투두리스트.
 * Enter로 추가, Shift+Enter 줄바꿈, 더블클릭·✎ 수정, ✕ 삭제.
 */
export function TodoList({ items, onChange, placeholder }: Props) {
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const add = () => {
    const t = draft.trim(); if (!t) return;
    onChange((x) => [...x, { id: newTodoId(), text: t, done: false }]);
    setDraft("");
  };
  const save = (id: string) => {
    const t = editText.trim();
    onChange((x) => (t ? x.map((i) => (i.id === id ? { ...i, text: t } : i)) : x.filter((i) => i.id !== id)));
    setEditing(null);
  };

  return (
    <div className="space-y-1.5">
      {items.map((t) => (
        <div key={t.id} className="group flex items-start gap-2 rounded-lg p-1.5 hover:bg-sky-soft">
          <input type="checkbox" checked={t.done} className="mt-1 accent-sky-strong"
            onChange={() => onChange((x) => x.map((i) => (i.id === t.id ? { ...i, done: !i.done } : i)))} />
          {editing === t.id ? (
            <textarea autoFocus value={editText} rows={Math.max(2, editText.split("\n").length)}
              onChange={(e) => setEditText(e.target.value)} onBlur={() => save(t.id)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); save(t.id); } if (e.key === "Escape") setEditing(null); }}
              className="flex-1 resize-none rounded border border-input p-1 text-sm outline-none" />
          ) : (
            <p onDoubleClick={() => { setEditing(t.id); setEditText(t.text); }}
              className={`flex-1 cursor-text whitespace-pre-wrap break-words text-sm leading-snug ${t.done ? "text-muted-foreground line-through" : ""}`}>{t.tag && <span className={`mr-1 rounded px-1 text-[10px] font-bold ${t.tag === "important" ? "bg-destructive/10 text-destructive" : "bg-amber-50 text-amber-800"}`}>{t.tag === "important" ? "중요" : "마감"}</span>}{t.text}</p>
          )}
          <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
            <button title="편집" onClick={() => { setEditing(t.id); setEditText(t.text); }} className="text-xs text-muted-foreground hover:text-primary">✎</button>
            <button title="삭제" onClick={() => onChange((x) => x.filter((i) => i.id !== t.id))} className="text-xs text-muted-foreground hover:text-destructive">✕</button>
          </div>
        </div>
      ))}
      <textarea value={draft} rows={Math.max(1, draft.split("\n").length)} onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); add(); } }}
        placeholder={placeholder}
        className="w-full resize-none rounded-lg border border-dashed border-sky-mid bg-transparent p-1.5 text-sm outline-none focus:border-solid focus:ring-2 focus:ring-ring" />
    </div>
  );
}
