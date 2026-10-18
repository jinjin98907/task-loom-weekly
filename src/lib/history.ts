// 되돌리기/다시 실행 + 시점별 버전 기록 (브라우저 안전, 순수 로직)
import { BACKUP_KEYS } from "./full-backup";

export type DataState = Record<string, string | null>;
export type Snapshot = { at: number; state: DataState };

export const HISTORY_KEYS = Object.values(BACKUP_KEYS);
export const MAX_UNDO = 50;
export const MAX_SNAPSHOTS = 20;
export const SNAPSHOT_GAP_MS = 60_000;
export const UNDO_MERGE_MS = 1500;

export const snapshotKey = (owner: string) => `teacher-history-v1:${owner}`;

export function readState(s: Pick<Storage, "getItem">): DataState {
  return Object.fromEntries(HISTORY_KEYS.map((k) => [k, s.getItem(k)]));
}

export const sameState = (a: DataState, b: DataState) => HISTORY_KEYS.every((k) => (a[k] ?? null) === (b[k] ?? null));

export type UndoStacks = { undo: DataState[]; redo: DataState[]; lastPushAt: number };

/** 변화 감지: 이전 상태를 되돌리기 목록에 넣는다. 빠른 연속 입력은 한 단계로 묶는다. */
export function recordChange(st: UndoStacks, prev: DataState, now: number): UndoStacks {
  if (st.undo.length && now - st.lastPushAt < UNDO_MERGE_MS) return { ...st, redo: [], lastPushAt: now };
  return { undo: [...st.undo, prev].slice(-MAX_UNDO), redo: [], lastPushAt: now };
}

export function undoStep(st: UndoStacks, current: DataState): { stacks: UndoStacks; target: DataState } | null {
  const target = st.undo[st.undo.length - 1];
  if (!target) return null;
  return { stacks: { undo: st.undo.slice(0, -1), redo: [...st.redo, current], lastPushAt: 0 }, target };
}

export function redoStep(st: UndoStacks, current: DataState): { stacks: UndoStacks; target: DataState } | null {
  const target = st.redo[st.redo.length - 1];
  if (!target) return null;
  return { stacks: { undo: [...st.undo, current], redo: st.redo.slice(0, -1), lastPushAt: 0 }, target };
}

/** 마지막 기록보다 SNAPSHOT_GAP_MS 이상 지났고 내용이 다르면 새 버전을 추가한다. */
export function addSnapshot(list: Snapshot[], state: DataState, now: number, force = false): Snapshot[] {
  const last = list[0];
  if (last && sameState(last.state, state)) return list;
  if (!force && last && now - last.at < SNAPSHOT_GAP_MS) return [{ at: last.at, state }, ...list.slice(1)].length ? [{ at: now, state }, ...list.slice(1)] : list;
  return [{ at: now, state }, ...list].slice(0, MAX_SNAPSHOTS);
}

/** 두 상태 사이에 바뀐 영역 이름 */
export function changedAreas(a: DataState | undefined, b: DataState): string[] {
  const names: Record<string, string> = {
    [BACKUP_KEYS.dashboard]: "주간 대시보드",
    [BACKUP_KEYS.yearly]: "학년 시간표",
    [BACKUP_KEYS.rules]: "색상 규칙",
    [BACKUP_KEYS.myClass]: "담당 학급",
    [BACKUP_KEYS.memo]: "메모장",
  };
  if (!a) return ["처음 기록"];
  return HISTORY_KEYS.filter((k) => (a[k] ?? null) !== (b[k] ?? null)).map((k) => names[k]);
}
