import { useState } from "react";
import { summarizeAttendance } from "@/lib/attendance-summary.functions";

type Rec = { date: string; absent: string; late: string };

export function AttendanceAI({ records }: { records: Rec[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState("");
  const [err, setErr] = useState("");

  const run = async () => {
    setBusy(true); setErr(""); setOut("");
    try {
      const r = await summarizeAttendance({ data: { question: q, records } });
      if (r.ok) setOut(r.text); else setErr(r.error);
    } catch { setErr("요약을 만들지 못했어요. 잠시 후 다시 시도해 주세요."); }
    setBusy(false);
  };

  return (
    <div className="mb-5 rounded-2xl border border-sky-mid bg-sky-soft/50 p-4">
      <button onClick={() => setOpen(!open)} className="font-display text-lg text-secondary-foreground">
        🤖 출결 AI 요약 {open ? "▲" : "▼"}
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <div className="flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !busy) run(); }}
              placeholder="예: 이번 주 지각이 잦은 학생은? (비워두면 전체 요약)"
              className="flex-1 rounded-lg border bg-card px-3 py-2 text-sm"
            />
            <button disabled={busy} onClick={run} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              {busy ? "요약 중…" : "요약하기"}
            </button>
          </div>
          {err && <p className="text-sm text-destructive">{err}</p>}
          {out && <div className="whitespace-pre-wrap rounded-lg bg-card p-3 text-sm text-foreground">{out}</div>}
        </div>
      )}
    </div>
  );
}
