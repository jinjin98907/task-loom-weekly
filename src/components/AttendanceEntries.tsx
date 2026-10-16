import { toEntries, fromEntries, type StudentEntry } from "@/lib/attendance";

type Props = { label: string; names: string; reasons: string; onChange: (names: string, reasons: string) => void };

const inputCls = "min-w-0 w-full rounded-md border border-sky-mid bg-sky-soft/60 px-1.5 py-1 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring";

export function AttendanceEntries({ label, names, reasons, onChange }: Props) {
  const list = toEntries(names, reasons);
  const rows = list.length && (list.at(-1)?.name || list.at(-1)?.reason) ? [...list, { name: "", reason: "" }] : list.length ? list : [{ name: "", reason: "" }];
  const set = (next: StudentEntry[]) => { const o = fromEntries(next); onChange(o.names, o.reasons); };
  return (
    <div className="grid grid-cols-[52px_minmax(0,1fr)] items-start gap-1">
      <span className="pt-1 text-[11px] font-semibold text-primary">{label}</span>
      <div className="space-y-0.5">
        {rows.map((e, i) => (
          <div key={i} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_14px] items-center gap-0.5">
            <input value={e.name} placeholder="이름" aria-label={`${label} 학생 이름 ${i + 1}`} className={inputCls}
              onChange={(ev) => { const n = [...rows]; n[i] = { ...e, name: ev.target.value }; set(n); }} />
            <input value={e.reason} placeholder="사유" aria-label={`${label} 사유 ${i + 1}`} className={`${inputCls} bg-sky-soft/30`}
              onChange={(ev) => { const n = [...rows]; n[i] = { ...e, reason: ev.target.value }; set(n); }} />
            {(e.name || e.reason) ? (
              <button type="button" aria-label="삭제" className="text-[10px] text-muted-foreground hover:text-foreground"
                onClick={() => set(rows.filter((_, j) => j !== i))}>✕</button>
            ) : <span />}
          </div>
        ))}
      </div>
    </div>
  );
}
