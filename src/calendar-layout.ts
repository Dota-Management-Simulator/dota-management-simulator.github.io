import type { HistoricalTournament } from "./tournament-types";

export const CALENDAR_DAY = 86400000;
/** Date-only tournament boundaries are inclusive, independent of the viewer's timezone. */
export const calendarDay = (iso: string) => Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
export const dateKey = (time: number) => new Date(time).toISOString().slice(0, 10);
export const tournamentDays = (event: Pick<HistoricalTournament, "start" | "end">) =>
  Math.round((calendarDay(event.end) - calendarDay(event.start)) / CALENDAR_DAY) + 1;

export interface CalendarSegment {
  event: HistoricalTournament;
  column: number;
  span: number;
  lane: number;
  continuesBefore: boolean;
  continuesAfter: boolean;
}
export interface CalendarWeek { start: number; days: number[]; segments: CalendarSegment[]; lanes: number }

export function calendarMonth(year: number, month: number, events: HistoricalTournament[]): CalendarWeek[] {
  const first = Date.UTC(year, month, 1);
  const last = Date.UTC(year, month + 1, 0);
  const start = first - ((new Date(first).getUTCDay() + 6) % 7) * CALENDAR_DAY;
  const weeks: CalendarWeek[] = [];
  for (let week = start; week <= last; week += 7 * CALENDAR_DAY) {
    const end = week + 6 * CALENDAR_DAY;
    const laneEnds: number[] = [];
    const segments = events.filter(e => calendarDay(e.start) <= end && calendarDay(e.end) >= week)
      .sort((a, b) => calendarDay(a.start) - calendarDay(b.start) || calendarDay(b.end) - calendarDay(a.end) || a.id.localeCompare(b.id))
      .map(event => {
        const from = Math.max(week, calendarDay(event.start));
        const to = Math.min(end, calendarDay(event.end));
        let lane = laneEnds.findIndex(end => end < from);
        if (lane === -1) lane = laneEnds.length;
        laneEnds[lane] = to;
        return { event, column: (from - week) / CALENDAR_DAY + 1, span: (to - from) / CALENDAR_DAY + 1, lane,
          continuesBefore: calendarDay(event.start) < week, continuesAfter: calendarDay(event.end) > end };
      });
    weeks.push({ start: week, days: Array.from({ length: 7 }, (_, i) => week + i * CALENDAR_DAY), segments, lanes: laneEnds.length });
  }
  return weeks;
}
