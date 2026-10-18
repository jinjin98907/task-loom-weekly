import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppTabs } from "@/components/AppTabs";
import { Button } from "@/components/ui/button";
import { syncNow, unlockEncryption } from "@/lib/cloud-sync-client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "비밀번호 재설정 | 우리반 대시보드" },
      { name: "description", content: "이메일로 받은 링크로 새 비밀번호를 정하세요." },
      { property: "og:title", content: "비밀번호 재설정 | 우리반 대시보드" },
      { property: "og:description", content: "우리반 대시보드 계정의 새 비밀번호를 설정하는 화면이에요." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "error" | "info"; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (pw !== pw2) {
      setMsg({ kind: "error", text: "두 비밀번호가 서로 달라요." });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setMsg({ kind: "error", text: "링크가 만료되었거나 잘못되었어요. 로그인 화면에서 다시 요청해 주세요." });
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      let ok = true;
      try { ok = await unlockEncryption(pw); } catch {}
      if (ok) await syncNow().catch(() => {});
      setMsg({
        kind: "info",
        text: ok
          ? "비밀번호를 바꿨어요. 잠시 후 대시보드로 이동해요."
          : "비밀번호를 바꿨어요. 다만 클라우드 기록은 예전 비밀번호로 잠겨 있어요. 예전 기기에서 기록을 열거나 로그인 화면에서 예전 비밀번호로 잠금 해제해 주세요.",
      });
      if (ok) setTimeout(() => void navigate({ to: "/" }), 1200);
    } catch {
      setMsg({ kind: "error", text: "비밀번호를 바꾸지 못했어요. 다시 시도해 주세요." });
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    "w-full rounded-lg border border-sky-mid bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="min-h-screen bg-background p-6">
      <AppTabs />
      <div className="mx-auto mt-10 w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm">
        <h1 className="text-center font-display text-2xl text-foreground">🔑 새 비밀번호 정하기</h1>
        <form onSubmit={submit} className="mt-4 space-y-2">
          <input type="password" required minLength={6} value={pw} onChange={(e) => setPw(e.target.value)}
            placeholder="새 비밀번호 (6자 이상)" aria-label="새 비밀번호" autoComplete="new-password" className={inputCls} />
          <input type="password" required minLength={6} value={pw2} onChange={(e) => setPw2(e.target.value)}
            placeholder="새 비밀번호 확인" aria-label="새 비밀번호 확인" autoComplete="new-password" className={inputCls} />
          <Button type="submit" disabled={busy} className="w-full">{busy ? "잠시만요…" : "비밀번호 변경"}</Button>
        </form>
        {msg && (
          <p role={msg.kind === "error" ? "alert" : "status"} className={`mt-4 rounded-lg bg-sky-soft px-3 py-2 text-sm ${msg.kind === "error" ? "text-destructive" : "text-secondary-foreground"}`}>
            {msg.text}
          </p>
        )}
      </div>
    </div>
  );
}
