import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Users } from "lucide-react";
import { AppTabs } from "@/components/AppTabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ALL_KEYS, dateKey } from "@/lib/calendar";
import { attendanceInRange, attendanceRangeError } from "@/lib/attendance-range";

export const Route = createFileRoute("/attendance")({
  head: () => ({
    meta: [
      { title: "출결 모아보기 | 우리반 대시보드" },
      { name: "description", content: "선택한 기간의 결석·지각·교외 체험학습 기록을 주간 대시보드와 연동하여 날짜별로 확인하세요." },
      { property: "og:title", content: "출결 모아보기 — 우리반 대시보드" },
      { property: "og:description", content: "기간별 결석·지각·교외 체험학습 기록을 한눈에 확인하세요." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AttendancePage,
});

function AttendancePage() {
  const [store, setStore] = useState<unknown>({});
  const [loaded, setLoaded] = useState(false);
  const [readError, setReadError] = useState(false);
  const [range, setRange] = useState(() => {
    const now = new Date();
    return { start: dateKey(new Date(now.getFullYear(), now.getMonth(), 1)), end: dateKey(new Date(now.getFullYear(), now.getMonth() + 1, 0)) };
  });

  useEffect(() => {
    const read = () => {
      try {
        const value: unknown = JSON.parse(localStorage.getItem(ALL_KEYS.dashboard) || "{}");
        if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid records");
        setStore(value);
        setReadError(false);
      } catch {
        setReadError(true);
      }
      setLoaded(true);
    };
    read();
    const onStorage = (event: StorageEvent) => { if (!event.key || event.key === ALL_KEYS.dashboard) read(); };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", read);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", read);
    };
  }, []);

  const error = attendanceRangeError(range.start, range.end);
  const rows = useMemo(() => attendanceInRange(store, range.start, range.end), [store, range]);

  return (
    <main className="min-h-screen bg-background p-4 md:p-6">
      <AppTabs />
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 font-display text-3xl text-foreground"><Users className="size-7 text-primary" aria-hidden="true" />출결 모아보기</h1>
        {loaded && !error && !readError && <span className="text-sm text-muted-foreground">기록된 날짜 <strong className="text-primary">{rows.length}일</strong></span>}
      </header>

      <div className="mb-5 flex flex-wrap items-end gap-3 border-y border-sky-mid bg-sky-soft/40 px-3 py-4 md:px-4">
        <label className="min-w-0 flex-1 space-y-1.5 sm:max-w-48">
          <span className="text-sm font-semibold text-secondary-foreground">시작일</span>
          <Input type="date" aria-label="시작일" value={range.start} onChange={(e) => setRange((current) => ({ ...current, start: e.target.value }))} className="bg-card" />
        </label>
        <label className="min-w-0 flex-1 space-y-1.5 sm:max-w-48">
          <span className="text-sm font-semibold text-secondary-foreground">종료일</span>
          <Input type="date" aria-label="종료일" value={range.end} onChange={(e) => setRange((current) => ({ ...current, end: e.target.value }))} className="bg-card" />
        </label>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { const today = dateKey(new Date()); setRange({ start: today, end: today }); }}>오늘</Button>
          <Button variant="outline" onClick={() => {
            const now = new Date();
            setRange({ start: dateKey(new Date(now.getFullYear(), now.getMonth(), 1)), end: dateKey(new Date(now.getFullYear(), now.getMonth() + 1, 0)) });
          }}><CalendarDays aria-hidden="true" />이번 달</Button>
        </div>
      </div>

      {error ? <p role="alert" className="py-4 text-sm text-destructive">{error}</p>
        : readError ? <p role="alert" className="py-4 text-sm text-destructive">저장된 출결 기록을 불러오지 못했어요. 주간 대시보드에서 기록을 확인해 주세요.</p>
        : !loaded ? <p role="status" className="py-8 text-center text-sm text-muted-foreground">출결 기록 불러오는 중…</p>
        : <>
          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-collapse text-sm">
              <caption className="sr-only">{range.start}부터 {range.end}까지 출결 기록</caption>
              <colgroup><col className="w-28 md:w-40" /><col /><col /><col /></colgroup>
              <thead className="bg-sky-soft text-primary">
                <tr>{["날짜", "결석", "지각", "교외 체험학습"].map((label) => <th key={label} scope="col" className="border-y border-sky-mid px-2 py-3 text-left font-semibold md:px-4">{label}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const day = new Date(Number(row.date.slice(0, 4)), Number(row.date.slice(5, 7)) - 1, Number(row.date.slice(8, 10)));
                  const cols = [
                    { name: row.absent, reason: row.absentReason },
                    { name: row.late, reason: row.lateReason },
                    { name: row.trip, reason: row.tripReason },
                  ];
                  return <tr key={row.date} className="border-b border-sky-mid/60 hover:bg-sky-soft/30">
                    <th scope="row" className="px-2 py-4 text-left align-top font-medium text-secondary-foreground md:px-4"><time dateTime={row.date}>{row.date}<span className="mt-1 block text-xs text-muted-foreground">({"일월화수목금토"[day.getDay()]})</span></time></th>
                    {cols.map((col, i) => <td key={i} className="whitespace-pre-wrap break-words px-2 py-4 align-top text-foreground md:px-4">
                      {col.name.trim() ? <>{col.name}{col.reason.trim() && <span className="mt-0.5 block text-xs text-muted-foreground">{col.reason}</span>}</> : <span className="text-muted-foreground">—</span>}
                    </td>)}
                  </tr>;
                })}
                {rows.length === 0 && <tr><td colSpan={4} className="border-b border-sky-mid py-16 text-center text-muted-foreground">선택한 기간에 출결 기록이 없어요.</td></tr>}
              </tbody>
            </table>
          </div>
        </>}
    </main>
  );
}