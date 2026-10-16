// 하루치 데이터의 순수 규칙(투두 항목 형태, 예전 형식 옮기기)만 담는다.

export type Todo = { id: string; text: string; done: boolean; tag?: "important" | "deadline" };

let seq = 0;
export const newTodoId = () => `t${Date.now().toString(36)}${(seq++).toString(36)}`;

const isTodo = (v: unknown): v is Todo =>
  !!v && typeof v === "object" && typeof (v as Todo).text === "string";

/**
 * 안내사항은 예전에 한 개의 긴 글(notice)로 저장됐다.
 * 투두리스트로 바꾸면서 항목 목록(notices)으로 옮기고, 예전 글은 줄바꿈 기준으로 항목으로 나눈다.
 */
export const normalizeNotices = (d: { notices?: unknown; notice?: unknown }): Todo[] => {
  if (Array.isArray(d.notices)) return d.notices.filter(isTodo).map((t) => ({ ...t, id: t.id || newTodoId() }));
  const legacy = typeof d.notice === "string" ? d.notice : "";
  return legacy
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((text) => ({ id: newTodoId(), text, done: false }));
};
