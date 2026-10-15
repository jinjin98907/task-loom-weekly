import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment, useEffect, useMemo, useState } from "react";

import { isCurrentRange, isCurrentWeek, isPastWeek, orderSemesters, orderWeeks } from "@/lib/timetable-order";

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
const CLASSES = ["1반", "2반", "3반"];
const PERIODS = 6;
const COLS = 5 * PERIODS;
const SEMS = [
  { label: "1학기", start: new Date(2026, 2, 1), end: new Date(2026, 7, 24) },
  { label: "2학기", start: new Date(2026, 7, 25), end: new Date(2027, 1, 28) },
];
const RED = ["재량휴업", "한글날", "공개수업", "소방교육", "휴업", "방학", "개교기념", "현장체험", "운동회", "졸업", "입학", "시험", "평가"];
const BLUE = ["창중", "체스", "동아리", "영어", "음악", "체육", "전담", "코딩"];
const TEXT_COLORS = ["#111827", "#DC2626", "#DB2777", "#3A5A8C", "#6D5B9E", "#059669", "#B45309"];
const BG_COLORS = ["", "#FEE2E2", "#FCE7F3", "#DCE6F2", "#E7E3F2", "#D1FAE5", "#FEF3C7"];

const pad = (n: number) => String(n).padStart(2, "0");
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const DOW = "일월화수목금토";

function autoStyle(t: string): { color?: string; background?: string } {
  if (!t) return {};
  if (RED.some((w) => t.includes(w))) return { color: "#DC2626", background: "#FDF2F8" };
  if (BLUE.some((w) => t.includes(w))) return { color: "#3A5A8C" };
  return {};
}

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

  useEffect(() => {
    try { setCells(JSON.parse(localStorage.getItem(KEY) || "{}")); } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => { if (loaded) localStorage.setItem(KEY, JSON.stringify(cells)); }, [cells, loaded]);
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
    const w = list[Math.floor(row / 3)]; if (!w || col < 0 || col >= COLS) return null;
    const d = w[Math.floor(col / PERIODS)]!;
    if (!inRange(d)) return null;
    return ck(d, row % 3, col % PERIODS);
  };
  const keyAt = (row: number, col: number) => keyAtIn(ordered, row, col);

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

  const downloadTemplate = () => {
    const head = ["주 시작일", "반", ...Array.from({ length: COLS }, (_, i) => `${"월화수목금"[Math.floor(i / PERIODS)]}${(i % PERIODS) + 1}`)];
    const lines = [head.join("\t")];
    weeks.forEach((w) => CLASSES.forEach((c, ci) => {
      const vals = Array.from({ length: COLS }, (_, col) => {
        const d = w[Math.floor(col / PERIODS)]!; return cells[ck(d, ci, col % PERIODS)]?.t ?? "";
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
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/" className="rounded-lg border border-sky-mid bg-card px-3 py-1.5 text-sm text-secondary-foreground hover:bg-sky-soft">← 주간 대시보드</Link>
          <h1 className="font-display text-2xl text-foreground">📅 학년 전체 시간표 (2026학년도)</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Btn onClick={downloadTemplate}>📄 엑셀 양식 다운로드</Btn>
          <Btn onClick={() => setBulk(true)}>📋 일괄 붙여넣기</Btn>
          <Btn onClick={() => dl(new Blob([JSON.stringify(cells, null, 2)], { type: "application/json" }), `학년시간표-백업-${keyOf(new Date())}.json`)}>💾 데이터 전체 백업</Btn>
          <label className="cursor-pointer rounded-lg border border-sky-mid bg-sky-soft px-3 py-1.5 font-semibold text-secondary-foreground hover:bg-sky-mid">
            📂 데이터 불러오기
            <input type="file" accept=".json,application/json" className="hidden" onChange={async (e) => {
              const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
              try {
                const d = JSON.parse(await f.text());
                if (typeof d !== "object" || !d || Array.isArray(d)) throw 0;
                if (confirm("현재 학년 시간표를 파일 내용으로 바꿀까요?")) setCells(d);
              } catch { alert("올바른 백업 파일이 아니에요."); }
            }} />
          </label>
        </div>
      </header>

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
        <p className="ml-2 text-xs text-muted-foreground">엑셀에서 여러 칸을 복사해 칸을 누르고 Ctrl+V · 우클릭으로 색상 변경</p>
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
            <table className="w-full table-fixed border-collapse text-[11px]">
              <colgroup><col style={{ width: 52 }} />{Array.from({ length: COLS }, (_, i) => <col key={i} />)}</colgroup>
              <thead>
                <tr className="bg-sky-soft">
                  <th className="border px-1 py-0.5 text-secondary-foreground">
                    <span className={past ? "text-muted-foreground" : ""}>{weekNum.get(keyOf(w[0]!))}주</span>
                    {cur && <span className="mt-0.5 block rounded bg-primary/10 text-[10px] font-semibold text-primary">이번 주</span>}
                  </th>
                  {w.map((d) => (
                    <th key={keyOf(d)} colSpan={PERIODS} className={`border px-1 py-0.5 font-semibold ${inRange(d) ? "text-secondary-foreground" : "text-muted-foreground/50"} ${keyOf(d) === keyOf(today) ? "bg-sky-mid" : ""}`}>
                      {d.getMonth() + 1}월 {d.getDate()}일 {DOW[d.getDay()]}
                    </th>
                  ))}
                </tr>
                <tr className="bg-sky-soft/50 text-muted-foreground">
                  <th className="border" />
                  {Array.from({ length: COLS }, (_, i) => <th key={i} className="border font-normal">{(i % PERIODS) + 1}</th>)}
                </tr>
              </thead>
              <tbody>
                {CLASSES.map((cls, ci) => (
                  <tr key={cls}>
                    <th className="border bg-sky-soft/40 px-1 font-semibold text-secondary-foreground">{cls}</th>
                    {Array.from({ length: COLS }, (_, col) => {
                      const d = w[Math.floor(col / PERIODS)]!;
                      if (!inRange(d)) return <td key={col} className="border bg-muted/40" />;
                      const k = ck(d, ci, col % PERIODS);
                      const c = cells[k];
                      const st = { ...autoStyle(c?.t ?? ""), ...(c?.c ? { color: c.c } : {}), ...(c?.b ? { background: c.b } : {}) };
                      return (
                        <td key={col} className={`border p-0 ${col % PERIODS === 0 ? "border-l-2 border-l-sky-mid" : ""}`} style={{ background: st.background }}>
                          <input
                            value={c?.t ?? ""}
                            onChange={(e) => setCell(k, { t: e.target.value })}
                            onPaste={(e) => {
                              const t = e.clipboardData.getData("text/plain");
                              if (t.includes("\t") || t.replace(/\r?\n$/, "").includes("\n")) { e.preventDefault(); pasteGrid(t, wi * 3 + ci, col); }
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

      {bulk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4" onClick={() => setBulk(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-3xl rounded-2xl bg-card p-5 shadow-xl">
            <h2 className="mb-1 font-display text-lg text-foreground">📋 {S.label} 일괄 붙여넣기</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              엑셀 양식(또는 같은 모양의 표)을 통째로 복사해 붙여넣으세요. 한 주는 1반·2반·3반 세 줄, 각 줄은 월1~금6 (30칸)입니다. {S.label} 첫 주부터 차례로 채워져요.
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

function dl(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

function Btn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button onClick={onClick} className="rounded-lg border border-sky-mid bg-card px-3 py-1.5 font-semibold text-secondary-foreground transition hover:bg-sky-soft">{children}</button>;
}
