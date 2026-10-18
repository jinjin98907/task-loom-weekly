import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppTabs } from "@/components/AppTabs";

const MEMO_KEY = "teacher-memo-v1";

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
  const [text, setText] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setText(localStorage.getItem(MEMO_KEY) ?? "");
    setReady(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === MEMO_KEY) setText(e.newValue ?? "");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  useEffect(() => {
    if (ready) localStorage.setItem(MEMO_KEY, text);
  }, [text, ready]);

  return (
    <div className="flex min-h-screen flex-col bg-background p-4">
      <AppTabs />
      <h1 className="mb-2 text-lg font-bold text-primary">📝 아이디어 메모장</h1>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="생각나는 아이디어를 자유롭게 적어보세요…"
        className="min-h-[70vh] flex-1 resize-none rounded-lg border border-sky-mid bg-background p-4 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}
