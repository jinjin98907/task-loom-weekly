import { describe, expect, it } from "vitest";

import { isCurrentWeek, orderSemesters, orderWeeks } from "@/lib/timetable-order";

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d);
// 월요일을 기준으로 월~금 5일 한 주를 만든다.
const week = (monday: Date) =>
  Array.from({ length: 5 }, (_, i) => { const d = new Date(monday); d.setDate(d.getDate() + i); return d; });

const W28 = week(day(2026, 9, 28));  // 9/28~10/2  지난주
const W05 = week(day(2026, 10, 5));  // 10/5~10/9  지난주
const W12 = week(day(2026, 10, 12)); // 10/12~10/16 오늘(10/15 목)이 속한 주
const W19 = week(day(2026, 10, 19)); // 10/19~10/23 다음 주
const WEEKS = [W28, W05, W12, W19];

const SEMS = [
  { start: day(2026, 3, 1), end: day(2026, 8, 24) },  // 1학기
  { start: day(2026, 8, 25), end: day(2027, 2, 28) }, // 2학기
];

describe("학년 시간표 정렬", () => {
  it("오늘이 속한 주를 맨 윗줄에, 지난 주는 맨 아래에 둔다", () => {
    expect(orderWeeks(WEEKS, day(2026, 10, 15))).toEqual([W12, W19, W28, W05]);
  });

  it("주말에 열어도 오늘이 속한 주가 맨 위에 남는다", () => {
    expect(orderWeeks(WEEKS, day(2026, 10, 17))).toEqual([W12, W19, W28, W05]);
    expect(isCurrentWeek(W12, day(2026, 10, 17))).toBe(true);
    expect(isCurrentWeek(W19, day(2026, 10, 17))).toBe(false);
  });

  it("아직 모든 주가 미래면 날짜 순서대로 둔다", () => {
    expect(orderWeeks(WEEKS, day(2026, 9, 1))).toEqual(WEEKS);
  });

  it("오늘이 속한 학기 인덱스를 맨 앞에 둔다", () => {
    expect(orderSemesters(SEMS, day(2026, 10, 15))).toEqual([1, 0]);
    expect(orderSemesters(SEMS, day(2026, 4, 1))).toEqual([0, 1]);
  });
});
