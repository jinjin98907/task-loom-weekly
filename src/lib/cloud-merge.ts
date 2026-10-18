// 클라우드 동기화 병합 규칙 (browser-safe, pure helpers — 유닛 테스트 대상)
// 로컬(LocalStorage)이 기본 저장소이고 클라우드는 미러.
// 충돌 규칙: 마지막 동기화 시점 이후 바뀐 쪽이 이긴다 (last-write-wins).

export type StoreName = "dashboard" | "yearly" | "rules" | "myClass" | "memo";
export const STORES: StoreName[] = ["dashboard", "yearly", "rules", "myClass", "memo"];

/** 로컬 저장소의 빈 값(초기 상태). myClass는 클라우드와 비교하기 위해 숫자로 정규화한다. */
export const EMPTY_LOCAL: Record<StoreName, unknown> = {
  dashboard: {},
  yearly: {},
  rules: [],
  myClass: 0,
  memo: [],
};

export function emptyFor(store: StoreName): unknown {
  return EMPTY_LOCAL[store];
}

export type CloudValue = { value: unknown; at: string | null };

/**
 * 같은 브라우저에서 다른 계정으로 로그인했는지 판단한다.
 * "reset" 이면 이전 계정의 로컬 미러와 마커를 지우고 새 계정 데이터만 내려받아야 한다.
 */
export function ownerAction(previousOwner: string | null, userId: string): "reset" | "ok" {
  if (!previousOwner) return "ok";
  return previousOwner === userId ? "ok" : "reset";
}
export type StoreMarker = { at: string; pushed: string };
export type SyncMarker = Partial<Record<StoreName, StoreMarker>>;
export type Decision = "local" | "cloud" | null;

/** 키 순서에 상관없이 같은 값인지 비교하기 위한 정규화 문자열 (클라우드 jsonb는 키 순서가 바뀔 수 있음) */
export function canonical(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortValue);
  if (v && typeof v === "object") {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, val]) => [k, sortValue(val)]),
    );
  }
  return v;
}

export function isEmptyStore(store: StoreName, v: unknown): boolean {
  return canonical(v) === canonical(EMPTY_LOCAL[store]);
}

/**
 * 한 저장소의 동기화 방향을 정한다.
 * - 마커(마지막 동기화 기록)가 있으면: 로컬이 마지막 푸시 값에서 바뀌었으면 로컬 승리,
 *   아니고 클라우드 타임스탬프가 마커보다 새로우면 클라우드 승리.
 * - 첫 동기화(마커 없음): 한쪽만 데이터가 있으면 그쪽, 둘 다 있으면 로컬 승리(이 기기 데이터를 클라우드로 올림).
 */
export function decideStore(
  store: StoreName,
  local: unknown,
  cloud: CloudValue | null,
  marker: StoreMarker | undefined,
): Decision {
  if (marker) {
    if (canonical(local) !== marker.pushed) return "local";
    if (cloud?.at && cloud.at > marker.at) return "cloud";
    return null;
  }
  const localEmpty = isEmptyStore(store, local);
  const cloudEmpty = !cloud || cloud.value == null || isEmptyStore(store, cloud.value);
  if (localEmpty && cloudEmpty) return null;
  if (localEmpty) return "cloud";
  return "local";
}
