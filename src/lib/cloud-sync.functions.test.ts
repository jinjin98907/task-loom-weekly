import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const chain = {
      middleware: () => chain,
      inputValidator: (validate: (input: unknown) => unknown) => {
        chain.validate = validate;
        return chain;
      },
      validate: (input: unknown): unknown => input,
      handler: (handler: (args: unknown) => unknown) =>
        (args: { data?: unknown; context: unknown }) => handler({ ...args, data: chain.validate(args.data) }),
    };
    return chain;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));

import { pullSyncData, pushSyncData } from "./cloud-sync.functions";

const eq = vi.fn();
const upsert = vi.fn();
const from = vi.fn(() => ({ select: () => ({ eq }), upsert }));
const context = { userId: "owner-a", supabase: { from } };
// Invoke the actual handlers through a test-only builder, without importing router/server runtime.
const read = pullSyncData as unknown as (input: { context: typeof context }) => Promise<unknown>;
const write = pushSyncData as unknown as (input: { data: unknown; context: typeof context }) => Promise<unknown>;

beforeEach(() => {
  vi.clearAllMocks();
  eq.mockReturnValue({ maybeSingle: async () => ({ data: null, error: null }) });
  upsert.mockResolvedValue({ error: null });
});

describe("server sync ownership", () => {
  it("reads only the verified caller's own row", async () => {
    await read({ context });
    expect(eq).toHaveBeenCalledWith("user_id", "owner-a");
  });
  it("writes the verified owner, never a caller-supplied user_id", async () => {
    await write({ context, data: { expectedUserId: "owner-a", user_id: "owner-b", dashboard: { lesson: "math" } } });
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ user_id: "owner-a", dashboard: { lesson: "math" } }));
  });
  it("rejects a stale other-account upload before accessing the database", async () => {
    await expect(write({ context, data: { expectedUserId: "owner-b", dashboard: { private: true } } })).rejects.toThrow("Sync account changed");
    expect(from).not.toHaveBeenCalled();
  });
});