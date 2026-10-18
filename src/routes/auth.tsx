import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AppTabs } from "@/components/AppTabs";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/components/CloudSync";
import { syncNow, unlockEncryption } from "@/lib/cloud-sync-client";
import { clearKeys, notifyE2eeChange } from "@/lib/e2ee";
import { useE2eeUnlocked } from "@/hooks/use-e2ee";
import { releaseLocalOwner, notifyLocalOwnerChange } from "@/lib/cloud-local-owner";

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
  const unlocked = useE2eeUnlocked(user?.id);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "error" | "info"; text: string } | null>(null);

  const afterAuth = async (pw?: string) => {
    if (pw) {
      try {
        if (!(await unlockEncryption(pw))) {
          setMsg({ kind: "error", text: "클라우드 데이터가 다른 비밀번호로 잠겨 있어 열 수 없어요. 예전 비밀번호로 잠금 해제해 주세요." });
          return;
        }
      } catch {}
    }
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
      if (data.session) await afterAuth(password);
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
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: window.location.origin },
      });
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
        await afterAuth(password);
        return;
      }
      setMsg({ kind: "info", text: "확인 링크를 이메일로 보냈어요. 메일에서 확인한 뒤 로그인해 주세요." });
    } catch {
      setMsg({ kind: "error", text: "가입에 실패했어요. 잠시 후 다시 시도해 주세요." });
    } finally {
      setBusy(false);
    }
  };

  const sendReset = async () => {
    if (busy) return;
    const target = email.trim();
    if (!target) {
      setMsg({ kind: "error", text: "위 칸에 가입한 이메일을 먼저 적어 주세요." });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase.auth.resetPasswordForEmail(target, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setMsg({ kind: "info", text: "가입된 이메일이면 비밀번호 재설정 링크를 보냈어요. 메일함(스팸함 포함)을 확인해 주세요." });
    } catch {
      setMsg({ kind: "error", text: "메일을 보내지 못했어요. 잠시 후 다시 시도해 주세요." });
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
    if (busy) return;
    setBusy(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      await queryClient.cancelQueries();
      queryClient.clear();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      clearKeys(localStorage);
      notifyE2eeChange();
      if (releaseLocalOwner(localStorage)) notifyLocalOwnerChange();
      setPassword("");
      setEmail("");
      await navigate({ to: "/auth", replace: true });
      setMsg({
        kind: "info",
        text: "로그아웃했어요. 이 계정의 기록은 화면에서 숨겨지고, 다시 로그인하면 그대로 돌아와요.",
      });
    } catch {
      setMsg({ kind: "error", text: "로그아웃하지 못했어요. 다시 시도해 주세요." });
    } finally {
      setBusy(false);
    }
  };

  const unlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      if (await unlockEncryption(password)) {
        setPassword("");
        await syncNow().catch(() => {});
        setMsg({ kind: "info", text: "잠금을 풀었어요. 이제 암호화된 상태로 동기화돼요." });
      } else {
        setMsg({ kind: "error", text: "비밀번호가 맞지 않아요." });
      }
    } catch {
      setMsg({ kind: "error", text: "잠금 해제에 실패했어요. 잠시 후 다시 시도해 주세요." });
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
        {signedInEmail ? (
          <div className="space-y-4 text-center">
            <h1 className="font-display text-2xl text-foreground">{unlocked ? "🔐 동기화 켜짐" : "🔒 잠금 해제 필요"}</h1>
            {!unlocked && (
              <form onSubmit={unlock} className="space-y-2 rounded-xl border border-sky-mid bg-sky-soft p-3 text-left">
                <p className="text-xs text-secondary-foreground">
                  데이터는 관리자도 읽을 수 없도록 비밀번호로 암호화해 저장해요. 이 기기에서 처음 한 번 비밀번호를 입력해 주세요.
                  (Google·Lovable로 로그인했다면 처음 정한 암호화용 비밀번호를 쓰고, 처음이면 새로 정해 주세요.)
                </p>
                <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호" aria-label="암호화 비밀번호" autoComplete="current-password" className={inputCls} />
                <Button type="submit" disabled={busy} className="w-full">{busy ? "잠시만요…" : "잠금 해제"}</Button>
              </form>
            )}
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-secondary-foreground">{signedInEmail}</span> 계정으로 로그인 중이에요.
              이 기기의 대시보드 데이터가 암호화되어 클라우드에 자동 저장되고(관리자도 내용을 볼 수 없어요), 다른 기기에서도 같은 데이터를 볼 수 있어요.
            </p>
            <div className="flex justify-center gap-2">
              <Button
                onClick={() => navigate({ to: "/" })}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              >
                대시보드로 가기
              </Button>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={signOut}
                className="rounded-lg border border-sky-mid bg-sky-soft px-4 py-2 text-sm font-semibold text-secondary-foreground transition hover:bg-sky-mid"
              >
                로그아웃
              </Button>
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
              <Button
                variant="secondary"
                onClick={() => oauth("google")}
                disabled={busy}
                className="w-full rounded-lg border border-sky-mid bg-sky-soft px-4 py-2.5 text-sm font-semibold text-secondary-foreground transition hover:bg-sky-mid disabled:opacity-60"
              >
                Google로 계속하기
              </Button>
              <Button
                variant="secondary"
                onClick={() => oauth("lovable")}
                disabled={busy}
                className="w-full rounded-lg border border-sky-mid bg-sky-soft px-4 py-2.5 text-sm font-semibold text-secondary-foreground transition hover:bg-sky-mid disabled:opacity-60"
              >
                Lovable로 계속하기
              </Button>
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
                aria-label="이메일"
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
                aria-label="비밀번호"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                className={inputCls}
              />
              <Button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
              >
                {busy ? "잠시만요…" : mode === "signin" ? "로그인" : "회원가입"}
              </Button>
            </form>

            {mode === "signin" && (
              <p className="text-center text-xs">
                <Button variant="link" type="button" className="h-auto p-0 text-xs" disabled={busy} onClick={sendReset}>
                  비밀번호를 잊으셨나요?
                </Button>
              </p>
            )}

            <p className="text-center text-xs text-muted-foreground">
              {mode === "signin" ? "계정이 없나요? " : "이미 계정이 있나요? "}
              <Button
                variant="link"
                className="h-auto p-0 font-semibold"
                type="button"
                onClick={() => {
                  setMode(mode === "signin" ? "signup" : "signin");
                  setMsg(null);
                }}
              >
                {mode === "signin" ? "회원가입" : "로그인"}
              </Button>
            </p>
          </div>
        )}

        {msg && (
          <p role={msg.kind === "error" ? "alert" : "status"} className={`mt-4 rounded-lg px-3 py-2 text-sm ${msg.kind === "error" ? "bg-sky-soft text-destructive" : "bg-sky-soft text-secondary-foreground"}`}>
            {msg.text}
          </p>
        )}
      </div>
    </div>
  );
}
