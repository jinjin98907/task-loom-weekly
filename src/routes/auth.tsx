import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AppTabs } from "@/components/AppTabs";
import { useAccount } from "@/components/CloudSync";
import { syncNow } from "@/lib/cloud-sync-client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "로그인 · 데이터 동기화 | 우리반 대시보드" },
      { name: "description", content: "구글, 라블, 이메일 계정으로 로그인해 업무·출결·시간표 데이터를 기기 간에 동기화하세요." },
      { property: "og:title", content: "로그인 | 우리반 대시보드" },
      { property: "og:description", content: "로그인하면 대시보드 데이터가 클라우드에 저장되고 다른 기기에서도 같은 데이터를 볼 수 있어요." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAccount();
  const signedInEmail = user?.email ?? null;
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "error" | "info"; text: string } | null>(null);

  const afterAuth = async () => {
    try {
      await syncNow(); // 로그인 즉시 로컬 ↔ 클라우드 한 번 맞추고 이동
    } catch {}
    await navigate({ to: "/" });
  };

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMsg({ kind: "error", text: "이메일이나 비밀번호를 확인해 주세요." });
        return;
      }
      if (data.session) await afterAuth();
    } catch {
      setMsg({ kind: "error", text: "로그인에 실패했어요. 잠시 후 다시 시도해 주세요." });
    } finally {
      setBusy(false);
    }
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setMsg({
          kind: "error",
          text: /already/i.test(error.message)
            ? "이미 가입된 이메일이에요. 로그인해 주세요."
            : "가입에 실패했어요. 잠시 후 다시 시도해 주세요.",
        });
        return;
      }
      if (data.session) {
        await afterAuth();
        return;
      }
      setMsg({ kind: "info", text: "확인 링크를 이메일로 보냈어요. 메일에서 확인한 뒤 로그인해 주세요." });
    } catch {
      setMsg({ kind: "error", text: "가입에 실패했어요. 잠시 후 다시 시도해 주세요." });
    } finally {
      setBusy(false);
    }
  };

  const oauth = async (provider: "google" | "lovable") => {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const { lovable } = await import("@/integrations/lovable");
      const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
      if (result.error) {
        setMsg({ kind: "error", text: "로그인에 실패했어요. 다시 시도해 주세요." });
        return;
      }
      if (result.redirected) return; // 브라우저가 로그인 화면으로 이동 중
      await afterAuth();
    } catch {
      setMsg({ kind: "error", text: "로그인에 실패했어요. 다시 시도해 주세요." });
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    setMsg({
      kind: "info",
      text: "로그아웃했어요. 이 계정의 기록은 화면에서 숨겨지고, 다시 로그인하면 그대로 돌아와요.",
    });
  };

  const inputCls =
    "w-full rounded-lg border border-sky-mid bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="min-h-screen bg-background p-6">
      <AppTabs />
      <div className="mx-auto mt-10 w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm">
        {signedInEmail ? (
          <div className="space-y-4 text-center">
            <h1 className="font-display text-2xl text-foreground">☁️ 동기화 켜짐</h1>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-secondary-foreground">{signedInEmail}</span> 계정으로 로그인 중이에요.
              이 기기의 대시보드 데이터가 클라우드에 자동 저장되고, 다른 기기에서도 같은 데이터를 볼 수 있어요.
            </p>
            <div className="flex justify-center gap-2">
              <button
                onClick={() => navigate({ to: "/" })}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              >
                대시보드로 가기
              </button>
              <button
                onClick={signOut}
                className="rounded-lg border border-sky-mid bg-sky-soft px-4 py-2 text-sm font-semibold text-secondary-foreground transition hover:bg-sky-mid"
              >
                로그아웃
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              <h1 className="font-display text-2xl text-foreground">☁️ 로그인</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                로그인하면 이 기기의 데이터가 클라우드에 저장되고, 다른 기기·브라우저에서도 같은 데이터를 쓸 수 있어요.
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => oauth("google")}
                disabled={busy}
                className="w-full rounded-lg border border-sky-mid bg-sky-soft px-4 py-2.5 text-sm font-semibold text-secondary-foreground transition hover:bg-sky-mid disabled:opacity-60"
              >
                Google로 계속하기
              </button>
              <button
                onClick={() => oauth("lovable")}
                disabled={busy}
                className="w-full rounded-lg border border-sky-mid bg-sky-soft px-4 py-2.5 text-sm font-semibold text-secondary-foreground transition hover:bg-sky-mid disabled:opacity-60"
              >
                Lovable로 계속하기
              </button>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              또는 이메일로
              <span className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={mode === "signin" ? signIn : signUp} className="space-y-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일"
                autoComplete="email"
                className={inputCls}
              />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호 (6자 이상)"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                className={inputCls}
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
              >
                {busy ? "잠시만요…" : mode === "signin" ? "로그인" : "회원가입"}
              </button>
            </form>

            <p className="text-center text-xs text-muted-foreground">
              {mode === "signin" ? "계정이 없나요? " : "이미 계정이 있나요? "}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "signin" ? "signup" : "signin");
                  setMsg(null);
                }}
                className="font-semibold text-primary underline-offset-2 hover:underline"
              >
                {mode === "signin" ? "회원가입" : "로그인"}
              </button>
            </p>
          </div>
        )}

        {msg && (
          <p className={`mt-4 rounded-lg px-3 py-2 text-sm ${msg.kind === "error" ? "bg-sky-soft text-red-600" : "bg-sky-soft text-secondary-foreground"}`}>
            {msg.text}
          </p>
        )}
      </div>
    </div>
  );
}
