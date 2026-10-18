import { createFileRoute } from "@tanstack/react-router";
import { AppTabs } from "@/components/AppTabs";
import { MemoEditor } from "@/components/MemoEditor";

export const Route = createFileRoute("/memo")({
  head: () => ({
    meta: [
      { title: "아이디어 메모장 | 우리반 대시보드" },
      { name: "description", content: "떠오르는 아이디어를 바로 적는 교사용 메모장" },
      { property: "og:title", content: "아이디어 메모장 | 우리반 대시보드" },
      { property: "og:description", content: "떠오르는 아이디어를 바로 적는 교사용 메모장" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MemoPage,
});

function MemoPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background p-4">
      <AppTabs />
      <h1 className="mb-2 text-lg font-bold text-primary">📝 아이디어 메모장</h1>
      <div className="flex min-h-[75vh] flex-1 flex-col rounded-lg border border-sky-mid">
        <MemoEditor />
      </div>
    </div>
  );
}
