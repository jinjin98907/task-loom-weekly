// 아이디어 메모 저장 형식 (브라우저 안전, 순수 로직)
export const MEMOS_KEY = "teacher-memos-v2";
export const LEGACY_MEMO_KEY = "teacher-memo-v1";

/** parentId가 있으면 그 메모의 하위 페이지. closed는 트리에서 접힘 여부. */
export type Memo = { id: string; title: string; text: string; parentId?: string; closed?: boolean };

export const newMemoId = () => Math.random().toString(36).slice(2, 10);

export function normalizeMemos(raw: unknown): Memo[] {
  if (!Array.isArray(raw)) return [];
  const list = raw
    .filter((m): m is Record<string, unknown> => !!m && typeof m === "object")
    .map((m) => {
      const memo: Memo = {
        id: typeof m.id === "string" && m.id ? m.id : newMemoId(),
        title: typeof m.title === "string" ? m.title : "",
        text: typeof m.text === "string" ? m.text : "",
      };
      if (typeof m.parentId === "string" && m.parentId) memo.parentId = m.parentId;
      if (m.closed === true) memo.closed = true;
      return memo;
    });
  // 부모가 사라진 페이지는 최상위로 올린다.
  const ids = new Set(list.map((m) => m.id));
  return list.map((m) => (m.parentId && (!ids.has(m.parentId) || m.parentId === m.id) ? { ...m, parentId: undefined } : m));
}

/** 저장된 메모 목록을 읽는다. 예전 한 칸짜리 메모가 있으면 첫 메모로 옮긴다. */
export function loadMemos(s: Pick<Storage, "getItem">): Memo[] {
  try {
    const raw = s.getItem(MEMOS_KEY);
    if (raw) return normalizeMemos(JSON.parse(raw));
  } catch { /* ignore */ }
  const legacy = s.getItem(LEGACY_MEMO_KEY);
  return legacy ? [{ id: newMemoId(), title: "메모 1", text: legacy }] : [];
}

/** 메모와 그 아래 모든 하위 페이지의 id. */
export function descendantIds(memos: Memo[], id: string): string[] {
  const out = [id];
  for (let i = 0; i < out.length; i++) for (const m of memos) if (m.parentId === out[i] && !out.includes(m.id)) out.push(m.id);
  return out;
}

/** 제목·본문 검색. 대소문자 무시. */
export function searchMemos(memos: Memo[], q: string): Memo[] {
  const k = q.trim().toLowerCase();
  if (!k) return memos;
  return memos.filter((m) => m.title.toLowerCase().includes(k) || m.text.toLowerCase().includes(k));
}

/** 선택한 줄들을 들여쓰기(2칸) 또는 내어쓰기. 새 텍스트와 선택 범위를 돌려준다. */
export function indentLines(text: string, start: number, end: number, out: boolean) {
  const ls = text.lastIndexOf("\n", start - 1) + 1;
  const le = end > start && text[end - 1] === "\n" ? end - 1 : end;
  const block = text.slice(ls, le);
  const lines = block.split("\n");
  let first = 0;
  const next = lines.map((l, i) => {
    if (!out) { if (i === 0) first = 2; return "  " + l; }
    const n = l.startsWith("  ") ? 2 : l.startsWith(" ") || l.startsWith("\t") ? 1 : 0;
    if (i === 0) first = -n;
    return l.slice(n);
  }).join("\n");
  return {
    text: text.slice(0, ls) + next + text.slice(le),
    start: Math.max(ls, start + first),
    end: le + (next.length - block.length) + (end - le),
  };
}

export type MemoLine = { idx: number; depth: number; text: string; toggle: boolean; hasChildren: boolean };

/** '> '로 시작하는 줄은 토글. 그보다 더 들여쓴 다음 줄들이 토글 내용. */
export function parseLines(text: string): MemoLine[] {
  const raw = text.split("\n");
  const rows = raw.map((l, idx) => {
    const m = /^(\s*)(.*)$/.exec(l)!;
    const depth = Math.floor(m[1]!.replace(/\t/g, "  ").length / 2);
    const toggle = m[2]!.startsWith("> ") || m[2] === ">";
    return { idx, depth, text: toggle ? m[2]!.replace(/^>\s?/, "") : m[2]!, toggle, hasChildren: false };
  });
  rows.forEach((r, i) => {
    const n = rows.slice(i + 1).find((x) => x.text.trim() !== "");
    r.hasChildren = r.toggle && !!n && n.depth > r.depth;
  });
  return rows;
}

/** 접힌 토글(closedIdx)의 내용 줄을 숨긴 결과. */
export function visibleLines(rows: MemoLine[], closed: Set<number>): MemoLine[] {
  const out: MemoLine[] = [];
  let hideBelow: number | null = null;
  for (const r of rows) {
    if (hideBelow !== null) {
      if (r.text.trim() === "" || r.depth > hideBelow) continue;
      hideBelow = null;
    }
    out.push(r);
    if (r.toggle && closed.has(r.idx)) hideBelow = r.depth;
  }
  return out;
}
