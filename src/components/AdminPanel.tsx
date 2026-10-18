import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { checkIsAdmin, listUsersForAdmin, resetUserPasswordByAdmin } from "@/lib/admin.functions";

type U = { id: string; email: string; createdAt: string };

export function AdminPanel() {
  const check = useServerFn(checkIsAdmin);
  const list = useServerFn(listUsersForAdmin);
  const reset = useServerFn(resetUserPasswordByAdmin);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<U[]>([]);
  const [target, setTarget] = useState<string | null>(null);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    check().then((r) => {
      setIsAdmin(r.isAdmin);
      if (r.isAdmin) list().then(setUsers).catch(() => setMsg("회원 목록을 불러오지 못했어요."));
    }).catch(() => {});
  }, []);

  if (!isAdmin) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      await reset({ data: { userId: target, password: pw } });
      const email = users.find((u) => u.id === target)?.email;
      setMsg(`${email} 계정의 비밀번호를 바꿨어요. 선생님께 새 비밀번호를 알려 주세요.`);
      setTarget(null);
      setPw("");
    } catch {
      setMsg("비밀번호를 바꾸지 못했어요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-6 space-y-2 rounded-xl border border-sky-mid bg-sky-soft p-3 text-left">
      <h2 className="text-sm font-semibold text-secondary-foreground">👑 관리자 · 회원 비밀번호 초기화</h2>
      <p className="text-xs text-muted-foreground">
        비밀번호를 바꿔도 클라우드 기록은 예전 비밀번호로 잠겨 있어요. 그 선생님이 쓰던 기기에서 새 비밀번호로 로그인하면 기록이 다시 올라가요.
      </p>
      <ul className="max-h-64 space-y-1 overflow-auto">
        {users.map((u) => (
          <li key={u.id} className="flex items-center justify-between gap-2 rounded-lg bg-card px-2 py-1 text-xs">
            <span className="truncate">{u.email}</span>
            <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => { setTarget(u.id); setPw(""); setMsg(null); }}>
              비밀번호 초기화
            </Button>
          </li>
        ))}
      </ul>
      {target && (
        <form onSubmit={submit} className="space-y-2">
          <p className="text-xs">{users.find((u) => u.id === target)?.email} 의 새 비밀번호</p>
          <input type="text" required minLength={6} value={pw} onChange={(e) => setPw(e.target.value)}
            placeholder="새 비밀번호 (6자 이상)" aria-label="새 비밀번호"
            className="w-full rounded-lg border border-sky-mid bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <div className="flex gap-2">
            <Button type="submit" disabled={busy} className="flex-1">{busy ? "잠시만요…" : "변경"}</Button>
            <Button type="button" variant="secondary" onClick={() => setTarget(null)}>취소</Button>
          </div>
        </form>
      )}
      {msg && <p role="status" className="text-xs text-secondary-foreground">{msg}</p>}
    </div>
  );
}
