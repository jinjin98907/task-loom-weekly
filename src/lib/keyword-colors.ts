// 단어 → 색상 규칙: 사용자가 지정한 단어가 들어간 시간표 셀에 자동으로 색을 입힌다.
// 순수 로직만 포함 (브라우저/서버 어디서든 사용 가능, 유닛 테스트 대상).

export type ColorRule = { word: string; color?: string; bg?: string };

/** 기본 제공 규칙: 붉은 계열(행사·휴일), 파란 계열(전담·특화 수업) */
export const DEFAULT_RULES: ColorRule[] = [
  { word: "재량휴업", color: "#DC2626", bg: "#FDF2F8" },
  { word: "휴업", color: "#DC2626", bg: "#FDF2F8" },
  { word: "한글날", color: "#DC2626", bg: "#FDF2F8" },
  { word: "공개수업", color: "#DC2626", bg: "#FDF2F8" },
  { word: "소방교육", color: "#DC2626", bg: "#FDF2F8" },
  { word: "방학", color: "#DC2626", bg: "#FDF2F8" },
  { word: "개교기념", color: "#DC2626", bg: "#FDF2F8" },
  { word: "현장체험", color: "#DC2626", bg: "#FDF2F8" },
  { word: "운동회", color: "#DC2626", bg: "#FDF2F8" },
  { word: "졸업", color: "#DC2626", bg: "#FDF2F8" },
  { word: "입학", color: "#DC2626", bg: "#FDF2F8" },
  { word: "시험", color: "#DC2626", bg: "#FDF2F8" },
  { word: "평가", color: "#DC2626", bg: "#FDF2F8" },
  { word: "창중", color: "#3A5A8C" },
  { word: "체스", color: "#3A5A8C" },
  { word: "동아리", color: "#3A5A8C" },
  { word: "영어", color: "#3A5A8C" },
  { word: "음악", color: "#3A5A8C" },
  { word: "체육", color: "#3A5A8C" },
  { word: "전담", color: "#3A5A8C" },
  { word: "코딩", color: "#3A5A8C" },
];

export const DEFAULT_WORDS = new Set(DEFAULT_RULES.map((r) => r.word));

function normalizeRule(r: ColorRule): ColorRule | null {
  const word = (r?.word ?? "").trim();
  if (!word) return null;
  const color = r.color?.trim() || undefined;
  const bg = r.bg?.trim() || undefined;
  if (!color && !bg) return null;
  return { word, ...(color ? { color } : {}), ...(bg ? { bg } : {}) };
}

/** 저장된 규칙 배열을 정리: 빈 규칙 제거, 같은 단어는 나중 것이 이김 */
export function normalizeRules(rules: unknown): ColorRule[] {
  if (!Array.isArray(rules)) return [];
  const byWord = new Map<string, ColorRule>();
  for (const raw of rules) {
    const r = normalizeRule(raw as ColorRule);
    if (r) byWord.set(r.word, r);
  }
  return [...byWord.values()];
}

export type AutoStyle = { color?: string; background?: string };

/**
 * 셀 텍스트에 규칙을 적용한 색을 반환한다.
 * - 사용자 지정 규칙이 기본 규칙보다 우선
 * - 같은 그룹 안에서는 나중에 등록된 규칙이 이김 (같은 단어를 다시 추가하면 새 설정으로 바뀜)
 */
export function styleFor(text: string, userRules: ColorRule[]): AutoStyle {
  const t = text.trim();
  if (!t) return {};
  for (const g of [userRules, DEFAULT_RULES]) {
    for (const r of g) {
      if (t.includes(r.word)) {
        return { ...(r.color ? { color: r.color } : {}), ...(r.bg ? { background: r.bg } : {}) };
      }
    }
  }
  return {};
}

/** 백업 JSON에 규칙을 함께 담기 위한 형식 판별 */
export function parseBackup(data: unknown): { cells: Record<string, unknown>; rules: ColorRule[] } | null {
  if (typeof data !== "object" || !data || Array.isArray(data)) return null;
  const d = data as Record<string, unknown>;
  const c = d["cells"];
  if (typeof c === "object" && c !== null && !Array.isArray(c)) {
    return { cells: c as Record<string, unknown>, rules: normalizeRules(d["rules"]) };
  }
  // 구버전 백업: cells 맵이 곧 전체 데이터
  return { cells: data as Record<string, unknown>, rules: [] };
}
