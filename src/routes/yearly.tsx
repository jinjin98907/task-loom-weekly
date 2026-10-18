import { createFileRoute } from "@tanstack/react-router";
import { AppTabs } from "@/components/AppTabs";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { inSel, isMulti, selToTSV, type GridSel } from "@/lib/grid-select";

import { isCurrentRange, isCurrentWeek, isPastWeek, orderSemesters, orderWeeks } from "@/lib/timetable-order";
import { hasPeriod, isLongDay } from "@/lib/timetable-periods";
import { CLASS_COUNT_KEY, MAX_CLASSES, classLabels, normalizeClassCount } from "@/lib/class-sync";
import { normalizeRules, parseBackup, styleFor, type ColorRule } from "@/lib/keyword-colors";

export const Route = createFileRoute("/yearly")({
  head: () => ({
    meta: [
      { title: "학년 전체 시간표 (1년) | 우리반 대시보드" },
      { name: "description", content: "1·2학기 주차별·반별 학년 시간표를 한눈에 관리하고 엑셀에서 붙여넣기하세요." },
      { property: "og:title", content: "학년 전체 시간표 (1년)" },
      { property: "og:description", content: "주차별·반별 학년 시간표 관리, 엑셀 붙여넣기와 색상 하이라이트 지원." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Yearly,
});

type Cell = { t: string; c?: string | undefined; b?: string | undefined };
type Cells = Record<string, Cell>;
const KEY = "teacher-yearly-timetable-v1";
const RULES_KEY = "teacher-yearly-color-rules-v1";
const PERIODS = 6;
const COLS = 5 * PERIODS;
const SEMS = [
  { label: "1학기", start: new Date(2026, 2, 1), end: new Date(2026, 7, 24) },
  { label: "2학기", start: new Date(2026, 7, 25), end: new Date(2027, 1, 28) },
];
const TEXT_COLORS = ["#111827", "#DC2626", "#DB2777", "#3A5A8C", "#6D5B9E", "#059669", "#B45309"];
const BG_COLORS = ["", "#FEE2E2", "#FCE7F3", "#DCE6F2", "#E7E3F2", "#D1FAE5", "#FEF3C7"];

const pad = (n: number) => String(n).padStart(2, "0");
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const DOW = "일월화수목금토";

function weeksOf(start: Date, end: Date) {
  const m = new Date(start); m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  const out: Date[][] = [];
  while (m <= end) {
    const days = Array.from({ length: 5 }, (_, i) => { const d = new Date(m); d.setDate(d.getDate() + i); return d; });
    if (days[4]! >= start) out.push(days);
    m.setDate(m.getDate() + 7);
  }
  return out;
}

  function Yearly() {
  const [cells, setCells] = useState<Cells>({});
  const [loaded, setLoaded] = useState(false);
  const [sem, setSem] = useState<number | null>(null);
  const [today] = useState(() => new Date());
  const [menu, setMenu] = useState<{ x: number; y: number; k: string } | null>(null);
  const [bulk, setBulk] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [rules, setRules] = useState<ColorRule[]>([]);
  const [classCount, setClassCount] = useState(3);
  const CLASSES = useMemo(() => classLabels(classCount), [classCount]);
  const NC = CLASSES.length;
  const [rulesOpen, setRulesOpen] = useState(false);
  const [nw, setNw] = useState("");
  const [nc, setNc] = useState<string | undefined>(undefined);
  const [nb, setNb] = useState<string | undefined>(undefined);
  // 아래 연간 표의 실제 셀 폭을 재서 위 요약 카드에 그대로 적용
  const bigTableRef = useRef<HTMLTableElement | null>(null);
  const [cellW, setCellW] = useState(34);
  useEffect(() => {
    const el = bigTableRef.current;
    if (!el) return;
    const update = () => setCellW(Math.max(18, (el.clientWidth - 52) / 30));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    try { setCells(JSON.parse(localStorage.getItem(KEY) || "{}")); } catch {}
    try { setRules(normalizeRules(JSON.parse(localStorage.getItem(RULES_KEY) || "[]"))); } catch {}
    setClassCount(normalizeClassCount(localStorage.getItem(CLASS_COUNT_KEY)));
    setLoaded(true);
    // 다른 창/탭(주간 대시보드)에서 과목을 고치면 즉시 반영
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) { try { setCells(JSON.parse(e.newValue || "{}")); } catch {} }
      if (e.key === CLASS_COUNT_KEY) setClassCount(normalizeClassCount(e.newValue));
      if (e.key === RULES_KEY) { try { setRules(normalizeRules(JSON.parse(e.newValue || "[]"))); } catch {} }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  useEffect(() => { if (loaded) localStorage.setItem(KEY, JSON.stringify(cells)); }, [cells, loaded]);
  useEffect(() => { if (loaded) localStorage.setItem(RULES_KEY, JSON.stringify(rules)); }, [rules, loaded]);
  useEffect(() => {
    const close = () => setMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const semOrder = useMemo(() => orderSemesters(SEMS, today), [today]);
  const semIdx = sem ?? semOrder[0]!;
  const S = SEMS[semIdx]!;
  const weeks = useMemo(() => weeksOf(S.start, S.end), [S]);
  // 화면에 보이는 순서: 이번 주가 맨 위, 지난 주는 맨 아래
  const ordered = useMemo(() => orderWeeks(weeks, today), [weeks, today]);
  const weekNum = useMemo(() => {
    const m = new Map<string, number>();
    weeks.forEach((w, i) => m.set(keyOf(w[0]!), i + 1));
    return m;
  }, [weeks]);
  const inRange = (d: Date) => d >= S.start && d <= S.end;
  const ck = (d: Date, cls: number, p: number) => `${keyOf(d)}|${cls}|${p}`;
  // global grid coordinate -> cell key (list: 화면 순서 또는 학기 chronological 순서)
  const keyAtIn = (list: Date[][], row: number, col: number) => {
    const w = list[Math.floor(row / NC)]; if (!w || col < 0 || col >= COLS) return null;
    const d = w[Math.floor(col / PERIODS)]!;
    if (!inRange(d) || !hasPeriod(d, col % PERIODS)) return null;
    return ck(d, row % NC, col % PERIODS);
  };
  const keyAt = (row: number, col: number) => keyAtIn(ordered, row, col);

  // 드래그 선택 + Ctrl+C 복사
  const [sel, setSel] = useState<GridSel | null>(null);
  const dragging = useRef(false);
  const copyRef = useRef<() => string | null>(() => null);
  copyRef.current = () => (sel && isMulti(sel) ? selToTSV(sel, (r, c) => { const k = keyAt(r, c); return k ? cells[k]?.t ?? "" : ""; }) : null);
  useEffect(() => {
    const up = () => { dragging.current = false; };
    const onCopy = (e: ClipboardEvent) => {
      const t = copyRef.current(); if (t == null) return;
      e.preventDefault(); e.clipboardData?.setData("text/plain", t);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSel(null); };
    window.addEventListener("mouseup", up);
    document.addEventListener("copy", onCopy);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("mouseup", up); document.removeEventListener("copy", onCopy); window.removeEventListener("keydown", onKey); };
  }, []);

  const pasteGrid = (text: string, row: number, col: number, list: Date[][] = ordered) => {
    const rows = text.replace(/\r/g, "").replace(/\n$/, "").split("\n").map((r) => r.split("\t"));
    setCells((s) => {
      const n = { ...s };
      rows.forEach((r, i) => r.forEach((v, j) => {
        const k = keyAtIn(list, row + i, col + j); if (!k) return;
        n[k] = { ...n[k], t: v.trim() };
      }));
      return n;
    });
  };

  const setCell = (k: string, patch: Partial<Cell>) => setCells((s) => ({ ...s, [k]: { t: "", ...s[k], ...patch } }));

  const addRule = () => {
    const w = nw.trim(); if (!w || (!nc && !nb)) return;
    setRules((s) => [...s.filter((x) => x.word !== w), { word: w, ...(nc ? { color: nc } : {}), ...(nb ? { bg: nb } : {}) }]);
    setNw(""); setNc(undefined); setNb(undefined);
  };

  const downloadTemplate = () => {
    const head = ["주 시작일", "반", ...Array.from({ length: COLS }, (_, i) => `${"월화수목금"[Math.floor(i / PERIODS)]}${(i % PERIODS) + 1}`)];
    const lines = [head.join("\t")];
    weeks.forEach((w) => CLASSES.forEach((c, ci) => {
      const vals = Array.from({ length: COLS }, (_, col) => {
        const d = w[Math.floor(col / PERIODS)]!; const p = col % PERIODS; return hasPeriod(d, p) ? (cells[ck(d, ci, p)]?.t ?? "") : "";
      });
      lines.push([keyOf(w[0]!), c, ...vals].join("\t"));
    }));
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/tab-separated-values;charset=utf-8" });
    dl(blob, `학년시간표-${S.label}-양식.tsv`);
  };

  const applyBulk = () => {
    let rows = bulkText.replace(/\r/g, "").split("\n").filter((r) => r.trim() !== "");
    if (rows[0]?.startsWith("주")) rows = rows.slice(1);
    const stripped = rows.map((r) => { const c = r.split("\t"); return /^\d{4}-\d{2}-\d{2}$/.test(c[0]?.trim() ?? "") ? c.slice(2) : c; });
    pasteGrid(stripped.map((c) => c.join("\t")).join("\n"), 0, 0, weeks);
    setBulk(false); setBulkText("");
  };

  const menuCell = menu ? cells[menu.k] : undefined;

  return (
    <div className="min-h-screen bg-background p-4">
      <AppTabs />
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          
          <h1 className="font-display text-2xl text-foreground">📅 학년 전체 시간표 (2026학년도)</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="flex items-center gap-1 rounded-lg border border-sky-mid bg-card px-2 py-1 font-semibold text-secondary-foreground">
            학급 수
            <select aria-label="학급 수" value={classCount} onChange={(e) => { const n = normalizeClassCount(e.target.value); setClassCount(n); localStorage.setItem(CLASS_COUNT_KEY, String(n)); }} className="bg-transparent outline-none">
              {Array.from({ length: MAX_CLASSES }, (_, i) => <option key={i} value={i + 1}>{i + 1}개 반</option>)}
            </select>
          </label>
          <Btn onClick={downloadTemplate}>📄 엑셀 양식 다운로드</Btn>
          <Btn onClick={() => setBulk(true)}>📋 일괄 붙여넣기</Btn>
          <Btn onClick={() => setRulesOpen(true)}>🎨 단어 색상 규칙</Btn>
        </div>
      </header>

      <WeekCards classes={CLASSES} today={today} cells={cells} rules={rules} setCell={setCell} cellW={cellW}
        onMenu={(x, y, k) => setMenu({ x, y, k })} />

      <div className="mb-3 flex items-center gap-2">
        {semOrder.map((i) => {
          const s = SEMS[i]!;
          const on = semIdx === i;
          return (
            <button key={s.label} onClick={() => setSem(i)}
              className={`rounded-lg px-5 py-2 text-sm font-semibold transition ${on ? "bg-primary text-primary-foreground shadow-sm" : "border border-sky-mid bg-card text-secondary-foreground hover:bg-sky-soft"}`}>
              {s.label} <span className="font-normal opacity-80">({s.start.getMonth() + 1}/{s.start.getDate()}~{s.end.getMonth() + 1}/{s.end.getDate()})</span>
              {isCurrentRange(s, today) && <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${on ? "bg-primary-foreground/25 text-primary-foreground" : "border border-sky-mid text-primary"}`}>현재</span>}
            </button>
          );
        })}
        <p className="ml-2 text-xs text-muted-foreground">드래그로 여러 칸 선택 후 Ctrl+C · 칸을 누르고 Ctrl+V로 붙여넣기 · 우클릭으로 색상 변경</p>
      </div>

      <div className="space-y-2">
        {ordered.map((w, wi) => {
          const past = isPastWeek(w, today);
          const cur = isCurrentWeek(w, today);
          return (
          <Fragment key={keyOf(w[0]!)}>
          {wi > 0 && !isPastWeek(ordered[wi - 1]!, today) && past && (
            <p className="pt-1 text-xs font-semibold text-muted-foreground">지난주</p>
          )}
          <div className={`overflow-x-auto rounded-lg border bg-card ${past ? "opacity-90" : ""}`}>
            <table ref={wi === 0 ? bigTableRef : undefined} className="w-full table-fixed border-collapse text-[11px]">
              <colgroup><col style={{ width: 52 }} />{Array.from({ length: COLS }, (_, i) => <col key={i} />)}</colgroup>
              <thead>
                <tr className="bg-sky-soft">
                  <th className="border px-1 py-0.5 text-secondary-foreground">
                    <span className={past ? "text-muted-foreground" : ""}>{weekNum.get(keyOf(w[0]!))}주</span>
                    {cur && <span className="mt-0.5 block rounded bg-primary/10 text-[10px] font-semibold text-primary">이번 주</span>}
                  </th>
                  {w.map((d) => (
                    <th key={keyOf(d)} colSpan={PERIODS} className={`border px-1 py-0.5 font-semibold ${inRange(d) ? "text-secondary-foreground" : "text-muted-foreground/50"} ${keyOf(d) === keyOf(today) ? "bg-sky-mid/60" : isLongDay(d) ? "bg-sky-mid/55" : ""}`}>
                      {d.getMonth() + 1}월 {d.getDate()}일 {DOW[d.getDay()]}
                      {keyOf(d) === keyOf(today) && <span className="ml-1 rounded bg-primary px-1.5 py-0.5 text-[9px] font-semibold text-primary-foreground">오늘</span>}
                    </th>
                  ))}
                </tr>
                <tr className="bg-sky-soft/50 text-muted-foreground">
                  <th className="border" />
                  {Array.from({ length: COLS }, (_, i) => {
                    const d = w[Math.floor(i / PERIODS)]!;
                    const on = inRange(d) && hasPeriod(d, i % PERIODS);
                    return <th key={i} className={`border font-normal ${on ? "text-secondary-foreground" : "text-muted-foreground/40"} ${keyOf(d) === keyOf(today) ? "bg-today" : isLongDay(d) ? "bg-day-alt" : ""}`}>{(i % PERIODS) + 1}</th>;
                  })}
                </tr>
              </thead>
              <tbody>
                {CLASSES.map((cls, ci) => (
                  <tr key={cls}>
                    <th className="border bg-sky-soft/40 px-1 font-semibold text-secondary-foreground">{cls}</th>
                    {Array.from({ length: COLS }, (_, col) => {
                      const d = w[Math.floor(col / PERIODS)]!;
                      const R = wi * NC + ci;
                      const selOn = isMulti(sel) && inSel(sel, R, col);
                      const dragProps = {
                        onMouseDown: (e: React.MouseEvent) => { if (e.button !== 0) return; dragging.current = true; setSel({ r0: R, c0: col, r1: R, c1: col }); },
                        onMouseEnter: (e: React.MouseEvent) => {
                          if (!dragging.current || !(e.buttons & 1)) return;
                          (document.activeElement as HTMLElement | null)?.blur?.();
                          window.getSelection()?.removeAllRanges();
                          setSel((s) => (s ? { ...s, r1: R, c1: col } : s));
                        },
                      };
                      if (!inRange(d) || !hasPeriod(d, col % PERIODS)) return <td key={col} {...dragProps} className={`border cell-off ${selOn ? "outline outline-2 -outline-offset-2 outline-primary/60" : ""}`} />;
                      const k = ck(d, ci, col % PERIODS);
                      const c = cells[k];
                      const st = { ...styleFor(c?.t ?? "", rules), ...(c?.c ? { color: c.c } : {}), ...(c?.b ? { background: c.b } : {}) };
                      return (
                        <td key={col} {...dragProps} className={`border p-0 ${selOn ? "outline outline-2 -outline-offset-2 outline-primary/60" : ""} ${col % PERIODS === 0 ? (keyOf(d) === keyOf(today) ? "border-l-2 border-l-primary" : "border-l-2 border-l-sky-mid") : ""} ${keyOf(d) === keyOf(today) ? "bg-today" : isLongDay(d) ? "bg-day-alt" : ""}`} style={{ background: selOn ? "color-mix(in oklch, var(--sky-mid) 55%, transparent)" : st.background }}>
                          <input
                            value={c?.t ?? ""}
                            onChange={(e) => setCell(k, { t: e.target.value })}
                            onPaste={(e) => {
                              const t = e.clipboardData.getData("text/plain");
                              if (t.includes("\t") || t.replace(/\r?\n$/, "").includes("\n")) { e.preventDefault(); pasteGrid(t, wi * NC + ci, col); }
                            }}
                            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setMenu({ x: e.clientX, y: e.clientY, k }); }}
                            style={{ color: st.color }}
                            className="w-full bg-transparent px-0.5 py-1 text-center font-medium outline-none focus:bg-sky-soft/60"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </Fragment>
          );
        })}
      </div>

      {menu && (
        <div onClick={(e) => e.stopPropagation()} style={{ left: Math.min(menu.x, window.innerWidth - 220), top: Math.min(menu.y, window.innerHeight - 160) }}
          className="fixed z-50 w-52 rounded-xl border bg-card p-3 text-xs shadow-lg">
          <p className="mb-1 font-semibold text-foreground">글자색</p>
          <div className="mb-2 flex gap-1">
            {TEXT_COLORS.map((x) => <button key={x} onClick={() => setCell(menu.k, { c: x })} className={`h-6 w-6 rounded-full border ${menuCell?.c === x ? "ring-2 ring-primary" : ""}`} style={{ background: x }} />)}
          </div>
          <p className="mb-1 font-semibold text-foreground">배경색</p>
          <div className="mb-2 flex gap-1">
            {BG_COLORS.map((x) => <button key={x || "none"} onClick={() => setCell(menu.k, { b: x || undefined })} className={`h-6 w-6 rounded border ${menuCell?.b === x ? "ring-2 ring-primary" : ""}`} style={{ background: x || "transparent" }}>{x ? "" : "✕"}</button>)}
          </div>
          <button onClick={() => { setCell(menu.k, { c: undefined, b: undefined }); setMenu(null); }} className="w-full rounded-md border px-2 py-1 text-muted-foreground hover:bg-muted">자동 색상으로 되돌리기</button>
        </div>
      )}

      {rulesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4" onClick={() => setRulesOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-card p-5 shadow-xl">
            <h2 className="mb-1 font-display text-lg text-foreground">🎨 단어 색상 규칙</h2>
            <p className="mb-3 text-xs text-muted-foreground">시간표에 입력한 글자에 이 단어가 포함되면 지정한 색이 자동으로 표시돼요.</p>
            <div className="mb-3 rounded-lg border bg-background p-3">
              <input value={nw} onChange={(e) => setNw(e.target.value)} placeholder="단어 입력 (예: 등산, 독서)"
                className="mb-2 w-full rounded-md border bg-card px-2 py-1 text-sm" />
              <p className="mb-1 text-xs font-semibold text-foreground">글자색</p>
              <div className="mb-2 flex gap-1">
                {TEXT_COLORS.map((x) => <button key={x} onClick={() => setNc(nc === x ? undefined : x)} className={`h-6 w-6 rounded-full border ${nc === x ? "ring-2 ring-primary" : ""}`} style={{ background: x }} />)}
              </div>
              <p className="mb-1 text-xs font-semibold text-foreground">배경색</p>
              <div className="mb-2 flex gap-1">
                {BG_COLORS.map((x) => <button key={x || "none"} onClick={() => setNb((nb || "") === x ? undefined : x || undefined)} className={`h-6 w-6 rounded border ${(nb || "") === x ? "ring-2 ring-primary" : ""}`} style={{ background: x || "transparent" }}>{x ? "" : "✕"}</button>)}
              </div>
              <button disabled={!nw.trim() || (!nc && !nb)} onClick={addRule}
                className="w-full rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-40">규칙 추가</button>
            </div>
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {rules.length === 0 && <p className="py-2 text-center text-xs text-muted-foreground">아직 추가한 규칙이 없어요. (재량휴업·공개수업·창중 같은 기본 단어는 자동으로 색이 들어가요.)</p>}
              {rules.map((r) => (
                <div key={r.word} className="flex items-center justify-between rounded-md border px-2 py-1.5 text-xs">
                  <span className="flex items-center gap-2">
                    <span className="rounded px-1.5 py-0.5 font-semibold" style={{ color: r.color, background: r.bg }}>{r.word}</span>
                    <span className="text-muted-foreground">{[r.color ? "글자" : "", r.bg ? "배경" : ""].filter(Boolean).join(" + ")}</span>
                  </span>
                  <button onClick={() => setRules((s) => s.filter((x) => x.word !== r.word))} className="text-muted-foreground hover:text-destructive">✕</button>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-end">
              <Btn onClick={() => setRulesOpen(false)}>닫기</Btn>
            </div>
          </div>
        </div>
      )}

      {bulk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4" onClick={() => setBulk(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-3xl rounded-2xl bg-card p-5 shadow-xl">
            <h2 className="mb-1 font-display text-lg text-foreground">📋 {S.label} 일괄 붙여넣기</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              엑셀 양식(또는 같은 모양의 표)을 통째로 복사해 붙여넣으세요. 한 주는 1반~{NC}반 {NC}줄, 각 줄은 월1~금6 (30칸)입니다. {S.label} 첫 주부터 차례로 채워져요.
            </p>
            <textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)} rows={12}
              className="w-full rounded-lg border bg-background p-2 font-mono text-xs" placeholder="여기에 Ctrl+V" />
            <div className="mt-3 flex justify-end gap-2">
              <Btn onClick={() => setBulk(false)}>취소</Btn>
              <button onClick={applyBulk} className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground">불러오기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function mondayOf(d: Date) { const m = new Date(d.getFullYear(), d.getMonth(), d.getDate()); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); return m; }

function WeekCards({ classes: CLASSES, today, cells, rules, setCell, onMenu, cellW }: {
  classes: string[]; today: Date; cells: Cells; rules: ColorRule[];
  setCell: (k: string, p: Partial<Cell>) => void; onMenu: (x: number, y: number, k: string) => void;
  /** 아래 연간 표의 실제 셀 폭(px) — 요약 카드 셀을 같은 크기로 맞춤 */
  cellW: number;
}) {
  const [mon, setMon] = useState(() => mondayOf(today));
  const days = Array.from({ length: 5 }, (_, i) => { const d = new Date(mon); d.setDate(d.getDate() + i); return d; });
  const shift = (n: number) => setMon((m) => { const x = new Date(m); x.setDate(x.getDate() + n * 7); return x; });
  const isCur = keyOf(mon) === keyOf(mondayOf(today));
  const inYear = (d: Date) => SEMS.some((s) => d >= s.start && d <= s.end);
  const f = (d: Date) => `${d.getMonth() + 1}월 ${d.getDate()}일`;
  return (
    <section className="mb-3 rounded-xl border bg-card p-2">
      <div className="mb-1.5 flex flex-wrap items-center gap-1.5 text-xs">
        <h2 className="mr-1 font-semibold text-foreground">이번 주 반별 시간표</h2>
        <Btn sm onClick={() => shift(-1)}>◀ 이전 주</Btn>
        <button onClick={() => setMon(mondayOf(today))} className={`rounded-md px-2 py-0.5 font-semibold ${isCur ? "bg-primary text-primary-foreground" : "border border-sky-mid bg-sky-soft text-secondary-foreground hover:bg-sky-mid"}`}>
          오늘 ({f(days[0]!)}~{days[4]!.getDate()}일)
        </button>
        <Btn sm onClick={() => shift(1)}>다음 주 ▶</Btn>
        {!isCur && <span className="text-[10px] text-muted-foreground">보는 주: {f(days[0]!)} ~ {f(days[4]!)}</span>}
      </div>
      <div className="grid grid-cols-3 gap-x-0.5 gap-y-1.5">
        {CLASSES.map((cls, ci) => (
          <table key={cls} className="w-auto table-fixed border-collapse text-[11px]">
            <colgroup><col style={{ width: 22 }} />{days.map((d) => <col key={keyOf(d)} style={{ width: Math.round(cellW) }} />)}</colgroup>
            <thead>
              <tr className="bg-sky-soft">
                <th className="border px-0 py-0.5 font-semibold text-primary">{cls}</th>
                {days.map((d) => (
                  <th key={keyOf(d)} className="border px-0 py-0.5 text-[9px] font-semibold text-secondary-foreground">{DOW[d.getDay()]}<span className="font-normal opacity-70">{d.getDate()}</span></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: PERIODS }, (_, p) => (
                <tr key={p}>
                  <th className="border bg-sky-soft/40 py-0.5 text-[9px] font-semibold text-secondary-foreground">{p + 1}</th>
                  {days.map((d) => {
                    if (!inYear(d) || !hasPeriod(d, p)) return <td key={keyOf(d)} className="border cell-off" />;
                    const k = `${keyOf(d)}|${ci}|${p}`;
                    const c = cells[k];
                    const st = { ...styleFor(c?.t ?? "", rules), ...(c?.c ? { color: c.c } : {}), ...(c?.b ? { background: c.b } : {}) };
                    return (
                      <td key={keyOf(d)} className="border p-0" style={{ background: st.background }}>
                        <input value={c?.t ?? ""} onChange={(e) => setCell(k, { t: e.target.value })}
                          onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onMenu(e.clientX, e.clientY, k); }}
                          style={{ color: st.color }}
                          className="w-full bg-transparent px-0.5 py-1 text-center text-[11px] font-medium outline-none focus:bg-sky-soft/60" />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        ))}
      </div>
    </section>
  );
}

function dl(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

function Btn({ children, onClick, sm }: { children: React.ReactNode; onClick: () => void; sm?: boolean }) {
  return <button onClick={onClick} className={`rounded-lg border border-sky-mid bg-card font-semibold text-secondary-foreground transition hover:bg-sky-soft ${sm ? "px-2 py-0.5 text-xs" : "px-3 py-1.5"}`}>{children}</button>;
}
