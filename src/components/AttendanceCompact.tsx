import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AttendanceEntries } from "@/components/AttendanceEntries";
import { ATTENDANCE_KINDS, attendanceEntries, documentSummary, type Attendance } from "@/lib/attendance";
import { Button } from "@/components/ui/button";

type Props = { value: Attendance; onChange: (a: Attendance) => void };

/** 평소엔 학생 칩만 보이고, 클릭하면 이름·사유 입력 팝오버가 열린다. */
export function AttendanceCompact({ value, onChange }: Props) {
  const chips = ATTENDANCE_KINDS.flatMap((k) =>
    attendanceEntries(value, k).filter((e) => e.name || e.reason).map((e) => ({ kind: k.label, summary: documentSummary(e, k), ...e })),
  );
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" aria-label="출결 입력" className="flex h-auto min-h-7 w-full flex-wrap justify-start gap-1 whitespace-normal rounded-md px-1 py-0.5 text-left font-normal hover:bg-sky-soft">
          {chips.length === 0 ? (
            <span className="text-xs text-muted-foreground/70">+ 출결</span>
          ) : chips.map((c, i) => (
            <span key={i} title={c.summary || undefined} className="max-w-full break-words rounded-full border border-sky-mid bg-sky-soft px-1.5 py-0.5 text-[11px] leading-tight text-secondary-foreground">
              <b className="text-primary">{c.kind}</b> {c.name}{c.reason ? `(${c.reason})` : ""}
            </span>
          ))}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="max-h-[70dvh] w-80 max-w-[calc(100vw-24px)] space-y-2 overflow-y-auto p-3" align="start">
        <p className="mb-1 text-xs font-semibold text-secondary-foreground">👤 출결 입력 (자동 저장)</p>
        {ATTENDANCE_KINDS.map((k) => (
          <AttendanceEntries key={k.n} kind={k} value={value} onChange={onChange} />
        ))}
      </PopoverContent>
    </Popover>
  );
}
