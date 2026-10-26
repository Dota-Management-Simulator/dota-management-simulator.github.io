import { weeklyIncome, weeklyWages } from "./game";
import type { Campaign } from "./game";
import { campaignWeek } from "./contracts";

export interface ForecastRow { offset: number; label: string; income: number; payroll: number; extra: number; balance: number }
/** A frozen-roster budget, not a campaign simulation. Match prizes are uncertain. */
export function financeForecast(c: Campaign, weeks = 8, upfront = 0, extraWeekly = 0): ForecastRow[] {
  const safe = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(1e9, value)) : 0;
  const horizon = Number.isFinite(weeks) ? Math.max(1, Math.min(18, Math.floor(weeks))) : 8;
  let balance = c.cash - safe(upfront);
  const rows: ForecastRow[] = [];
  for (let offset = 0; offset < horizon; offset++) {
    // The engine pays the elapsed interval at its START, including when a
    // dated calendar stops partway through that interval before this preview.
    const tick = c.calendar ? c.calendar.contractEpoch + c.calendar.paidWeeks + offset : campaignWeek(c) + offset;
    const shadow: Campaign = c.calendar ? { ...c, calendar: { ...c.calendar,
      now: new Date(Date.parse(c.calendar.origin) + (tick - c.calendar.contractEpoch) * 604800000).toISOString() } }
      : { ...c, year: Math.floor(tick / 18), week: tick % 18 + 1 };
    const income = weeklyIncome(shadow), payroll = weeklyWages(c), extra = safe(extraWeekly);
    balance += income - payroll - extra;
    const label = c.calendar ? new Date(Date.parse(c.calendar.origin) + (c.calendar.paidWeeks + offset + 1) * 604800000)
      .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : `${shadow.year} · Week ${shadow.week}`;
    rows.push({ offset: offset + 1, label, income, payroll, extra, balance });
  }
  return rows;
}
