import { beforeEach, describe, expect, it } from "vitest";
import { LOCAL_KEYS, MARKER_KEY, OWNER_KEY, prepareLocalOwner, releaseLocalOwner } from "./cloud-local-owner";

beforeEach(() => localStorage.clear());

describe("owner-only local mirror", () => {
  it("never carries A's dashboard or sync markers into B's account", () => {
    prepareLocalOwner(localStorage, "user-a");
    localStorage.setItem(LOCAL_KEYS.dashboard, '{"student":"A only"}');
    localStorage.setItem(MARKER_KEY, '{"dashboard":{"at":"2026-10-16"}}');
    prepareLocalOwner(localStorage, "user-b");
    expect(localStorage.getItem(LOCAL_KEYS.dashboard)).toBeNull();
    expect(localStorage.getItem(MARKER_KEY)).toBeNull();
    expect(localStorage.getItem(OWNER_KEY)).toBe("user-b");
  });
  it("hides all signed-in data on sign-out and restores it only for the same owner", () => {
    prepareLocalOwner(localStorage, "user-a");
    for (const key of Object.values(LOCAL_KEYS)) localStorage.setItem(key, '"A only"');
    releaseLocalOwner(localStorage);
    for (const key of Object.values(LOCAL_KEYS)) expect(localStorage.getItem(key)).toBeNull();
    prepareLocalOwner(localStorage, "user-b");
    expect(localStorage.getItem(LOCAL_KEYS.dashboard)).toBeNull();
    prepareLocalOwner(localStorage, "user-a");
    for (const key of Object.values(LOCAL_KEYS)) expect(localStorage.getItem(key)).toBe('"A only"');
  });
  it("keeps unowned offline work available for initial login", () => {
    localStorage.setItem(LOCAL_KEYS.dashboard, '{"offline":true}');
    prepareLocalOwner(localStorage, "user-a");
    expect(localStorage.getItem(LOCAL_KEYS.dashboard)).toBe('{"offline":true}');
  });
  it("restores separate guest work without exposing the returning account", () => {
    prepareLocalOwner(localStorage, "user-a");
    localStorage.setItem(LOCAL_KEYS.dashboard, '{"owner":"A"}');
    releaseLocalOwner(localStorage);
    localStorage.setItem(LOCAL_KEYS.dashboard, '{"guest":true}');
    prepareLocalOwner(localStorage, "user-a");
    expect(localStorage.getItem(LOCAL_KEYS.dashboard)).toBe('{"owner":"A"}');
    releaseLocalOwner(localStorage);
    expect(localStorage.getItem(LOCAL_KEYS.dashboard)).toBe('{"guest":true}');
  });
});