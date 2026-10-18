// 아이디어 메모 저장 형식 (브라우저 안전, 순수 로직)
export const MEMOS_KEY = "teacher-memos-v2";
export const LEGACY_MEMO_KEY = "teacher-memo-v1";

export type Memo = { id: string; title: string; text: string };

export const newMemoId = () => Math.random().toString(36).slice(2, 10);

export function normalizeMemos(raw: unknown): Memo[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m): m is { id?: unknown; title?: unknown; text?: unknown } => !!m && typeof m === "object")
    .map((m) => ({
      id: typeof m.id === "string" && m.id ? m.id : newMemoId(),
      title: typeof m.title === "string" ? m.title : "",
      text: typeof m.text === "string" ? m.text : "",
    }));
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
