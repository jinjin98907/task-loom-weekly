// 폭이 좁은 과목 칸에 글자가 길 때: 글씨를 점차로 줄이고, 몇 줄이 될지 가늠하는 규칙.
// 실제 높이는 AutoTextarea가 화면에서 재지만, 처음 렌더(서버 렌더)에는 이 값이 쓰인다.

export type SubjectFit = { fontClass: string; rows: number; charsPerLine: number };

const TIERS = [
  { maxLen: 4, fontClass: "text-xs", charsPerLine: 3 },
  { maxLen: 8, fontClass: "text-[11px]", charsPerLine: 4 },
  { maxLen: 14, fontClass: "text-[10px]", charsPerLine: 5 },
  { maxLen: Infinity, fontClass: "text-[9px]", charsPerLine: 6 },
] as const;

export const MAX_SUBJECT_ROWS = 8;

export function subjectFit(text: string, charsPerLine?: number): SubjectFit {
  const value = String(text ?? "");
  const len = value.replace(/\n/g, "").length;
  const tier = TIERS.find((t) => len <= t.maxLen) ?? TIERS[TIERS.length - 1]!;
  const cpl = Math.max(1, Math.floor(charsPerLine ?? tier.charsPerLine));
  const lines = value.length ? value.split("\n") : [""];
  const rows = lines.reduce((n, line) => n + Math.max(1, Math.ceil(line.length / cpl)), 0);
  return { fontClass: tier.fontClass, charsPerLine: cpl, rows: Math.min(MAX_SUBJECT_ROWS, Math.max(1, rows)) };
}
