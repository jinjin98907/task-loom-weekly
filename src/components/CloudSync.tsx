import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { startSyncLoop } from "@/lib/cloud-sync-client";
import { prepareLocalOwner, releaseLocalOwner, notifyLocalOwnerChange } from "@/lib/cloud-local-owner";

const AccountContext = createContext<{ user: User | null; loading: boolean }>({ user: null, loading: true });
export const useAccount = () => useContext(AccountContext);

/** One root subscriber owns session state, account isolation and the offline mirror loop. */
export function CloudSync({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<{ user: User | null; loading: boolean }>({ user: null, loading: true });
  const queryClient = useQueryClient();
  const router = useRouter();
  useEffect(() => {
    let active = true;
    let revision = 0;
    let stopLoop = () => {};
    let unsubscribe = () => {};
    import("@/integrations/supabase/client").then(({ supabase }) => {
      const refresh = async () => {
        const ticket = ++revision;
        const { data, error } = await supabase.auth.getUser();
        if (!active || ticket !== revision) return;
        const user = error ? null : data.user;
        if (user) {
          if (prepareLocalOwner(localStorage, user.id)) notifyLocalOwnerChange();
        } else if (releaseLocalOwner(localStorage)) notifyLocalOwnerChange();
        setAccount({ user, loading: false });
      };
      const { data } = supabase.auth.onAuthStateChange((event) => {
        if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
        // Avoid awaiting another auth method from inside its auth-state callback.
        setTimeout(() => {
          if (!active) return;
          void refresh().then(() => router.invalidate());
          if (event !== "SIGNED_OUT") void queryClient.invalidateQueries();
        }, 0);
      });
      unsubscribe = () => data.subscription.unsubscribe();
      void refresh();
      stopLoop = startSyncLoop();
    }).catch(() => { if (active) setAccount({ user: null, loading: false }); });
    return () => { active = false; unsubscribe(); stopLoop(); };
  }, [queryClient, router]);
  return <AccountContext.Provider value={account}>{children}</AccountContext.Provider>;
}
