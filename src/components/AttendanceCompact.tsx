import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AttendanceEntries } from "@/components/AttendanceEntries";
import { toEntries, type Attendance } from "@/lib/attendance";

type Props = { value: Attendance; onChange: (a: Attendance) => void };

const KINDS = [
  { label: "결석", n: "absent", r: "absentReason" },
  { label: "지각", n: "late", r: "lateReason" },
  { label: "체험", n: "trip", r: "tripReason" },
] as const;

/** 평소엔 학생 칩만 보이고, 클릭하면 이름·사유 입력 팝오버가 열린다. */
export function AttendanceCompact({ value, onChange }: Props) {
  const chips = KINDS.flatMap((k) =>
    toEntries(value[k.n], value[k.r]).filter((e) => e.name || e.reason).map((e) => ({ kind: k.label, ...e })),
  );
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label="출결 입력" className="flex min-h-7 w-full flex-wrap items-center gap-1 rounded-md px-1 py-0.5 text-left hover:bg-sky-soft">
          {chips.length === 0 ? (
            <span className="text-xs text-muted-foreground/70">+ 출결</span>
          ) : chips.map((c, i) => (
            <span key={i} className="rounded-full border border-sky-mid bg-sky-soft px-1.5 py-0.5 text-[11px] leading-tight text-secondary-foreground">
              <b className="text-primary">{c.kind}</b> {c.name}{c.reason ? `(${c.reason})` : ""}
            </span>
          ))}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-1.5 p-3" align="start">
        <p className="mb-1 text-xs font-semibold text-secondary-foreground">👤 출결 입력 (자동 저장)</p>
        {KINDS.map((k) => (
          <AttendanceEntries key={k.n} label={k.label === "체험" ? "체험학습" : k.label} names={value[k.n]} reasons={value[k.r]}
            onChange={(n, r) => onChange({ ...value, [k.n]: n, [k.r]: r })} />
        ))}
      </PopoverContent>
    </Popover>
  );
}
