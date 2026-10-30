/** Era cost scale. A game rule, not a claim about real salaries or deals.
 * Derived from `tournaments.json`: the median prize pool of the year and its
 * neighbours, relative to 2011–2012, square-root dampened and capped at 6.
 * Only years whose list includes tier-2 events count; 2024–2026 list tier 1
 * alone, so they hold the last mixed-tier level instead of jumping to the cap.
 * Prizes stay the real historical amounts; wages, fees, sponsors, staff,
 * bootcamps, travel and starting cash follow this scale. */
const SCALE: Record<number, number> = {
  2011: 1, 2012: 1.1, 2013: 1.4, 2014: 2, 2015: 2.5, 2016: 3.2, 2017: 4, 2018: 4.9,
  2019: 4.9, 2020: 4.1, 2021: 2.9, 2022: 4.1, 2023: 4.1, 2024: 4.1, 2025: 4.1, 2026: 4.1,
};
export const economyScale = (year: number) => SCALE[Math.max(2011, Math.min(2026, Math.floor(year)))] ?? 1;
/** Scaled whole amount, rounded to `step` dollars. */
export const scaledCost = (year: number, amount: number, step = 10) => Math.round(amount * economyScale(year) / step) * step;

/** Sponsors fund part of the club. The rest of their value is paid for results. */
export const SPONSOR_WEEKLY_SHARE = 0.4;
/** Weeks of each active deal's weekly support paid as a results bonus. */
export function sponsorResultWeeks(place: number) {
  return place <= 1 ? 4 : place <= 2 ? 2.5 : place <= 4 ? 1.5 : place <= 8 ? 0.5 : 0;
}
/** Per-player travel and accommodation for a LAN. Online events cost nothing. */
export const TRAVEL_PER_PLAYER = 750;
export const CAMP_FEE_BASE = 900;
