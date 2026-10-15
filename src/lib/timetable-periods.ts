// 요일별 수업 교시 수 (학년 전체 시간표): 월 5, 화 6, 수 4, 목 6, 금 5교시.
// getDay(): 0=일, 1=월, 2=화, 3=수, 4=목, 5=금, 6=토
export const PERIODS_BY_DOW: Record<number, number> = { 1: 5, 2: 6, 3: 4, 4: 6, 5: 5 };

/** 그 날짜에 몇 교시까지 있는지 (토·일처럼 없는 요일이면 0) */
export const periodsOn = (d: Date) => PERIODS_BY_DOW[d.getDay()] ?? 0;

/** 그 날짜에 그 교시가 있는지. period는 0부터 세므로 5교시는 period=4. */
export const hasPeriod = (d: Date, period: number) => period < periodsOn(d);
