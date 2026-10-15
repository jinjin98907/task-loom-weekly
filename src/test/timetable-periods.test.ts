import { describe, expect, it } from "vitest";

import { hasPeriod, isLongDay, periodsOn } from "@/lib/timetable-periods";

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d);
// 2026-10-12(월) ~ 2026-10-16(금)
const MON = day(2026, 10, 12);
const TUE = day(2026, 10, 13);
const WED = day(2026, 10, 14);
const THU = day(2026, 10, 15);
const FRI = day(2026, 10, 16);

describe("요일별 교시 수", () => {
  it("월 5, 화 6, 수 4, 목 6, 금 5교시", () => {
    expect(periodsOn(MON)).toBe(5);
    expect(periodsOn(TUE)).toBe(6);
    expect(periodsOn(WED)).toBe(4);
    expect(periodsOn(THU)).toBe(6);
    expect(periodsOn(FRI)).toBe(5);
  });

  it("그날 교시 수를 넘어서는 교시는 없다", () => {
    expect(hasPeriod(WED, 3)).toBe(true);  // 수 4교시
    expect(hasPeriod(WED, 4)).toBe(false); // 수 5교시
    expect(hasPeriod(MON, 4)).toBe(true);  // 월 5교시
    expect(hasPeriod(MON, 5)).toBe(false); // 월 6교시
    expect(hasPeriod(TUE, 5)).toBe(true);  // 화 6교시
    expect(hasPeriod(THU, 5)).toBe(true);  // 목 6교시
    expect(hasPeriod(FRI, 4)).toBe(true);  // 금 5교시
    expect(hasPeriod(FRI, 5)).toBe(false); // 금 6교시
  });

  it("주말에는 교시가 없다", () => {
    expect(periodsOn(day(2026, 10, 17))).toBe(0); // 토
    expect(periodsOn(day(2026, 10, 18))).toBe(0); // 일
  });
});
