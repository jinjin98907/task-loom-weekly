export type GridSel = { r0: number; c0: number; r1: number; c1: number };

export function normSel(s: GridSel) {
  return { top: Math.min(s.r0, s.r1), bottom: Math.max(s.r0, s.r1), left: Math.min(s.c0, s.c1), right: Math.max(s.c0, s.c1) };
}

export function inSel(s: GridSel | null, r: number, c: number) {
  if (!s) return false;
  const n = normSel(s);
  return r >= n.top && r <= n.bottom && c >= n.left && c <= n.right;
}

export function isMulti(s: GridSel | null) {
  return !!s && (s.r0 !== s.r1 || s.c0 !== s.c1);
}

/** 선택 영역을 엑셀에 붙여넣을 수 있는 탭/줄바꿈 텍스트로 만든다. */
export function selToTSV(s: GridSel, get: (r: number, c: number) => string) {
  const n = normSel(s);
  const lines: string[] = [];
  for (let r = n.top; r <= n.bottom; r++) {
    const row: string[] = [];
    for (let c = n.left; c <= n.right; c++) row.push(get(r, c).replace(/[\t\n]/g, " "));
    lines.push(row.join("\t"));
  }
  return lines.join("\n");
}
