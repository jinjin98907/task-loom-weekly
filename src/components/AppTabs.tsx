import { Link } from "@tanstack/react-router";

const TABS = [
  { to: "/", label: "🏫 주간 대시보드" },
  { to: "/yearly", label: "📅 학년 전체 시간표 (1년)" },
  { to: "/calendar", label: "🗓️ 업무 캘린더" },
  { to: "/attendance", label: "👤 출결 모아보기" },
] as const;

export function AppTabs() {
  return (
    <nav className="mb-4 flex flex-wrap gap-1 border-b border-sky-mid">
      {TABS.map((t) => (
        <Link key={t.to} to={t.to} activeOptions={{ exact: true }}
          className="-mb-px rounded-t-lg border border-transparent px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-sky-soft"
          activeProps={{ className: "border-sky-mid border-b-background bg-background text-primary" }}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
