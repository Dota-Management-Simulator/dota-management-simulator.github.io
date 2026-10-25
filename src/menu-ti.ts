import type { Campaign } from "./game";
import { historicalCampaignStart } from "./historical-game";
import { historicalTournaments } from "./tournaments";
import type { HistoricalTournament } from "./tournament-types";

/** How each year's client presented The International. 2011 had no client
 * screen. Years marked inferred in `inferredTiYears` have no client capture and
 * borrow the nearest captured layout. */
export type TiMenuStyle = "international-tab" | "compendium-2013" | "compendium-book" | "compendium-2015"
  | "battlepass" | "compendium-2021" | "compendium-sidebar";
export interface TiMenu {
  edition: number;
  year: number;
  style: TiMenuStyle;
  inferred: boolean;
  event: HistoricalTournament;
  /** The client takeover window, ending on the event's final day. */
  from: string;
  to: string;
  teams: { id: string; name: string; managed: boolean }[];
  managedEntered: boolean;
}

const styles: Record<number, TiMenuStyle> = {
  2012: "international-tab", 2013: "compendium-2013", 2014: "compendium-book", 2015: "compendium-2015",
  2016: "battlepass", 2017: "battlepass", 2018: "battlepass", 2019: "battlepass", 2021: "compendium-2021", 2022: "battlepass",
  2023: "compendium-sidebar", 2024: "compendium-sidebar", 2025: "compendium-sidebar", 2026: "compendium-sidebar",
};
export const inferredTiYears = [2017, 2018, 2019, 2022, 2025, 2026];

/** TI2's blue dashboard is captured by August 20, rather than the July
 * preparation start. Source 1 Compendiums follow Valve's release dates;
 * Reborn years retain their existing preparation-month proxy. */
export function tiMenuStart(year: number): string {
  return ({ 2012: "2012-08-20", 2013: "2013-05-08", 2014: "2014-05-09", 2015: "2015-05-01" } as Record<number, string>)[year] ?? historicalCampaignStart(year).slice(0, 10);
}

/** TI editions count the cancelled 2020 event out: 2021 was TI10. */
const edition = (year: number) => year - (year > 2020 ? 2011 : 2010);

export function tiMenuForCampaign(c: Pick<Campaign, "calendar" | "world">): TiMenu | undefined {
  const day = c.calendar?.now.slice(0, 10);
  if (!day) return undefined;
  const event = historicalTournaments.find(e => e.kind === "ti" && styles[e.year] && tiMenuStart(e.year) <= day && day <= e.end);
  if (!event) return undefined;
  const run = c.calendar!.runs.find(r => r.eventId === event.id);
  const managed = c.world?.managedTeamId;
  const teams = run
    ? run.teams.map(team => ({ id: team.id, name: team.name, managed: team.id === run.managed }))
    : event.teams.map(id => ({ id, name: event.teamNames[id] ?? id, managed: id === managed }));
  return { edition: edition(event.year), year: event.year, style: styles[event.year], inferred: inferredTiYears.includes(event.year), event,
    from: tiMenuStart(event.year), to: event.end, teams, managedEntered: teams.some(team => team.managed) };
}
