import { createFileRoute } from "@tanstack/react-router";
import { MemoEditor } from "@/components/MemoEditor";
import { useAccount } from "@/components/CloudSync";

export const Route = createFileRoute("/memo-full")({
  head: () => ({
    meta: [
      { title: "메모장 전체화면 | 우리반 대시보드" },
      { name: "description", content: "다른 메뉴 없이 메모장만 전체화면으로 쓰는 페이지" },
      { property: "og:title", content: "메모장 전체화면 | 우리반 대시보드" },
      { property: "og:description", content: "다른 메뉴 없이 메모장만 전체화면으로 쓰는 페이지" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MemoFullPage,
});

function MemoFullPage() {
  const { user, loading } = useAccount();
  return (
    <div className="flex h-dvh flex-col bg-background">
      <div className="flex justify-end border-b border-sky-mid px-3 py-1">
        <a
          href="/auth"
          target="_blank"
          rel="noopener"
          title={user ? "로그인 정보 보기" : "로그인하면 다른 기기와 메모가 연동돼요"}
          className={`rounded-md px-3 py-1 text-xs font-semibold hover:bg-sky-soft ${user ? "text-primary" : "text-muted-foreground"}`}
        >
          ☁️ {loading ? "확인 중…" : user ? `동기화 켜짐 (${user.email ?? ""})` : "로그인"}
        </a>
      </div>
      <MemoEditor />
    </div>
  );
}
