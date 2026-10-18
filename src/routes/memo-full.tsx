import { createFileRoute } from "@tanstack/react-router";
import { MemoEditor } from "@/components/MemoEditor";

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
  return (
    <div className="flex h-dvh flex-col bg-background">
      <MemoEditor />
    </div>
  );
}
