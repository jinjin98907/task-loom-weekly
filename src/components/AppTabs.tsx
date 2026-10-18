import { Link } from "@tanstack/react-router";
import { useAccount } from "@/components/CloudSync";
import { toggleMemo } from "@/components/MemoSplit";

const TABS = [
  { to: "/", label: "🏫 주간 대시보드" },
  { to: "/yearly", label: "📅 학년 전체 시간표 (1년)" },
  { to: "/calendar", label: "🗓️ 업무 캘린더" },
  { to: "/attendance", label: "👤 출결 모아보기" },
] as const;

export function AppTabs() {
  const { user } = useAccount();
  const signedIn = Boolean(user);

  return (
    <nav className="mb-4 flex flex-wrap items-center gap-1 border-b border-sky-mid">
      <div className="flex flex-wrap gap-1">
        {TABS.map((t) => (
          <Link key={t.to} to={t.to} activeOptions={{ exact: true }}
            className="-mb-px rounded-t-lg border border-transparent px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-sky-soft"
            activeProps={{ className: "border-sky-mid border-b-background bg-background text-primary" }}>
            {t.label}
          </Link>
        ))}
      </div>
      <button
        type="button"
        onClick={toggleMemo}
        title="메모장을 옆에 열거나 닫기"
        className="ml-auto -mb-px rounded-t-lg border border-transparent px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-sky-soft"
      >
        📝 메모장
      </button>
      <Link
        to="/auth"
        className={`-mb-px rounded-t-lg border border-transparent px-4 py-2 text-sm font-semibold hover:bg-sky-soft ${signedIn ? "text-primary" : "text-muted-foreground"}`}
      >
        ☁️ {signedIn ? "동기화 켜짐" : "로그인"}
      </Link>
    </nav>
  );
}
