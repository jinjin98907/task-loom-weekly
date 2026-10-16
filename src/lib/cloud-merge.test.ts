import { describe, expect, it } from "vitest";
import { canonical, decideStore, type CloudValue } from "./cloud-merge";

const cloud = (value: unknown, at = "2026-10-16T00:00:00Z"): CloudValue => ({ value, at });

// 규칙 1: 로컬이 비어 있고 클라우드에 데이터가 있으면 클라우드를 가져온다
describe("decideStore", () => {
  it("빈 로컬 + 데이터 있는 클라우드 → 클라우드", () => {
    expect(decideStore("dashboard", {}, cloud({ "2026-03-02": { todos: [] } }), undefined)).toBe("cloud");
    expect(decideStore("rules", [], cloud([{ word: "체험", color: "#123456" }]), undefined)).toBe("cloud");
    expect(decideStore("myClass", 0, cloud(2), undefined)).toBe("cloud");
  });

  // 규칙 2: 클라우드가 비어 있고 로컬에 데이터가 있으면 로컬을 올린다
  it("데이터 있는 로컬 + 빈 클라우드 → 로컬", () => {
    expect(decideStore("rules", [{ word: "체험", color: "#123456" }], cloud([]), undefined)).toBe("local");
    expect(decideStore("dashboard", { "2026-03-02": {} }, null, undefined)).toBe("local");
  });

  // 규칙 3: 첫 동기화에서 둘 다 데이터가 있으면 이 기기(로컬)가 이긴다
  it("둘 다 있음 + 첫 동기화 → 로컬", () => {
    expect(decideStore("yearly", { a: 1 }, cloud({ b: 2 }), undefined)).toBe("local");
  });

  // 규칙 4: 마지막 동기화 후 로컬이 바뀌었으면 로컬 승리 (이 기기의 새 편집이 사라지지 않음)
  it("마커 후 로컬 편집 → 로컬", () => {
    const marker = { at: "2026-10-16T01:00:00Z", pushed: canonical({ a: 1 }) };
    expect(decideStore("yearly", { a: 1, b: 2 }, cloud({ b: 3 }, "2026-10-16T02:00:00Z"), marker)).toBe("local");
  });

  // 규칙 5: 로컬이 그대로이고 클라우드가 더 새로우면 클라우드 승리 (다른 기기 편집 가져옴)
  it("로컬 변경 없음 + 클라우드 새로움 → 클라우드", () => {
    const marker = { at: "2026-10-16T01:00:00Z", pushed: canonical({ a: 1 }) };
    expect(decideStore("yearly", { a: 1 }, cloud({ a: 9 }, "2026-10-16T02:00:00Z"), marker)).toBe("cloud");
  });

  // 규칙 6: 양쪽 다 변화 없으면 동기화 불필요
  it("변화 없음 → null", () => {
    const marker = { at: "2026-10-16T01:00:00Z", pushed: canonical({ a: 1 }) };
    expect(decideStore("yearly", { a: 1 }, cloud({ a: 1 }, "2026-10-16T00:30:00Z"), marker)).toBeNull();
  });

  // 규칙 7: 키 순서가 달라도 같은 값이면 변화 없음 (jsonb 키 순서 차이가 무한 동기화를 만들지 않음)
  it("키 순서 달라도 같은 값 → null", () => {
    const marker = { at: "2026-10-16T01:00:00Z", pushed: canonical({ a: 1, b: { c: 2 } }) };
    expect(decideStore("yearly", { b: { c: 2 }, a: 1 }, cloud({ a: 1, b: { c: 2 } }), marker)).toBeNull();
  });

  // 규칙 8: 둘 다 비어 있으면 동기화 불필요
  it("둘 다 빈 값 → null", () => {
    expect(decideStore("dashboard", {}, cloud({}), undefined)).toBeNull();
    expect(decideStore("myClass", 0, cloud(0), undefined)).toBeNull();
  });
});
