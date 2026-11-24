import { attendanceEntries, setAttendanceEntries, type Attendance, type AttendanceKind, type StudentEntry } from "@/lib/attendance";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

type Props = { kind: AttendanceKind; value: Attendance; onChange: (value: Attendance) => void };

const inputCls = "min-w-0 w-full rounded-md border border-sky-mid bg-sky-soft/60 px-1.5 py-1 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring";

export function AttendanceEntries({ kind, value, onChange }: Props) {
  const label = kind.label;
  const list = attendanceEntries(value, kind);
  const rows = list.length && (list.at(-1)?.name || list.at(-1)?.reason) ? [...list, { name: "", reason: "" }] : list.length ? list : [{ name: "", reason: "" }];
  const set = (next: StudentEntry[]) => onChange(setAttendanceEntries(value, kind, next));
  return (
    <div className="grid grid-cols-[52px_minmax(0,1fr)] items-start gap-1">
      <span className="pt-1 text-[11px] font-semibold text-primary">{label}</span>
      <div className="space-y-1.5">
        {rows.map((e, i) => (
          <div key={i} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_20px] items-center gap-0.5">
            <input value={e.name} placeholder="이름" aria-label={`${label} 학생 이름 ${i + 1}`} className={inputCls}
              onChange={(ev) => { const n = [...rows]; n[i] = { ...e, name: ev.target.value }; set(n); }} />
            <input value={e.reason} placeholder="사유" aria-label={`${label} 사유 ${i + 1}`} className={`${inputCls} bg-sky-soft/30`}
              onChange={(ev) => { const n = [...rows]; n[i] = { ...e, reason: ev.target.value }; set(n); }} />
            {(e.name || e.reason) ? (
              <Button type="button" variant="ghost" size="icon" aria-label={`${label} 학생 삭제 ${i + 1}`} title="삭제" className="size-5 text-muted-foreground"
                onClick={() => set(rows.filter((_, j) => j !== i))}><X className="size-3" /></Button>
            ) : <span />}
            {(e.name || e.reason) && kind.forms.length > 0 && <div className="col-span-3 flex flex-wrap gap-x-3 gap-y-1 py-1">
              {kind.forms.map((form) => <label key={form.key} className="flex cursor-pointer items-center gap-1 text-[11px] text-primary">
                <Checkbox aria-label={`${label} ${e.name || `학생 ${i + 1}`} ${form.label} 제출`} checked={e.documents?.[form.key] === true}
                  onCheckedChange={(checked) => { const next = [...rows]; next[i] = { ...e, documents: { ...e.documents, [form.key]: checked === true } }; set(next); }} />
                {form.label}{form.optional ? " (선택)" : ""}
              </label>)}
            </div>}
          </div>
        ))}
      </div>
    </div>
  );
}
