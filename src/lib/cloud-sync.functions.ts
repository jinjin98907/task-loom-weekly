import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

/** 클라우드(user_data 테이블)에서 로그인 사용자의 동기화 데이터를 읽어온다. */
export type PullResult = {
  dashboard: unknown;
  dashboardAt: string | null;
  yearly: unknown;
  yearlyAt: string | null;
  rules: unknown;
  rulesAt: string | null;
  myClass: number | null;
  myClassAt: string | null;
};

const EMPTY_PULL: PullResult = {
  dashboard: null,
  dashboardAt: null,
  yearly: null,
  yearlyAt: null,
  rules: null,
  rulesAt: null,
  myClass: null,
  myClassAt: null,
};

export const pullSyncData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PullResult> => {
    const { data, error } = await context.supabase
      .from("user_data")
      .select("dashboard, dashboard_at, yearly, yearly_at, rules, rules_at, my_class, my_class_at")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(`Sync read failed: ${error.message}`);
    if (!data) return EMPTY_PULL;
    return {
      dashboard: (data["dashboard"] as unknown) ?? null,
      dashboardAt: (data["dashboard_at"] as string | null) ?? null,
      yearly: (data["yearly"] as unknown) ?? null,
      yearlyAt: (data["yearly_at"] as string | null) ?? null,
      rules: (data["rules"] as unknown) ?? null,
      rulesAt: (data["rules_at"] as string | null) ?? null,
      myClass: (data["my_class"] as number | null) ?? null,
      myClassAt: (data["my_class_at"] as string | null) ?? null,
    };
  });

/** 바뀐 저장소만 클라우드에 올린다 (마지막-쓰기-우선). */
export const pushSyncData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    if (typeof input !== "object" || input === null || Array.isArray(input)) {
      throw new Error("Invalid sync payload");
    }
    const d = input as Record<string, unknown>;
    const out: { dashboard?: unknown; yearly?: unknown; rules?: unknown; myClass?: number } = {};
    if (d.dashboard !== undefined) {
      if (d.dashboard === null || typeof d.dashboard !== "object" || Array.isArray(d.dashboard)) throw new Error("Invalid dashboard");
      out.dashboard = d.dashboard;
    }
    if (d.yearly !== undefined) {
      if (d.yearly === null || typeof d.yearly !== "object" || Array.isArray(d.yearly)) throw new Error("Invalid yearly");
      out.yearly = d.yearly;
    }
    if (d.rules !== undefined) {
      if (!Array.isArray(d.rules)) throw new Error("Invalid rules");
      out.rules = d.rules;
    }
    if (d.myClass !== undefined) {
      const n = Number(d.myClass);
      if (!Number.isInteger(n) || n < 0 || n > 2) throw new Error("Invalid myClass");
      out.myClass = n;
    }
    return out;
  })
  .handler(async ({ data, context }) => {
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { user_id: context.userId, updated_at: now };
    if (data.dashboard !== undefined) {
      patch["dashboard"] = data.dashboard;
      patch["dashboard_at"] = now;
    }
    if (data.yearly !== undefined) {
      patch["yearly"] = data.yearly;
      patch["yearly_at"] = now;
    }
    if (data.rules !== undefined) {
      patch["rules"] = data.rules;
      patch["rules_at"] = now;
    }
    if (data.myClass !== undefined) {
      patch["my_class"] = data.myClass;
      patch["my_class_at"] = now;
    }
    const { error } = await context.supabase
      .from("user_data")
      .upsert(patch as unknown as Database["public"]["Tables"]["user_data"]["Insert"]);
    if (error) throw new Error(`Sync write failed: ${error.message}`);
    return { ok: true };
  });
