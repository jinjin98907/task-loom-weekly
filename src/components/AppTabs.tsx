import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

const TABS = [
  { to: "/", label: "🏫 주간 대시보드" },
  { to: "/yearly", label: "📅 학년 전체 시간표 (1년)" },
  { to: "/calendar", label: "🗓️ 업무 캘린더" },
  { to: "/attendance", label: "👤 출결 모아보기" },
] as const;

export function AppTabs() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let active = true;
    let unsub: (() => void) | undefined;
    import("@/integrations/supabase/client")
      .then(({ supabase }) => {
        supabase.auth.getSession().then(({ data }) => {
          if (active) setSignedIn(!!data.session);
        });
        const sub = supabase.auth.onAuthStateChange((_event, session) => {
          if (active) setSignedIn(!!session);
        });
        unsub = () => sub.data.subscription.unsubscribe();
      })
      .catch(() => {});
    return () => {
      active = false;
      unsub?.();
    };
  }, []);

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
      <Link
        to="/auth"
        className={`ml-auto -mb-px rounded-t-lg border border-transparent px-4 py-2 text-sm font-semibold hover:bg-sky-soft ${signedIn ? "text-primary" : "text-muted-foreground"}`}
      >
        ☁️ {signedIn ? "동기화 켜짐" : "로그인"}
      </Link>
    </nav>
  );
}
