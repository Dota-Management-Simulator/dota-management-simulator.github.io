import type { Campaign, GameEvent } from "./game";
import { nextEvent } from "./game";
import { nextTournamentCommitment, tournamentEntryBlocker } from "./historical-game";
import { CALENDAR_DAY, calendarDay } from "./calendar-layout";
import { fixtureTeams, historicalTournaments, nextTournamentFixture, tournamentById, tournamentForRun } from "./tournaments";
import { nextScrim } from "./scrim-state";

export type ContinueAction =
  | { kind: "scrim"; label: string; detail: string }
  | { kind: "advance"; label: "Continue"; detail: string }
  | { kind: "tournament"; label: string; detail: string; eventId: string }
  | { kind: "legacy-event"; label: string; detail: string; event: GameEvent };

/** The same registration windows that stop advanceManagerWeek, independent of inbox read/archive state. */
function plannedEvents(c: Campaign) {
  if (!c.calendar) return [];
  const now = Date.parse(c.calendar.now);
  const planning = { ...c, calendar: { ...c.calendar, runs: c.calendar.runs.filter(run => run.state === "complete") } };
  return historicalTournaments.filter(event => {
    if (c.calendar!.runs.some(run => run.eventId === event.id)) return false;
    const registration = c.office?.registrations[event.id];
    if (registration?.status === "declined" || now > calendarDay(event.start) + CALENDAR_DAY) return false;
    const invited = c.office?.messages.some(message => message.id === `invitation:${event.id}` && !message.expired);
    return !!invited || (registration?.status === "reserved" && !tournamentEntryBlocker(planning, event));
  }).sort((a, b) => calendarDay(a.start) - calendarDay(b.start));
}

export function managerContinue(c: Campaign): ContinueAction {
  const scrim = nextScrim(c);
  if (c.calendar && scrim && Date.parse(scrim.at) <= Date.parse(c.calendar.now)) return { kind: "scrim", label: "Go to scrim", detail: `BO${scrim.bestOf} vs ${scrim.opponent}` };
  if (!c.calendar) {
    const event = nextEvent(c);
    if (event && event.week <= c.week && (event.kind !== "ti" || c.qualified))
      return { kind: "legacy-event", label: "Review event", detail: event.name, event };
    return { kind: "advance", label: "Continue", detail: "Training, recovery & weekly finances" };
  }
  const now = Date.parse(c.calendar.now);
  const due = c.calendar.runs.filter(run => run.state === "playing")
    .map(run => ({ run, fixture: nextTournamentFixture(run) }))
    .filter(entry => entry.fixture && Date.parse(entry.fixture.at) <= now)
    .sort((a, b) => Date.parse(a.fixture!.at) - Date.parse(b.fixture!.at))[0];
  if (due) {
    const teams = fixtureTeams(due.run, due.fixture!);
    return { kind: "tournament", label: teams?.includes(due.run.managed) ? "Go to series" : "Resume tournament",
      detail: tournamentForRun(due.run)?.name ?? "Tournament in progress", eventId: due.run.eventId };
  }
  const decision = plannedEvents(c).find(event => calendarDay(event.start) <= now);
  if (decision) return { kind: "tournament", label: "Review tournament", detail: decision.name, eventId: decision.id };
  return { kind: "advance", label: "Continue", detail: "Advance up to a week · stops at commitments" };
}

export function managerCompetition(c: Campaign) {
  if (!c.calendar) {
    const event = nextEvent(c);
    return event ? { name: event.name, stage: `Week ${event.week} · ${event.location}`, opponent: null,
      at: null, eventId: event.id, legacy: true, estimated: false } : null;
  }
  const commitment = nextTournamentCommitment(c);
  if (commitment) {
    const run = c.calendar.runs.find(r => r.eventId === commitment.eventId)!;
    const fixture = run.fixtures.find(f => f.id === commitment.fixtureId)!;
    const teams = fixtureTeams(run, fixture);
    const opponentId = teams?.includes(run.managed) ? teams.find(id => id !== run.managed) : undefined;
    return { name: tournamentForRun(run)?.name ?? "Registered tournament", stage: commitment.stage,
      opponent: opponentId ? run.teams.find(team => team.id === opponentId)?.name ?? null : null,
      at: commitment.at, eventId: run.eventId, legacy: false, estimated: fixture.dateVerified !== true && !fixture.timeVerified };
  }
  const event = plannedEvents(c)[0];
  return event ? { name: tournamentById(event.id)!.name, stage: c.office?.registrations[event.id]?.status === "reserved" ? "Place reserved" : "Invitation to review",
    opponent: null, at: event.start, eventId: event.id, legacy: false, estimated: false } : null;
}
