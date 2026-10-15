// 주차·학기 정렬 규칙: 오늘이 속한 학기를 맨 앞에, 오늘이 속한 주를 맨 윗줄에,
// 지난 주와 지난 학기는 맨 아래로 둔다. (학년 전체 시간표 화면 순서)

export type Range = { start: Date; end: Date };

export const endOfDay = (d: Date) => {
  const e = new Date(d);
  e.setHours(23, 59, 59, 999);
  return e;
};

/** 월~일 한 주 전체의 끝(일요일). 주말에 화면을 열어도 이번 주로 남도록 한다. */
export const weekEndOf = (week: Date[]) => {
  const e = new Date(week[0]!);
  e.setDate(e.getDate() + 6);
  return endOfDay(e);
};

export const isPastWeek = (week: Date[], today: Date) => weekEndOf(week) < today;

export const isCurrentWeek = (week: Date[], today: Date) =>
  !isPastWeek(week, today) && week[0]! <= today;

export const isCurrentRange = (r: Range, today: Date) => endOfDay(r.end) >= today && r.start <= today;

/** 오늘이 포함된(또는 이번 주 이후의) 주를 먼저, 지난 주는 맨 아래로. */
export function orderWeeks(weeks: Date[][], today: Date) {
  return [...weeks.filter((w) => !isPastWeek(w, today)), ...weeks.filter((w) => isPastWeek(w, today))];
}

/** 오늘이 포함된 학기 인덱스를 맨 앞에, 지난 학기는 그 뒤로. */
export function orderSemesters(ranges: Range[], today: Date) {
  const idx = ranges.map((_, i) => i);
  return [
    ...idx.filter((i) => endOfDay(ranges[i]!.end) >= today),
    ...idx.filter((i) => endOfDay(ranges[i]!.end) < today),
  ];
}
