import { describe, expect, it } from "vitest";
import { decryptStore, deriveKey, encryptStore, isEncryptedValue, DecryptError } from "./e2ee";

describe("e2ee", () => {
  it("cloud payload hides the plaintext and round-trips", async () => {
    const key = await deriveKey("pw123456", "user-1");
    const value = { "2026-03-02": { reason: "홍길동 독감" } };
    const enc = await encryptStore("dashboard", value, key);
    expect(JSON.stringify(enc)).not.toContain("홍길동");
    expect(isEncryptedValue(enc)).toBe(true);
    expect(await decryptStore(enc, key)).toEqual(value);
  });

  it("array stores stay arrays for the server validator", async () => {
    const key = await deriveKey("pw123456", "user-1");
    const enc = await encryptStore("memo", [{ id: "a" }], key);
    expect(Array.isArray(enc)).toBe(true);
    expect(await decryptStore(enc, key)).toEqual([{ id: "a" }]);
  });

  it("wrong password cannot decrypt", async () => {
    const enc = await encryptStore("yearly", { a: 1 }, await deriveKey("right-pw", "u"));
    await expect(decryptStore(enc, await deriveKey("wrong-pw", "u"))).rejects.toBeInstanceOf(DecryptError);
  });

  it("legacy plaintext passes through", async () => {
    const key = await deriveKey("pw", "u");
    expect(await decryptStore({ a: 1 }, key)).toEqual({ a: 1 });
  });
});
