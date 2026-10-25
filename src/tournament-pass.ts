import type { Campaign } from "./game";
import type { MenuEvent } from "./menu-events";
import type { TiMenu } from "./menu-ti";
import { historicalTournaments, tournamentForRun } from "./tournaments";
import type { HistoricalTournament } from "./tournament-types";

export interface TournamentPass {
  id: string;
  title: string;
  art: string;
  /** A tournament Compendium, or a season guide for passes without a named event. */
  eventId?: string;
  from: string;
  to: string;
  note?: string;
}

const ti = (year: number) => historicalTournaments.find(event => event.kind === "ti" && event.year === year)!;
const major = (name: string) => historicalTournaments.find(event => event.name === name)!;
const international = (year: number, from: string, art: string): TournamentPass => ({
  id: `ti-${year}`, title: `The International ${year} Battle Pass`, art,
  eventId: ti(year).id, from, to: ti(year).end,
});

/** Matches the pass promotions already shown by the client. Season-only passes
 * get a tournament guide as a manager adaptation, not an invented historical TI. */
export const tournamentPasses: TournamentPass[] = [
  { id: "fall-2015", title: "Fall Season 2015 Compendium", art: "update-fall2015.png", eventId: major("The Frankfurt Major 2015").id, from: "2015-10-02", to: "2015-11-23" },
  { id: "winter-2016", title: "Winter 2016 Battle Pass", art: "update-winterbp.jpg", eventId: major("The Shanghai Major 2016").id, from: "2016-01-27", to: major("The Shanghai Major 2016").end },
  international(2016, "2016-05-16", "ti2016.jpg"),
  { id: "fall-2016", title: "Fall 2016 Battle Pass", art: "update-fall2016.jpg", eventId: major("The Boston Major 2016").id, from: "2016-10-05", to: major("The Boston Major 2016").end },
  international(2017, "2017-05-04", "ti2017.jpg"),
  international(2018, "2018-05-08", "update-ti8bp.jpg"),
  international(2019, "2019-05-07", "update-ti9bp.jpg"),
  { id: "ti10-2020", title: "The International 10 Battle Pass", art: "update-ti10bp.jpg", eventId: ti(2021).id, from: "2020-05-25", to: "2020-10-09", note: "The 2020 International was postponed. This guide follows TI10, held in 2021." },
  { id: "nemestice", title: "Nemestice Battle Pass", art: "update-nemestice.jpg", from: "2021-06-24", to: "2021-08-17", note: "Season tournament guide · a manager adaptation for this event Battle Pass." },
  { id: "continuum", title: "Aghanim’s Labyrinth Battle Pass", art: "update-continuum.jpg", from: "2021-12-15", to: "2022-02-23", note: "Season tournament guide · a manager adaptation for this event Battle Pass." },
  { ...international(2022, "2022-09-01", "update-battlepass2022.jpg"), to: "2023-01-12" },
];

export function tournamentPassForMenu(day: string, promotionArt: string, tiMenu?: TiMenu, event?: MenuEvent, archived = false): TournamentPass | undefined {
  // An archived event keeps its own pass instead of borrowing today's TI.
  const eventPass = event && tournamentPasses.find(pass => pass.id === event.id
    || (event.id === "labyrinth" && pass.id === "ti10-2020")
    || (event.id === "siltbreaker" && pass.id === "ti-2017")
    || (event.id === "underhollow" && pass.id === "ti-2018")
    || (event.id === "diretide" && pass.id === "ti-2022"));
  if (archived) return eventPass;
  if (tiMenu?.style === "battlepass") return tournamentPasses.find(pass => pass.eventId === tiMenu.event.id);
  return [...tournamentPasses].reverse().find(pass => pass.from <= day && day <= pass.to)
    ?? eventPass ?? tournamentPasses.find(pass => pass.art === promotionArt);
}

/** Prefer pinned campaign rules/lineups to the historical reference field. */
export function passTournaments(pass: TournamentPass, campaign: Pick<Campaign, "calendar">): HistoricalTournament[] {
  const events = pass.eventId ? historicalTournaments.filter(event => event.id === pass.eventId)
    : historicalTournaments.filter(event => event.start <= pass.to && event.end >= pass.from);
  return events.map(event => {
    const run = campaign.calendar?.runs.find(run => run.eventId === event.id);
    return run ? tournamentForRun(run) ?? event : event;
  }).sort((a, b) => a.start.localeCompare(b.start) || a.name.localeCompare(b.name));
}

export function passTournamentData(event: HistoricalTournament, campaign: Pick<Campaign, "calendar">) {
  const run = campaign.calendar?.runs.find(run => run.eventId === event.id);
  const teams = run ? run.teams.map(team => ({ id: team.id, name: team.name, managed: team.id === run.managed }))
    : event.teams.map(id => ({ id, name: event.teamNames[id] ?? id, managed: false }));
  return { run, teams, fixtures: run?.fixtures ?? event.fixtures, matches: run?.matches ?? [] };
}
