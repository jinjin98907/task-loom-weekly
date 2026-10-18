import { STORES, ownerAction, type StoreName } from "./cloud-merge";

export const OWNER_KEY = "teacher-cloud-owner-v1";
export const MARKER_KEY = "teacher-cloud-sync-marker-v1";
export const LOCAL_KEYS: Record<StoreName, string> = {
  dashboard: "teacher-dashboard-v1",
  yearly: "teacher-yearly-timetable-v1",
  rules: "teacher-yearly-color-rules-v1",
  myClass: "teacher-my-class-v1",
  memo: "teacher-memos-v2",
};
const ACTIVE_KEYS = [...STORES.map((s) => LOCAL_KEYS[s]), MARKER_KEY];
const archiveKey = (id: string) => `teacher-cloud-local-account-v1:${id}`;

function archive(storage: Storage, id: string) {
  storage.setItem(archiveKey(id), JSON.stringify(Object.fromEntries(
    ACTIVE_KEYS.map((key) => [key, storage.getItem(key)]),
  )));
}

function clearActive(storage: Storage) {
  for (const key of ACTIVE_KEYS) storage.removeItem(key);
}

/** Preserve offline data for its owner without carrying it into a different account. */
export function prepareLocalOwner(storage: Storage, userId: string): boolean {
  const previous = storage.getItem(OWNER_KEY);
  if (previous === userId) return false;
  if (ownerAction(previous, userId) === "reset" && previous) {
    archive(storage, previous);
    clearActive(storage);
  }
  const saved = storage.getItem(archiveKey(userId));
  if (saved) {
    // Anonymous work remains separate when returning to an existing account.
    if (!previous) archive(storage, "guest");
    const snapshot = JSON.parse(saved) as Record<string, unknown>;
    clearActive(storage);
    for (const key of ACTIVE_KEYS) {
      if (typeof snapshot[key] === "string") storage.setItem(key, snapshot[key]);
    }
  } else if (!previous) {
    // Only unowned offline work may be adopted on first login.
    storage.removeItem(MARKER_KEY);
  }
  storage.setItem(OWNER_KEY, userId);
  return true;
}

/** Sign-out hides the active account's records but retains an offline archive for that account. */
export function releaseLocalOwner(storage: Storage): boolean {
  const owner = storage.getItem(OWNER_KEY);
  if (!owner) return false;
  archive(storage, owner);
  clearActive(storage);
  storage.removeItem(OWNER_KEY);
  const guest = storage.getItem(archiveKey("guest"));
  if (guest) {
    const snapshot = JSON.parse(guest) as Record<string, unknown>;
    for (const key of ACTIVE_KEYS) {
      if (key !== MARKER_KEY && typeof snapshot[key] === "string") storage.setItem(key, snapshot[key]);
    }
    storage.removeItem(archiveKey("guest"));
  }
  return true;
}

export function notifyLocalOwnerChange() {
  for (const key of STORES.map((s) => LOCAL_KEYS[s])) {
    window.dispatchEvent(new StorageEvent("storage", { key, newValue: localStorage.getItem(key) }));
  }
}