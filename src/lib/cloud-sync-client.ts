// 클라우드 ↔ LocalStorage 동기화 엔진 (브라우저 전용).
// LocalStorage가 기본 저장소 — 이 모듈은 클라우드 미러를 맞춰주는 역할만 한다.
// 페이지들은 계속 LocalStorage 키를 직접 읽고 쓴다(오프라인/NAS 자가 호스팅 유지).
import {
  STORES,
  canonical,
  decideStore,
  emptyFor,
  type StoreName,
  type StoreMarker,
  type SyncMarker,
} from "@/lib/cloud-merge";
import { pullSyncData, pushSyncData } from "@/lib/cloud-sync.functions";
import { LOCAL_KEYS, MARKER_KEY, OWNER_KEY, prepareLocalOwner, notifyLocalOwnerChange } from "./cloud-local-owner";
export { LOCAL_KEYS, MARKER_KEY } from "./cloud-local-owner";

type LocalValues = Record<StoreName, unknown>;

function readLocal(): LocalValues {
  const out = {} as LocalValues;
  for (const s of STORES) {
    const raw = localStorage.getItem(LOCAL_KEYS[s]);
    let v: unknown = null;
    try {
      v = raw ? JSON.parse(raw) : null;
    } catch {
      v = null;
    }
    out[s] = s === "myClass" ? Number(v ?? 0) || 0 : (v ?? emptyFor(s));
  }
  return out;
}

function readMarker(): SyncMarker {
  try {
    const raw = JSON.parse(localStorage.getItem(MARKER_KEY) || "{}");
    if (typeof raw !== "object" || raw === null) return {};
    const out: SyncMarker = {};
    for (const s of STORES) {
      const m = (raw as Record<string, unknown>)[s];
      if (
        m && typeof m === "object" &&
        typeof (m as StoreMarker).at === "string" &&
        typeof (m as StoreMarker).pushed === "string"
      ) {
        out[s] = { at: (m as StoreMarker).at, pushed: (m as StoreMarker).pushed };
      }
    }
    return out;
  } catch {
    return {};
  }
}

/** 클라우드 값을 로컬에 반영하고, 같은 탭의 페이지가 바로 다시 읽도록 storage 이벤트를 보낸다. */
function writeLocal(writes: Partial<Record<StoreName, unknown>>) {
  for (const s of STORES) {
    if (writes[s] === undefined) continue;
    const value = s === "myClass" ? String(writes[s]) : JSON.stringify(writes[s]);
    localStorage.setItem(LOCAL_KEYS[s], value);
    try {
      window.dispatchEvent(new StorageEvent("storage", { key: LOCAL_KEYS[s], newValue: value }));
    } catch {
      /* 구형 브라우저에서 StorageEvent 생성 실패 시 무시 */
    }
  }
}

export type SyncOutcome = { pulled: StoreName[]; pushed: StoreName[] };

/** 지금 즉시 한 번 동기화 (로그인 직후 등). 세션이 없으면 아무 것도 하지 않는다. */
async function performSync(): Promise<SyncOutcome> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { pulled: [], pushed: [] };
  const userId = data.user.id;
  const currentUser = async () => {
    const { data: verified, error: verifyError } = await supabase.auth.getUser();
    return !verifyError && verified.user?.id === userId && localStorage.getItem(OWNER_KEY) === userId;
  };
  if (prepareLocalOwner(localStorage, userId)) notifyLocalOwnerChange();

  const local = readLocal();
  const marker = readMarker();
  const cloud = await pullSyncData();
  if (!await currentUser()) return { pulled: [], pushed: [] };
  const cloudMap: Record<StoreName, { value: unknown; at: string | null } | null> = {
    dashboard: cloud.dashboardAt ? { value: cloud.dashboard, at: cloud.dashboardAt } : null,
    yearly: cloud.yearlyAt ? { value: cloud.yearly, at: cloud.yearlyAt } : null,
    rules: cloud.rulesAt ? { value: cloud.rules, at: cloud.rulesAt } : null,
    myClass: cloud.myClassAt ? { value: cloud.myClass, at: cloud.myClassAt } : null,
  };

  const writes: Partial<Record<StoreName, unknown>> = {};
  const pushes: Partial<Record<StoreName, unknown>> = {};
  for (const s of STORES) {
    const d = decideStore(s, local[s], cloudMap[s], marker[s]);
    if (d === "local") pushes[s] = local[s];
    else if (d === "cloud") {
      const cm = cloudMap[s];
      if (cm) writes[s] = cm.value;
    }
  }

  const outcome: SyncOutcome = {
    pulled: STORES.filter((s) => writes[s] !== undefined),
    pushed: STORES.filter((s) => pushes[s] !== undefined),
  };
  if (outcome.pulled.length) writeLocal(writes);
  if (outcome.pushed.length) {
    if (!await currentUser()) return { pulled: [], pushed: [] };
    // The server also compares this expected owner with the verified bearer subject.
    await pushSyncData({ data: { ...pushes, expectedUserId: userId } });
  }
  if (!await currentUser()) return { pulled: [], pushed: [] };

  // 마커 갱신: 쓰기 반영 후 값(메모리 기준 — 다른 탭 쓰기와의 경합을 피함)
  const after: LocalValues = { ...local, ...writes };
  const nowIso = new Date().toISOString();
  const next: SyncMarker = { ...marker };
  for (const s of STORES) {
    const cm = cloudMap[s];
    if (pushes[s] !== undefined) {
      const at = cm?.at && cm.at > nowIso ? cm.at : nowIso;
      next[s] = { at, pushed: canonical(after[s]) };
    } else if (writes[s] !== undefined && cm?.at) {
      next[s] = { at: cm.at, pushed: canonical(after[s]) };
    } else if (marker[s]) {
      const existing = marker[s];
      if (existing) next[s] = existing;
    } else if (cm?.at) {
      next[s] = { at: cm.at, pushed: canonical(after[s]) };
    }
  }
  localStorage.setItem(MARKER_KEY, JSON.stringify(next));
  return outcome;
}

let inFlight: Promise<SyncOutcome> | null = null;
export function syncNow(): Promise<SyncOutcome> {
  if (inFlight) return inFlight;
  inFlight = performSync().finally(() => { inFlight = null; });
  return inFlight;
}

let loopStarted = false;

/** 앱 전체 자동 동기화 루프 시작 (중복 시작 방지). 정리 함수를 반환한다. */
export function startSyncLoop(): () => void {
  if (loopStarted) return () => {};
  loopStarted = true;
  const run = () => syncNow().catch((e) => console.warn("[sync]", e));
  const every = setInterval(run, 5000);
  const onStorage = (event: StorageEvent) => {
    if (event.key && Object.values(LOCAL_KEYS).includes(event.key)) run();
  };
  const onVisible = () => {
    if (document.visibilityState === "visible") run();
  };
  window.addEventListener("storage", onStorage);
  document.addEventListener("visibilitychange", onVisible);
  run();

  return () => {
    loopStarted = false;
    clearInterval(every);
    window.removeEventListener("storage", onStorage);
    document.removeEventListener("visibilitychange", onVisible);
  };
}
