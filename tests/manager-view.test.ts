import { test } from "node:test";
import assert from "node:assert/strict";
import { createCampaign, DEFAULT_SETTINGS, nextEvent } from "../src/game";
import { enterHistoricalTournament, enableHistoricalCalendar } from "../src/historical-game";
import { declineTournament, reserveTournament, syncOffice, updateMessage } from "../src/office";
import { historicalTournaments, nextTournamentFixture } from "../src/tournaments";
import { managerCompetition, managerContinue } from "../src/manager-view";

const ti1 = historicalTournaments.find(event => event.kind === "ti" && event.year === 2011)!;
const dated = () => syncOffice(enableHistoricalCalendar(createCampaign(DEFAULT_SETTINGS)));

test("Continue reflects due invitations even when read or archived, without changing the save", () => {
  let c = dated();
  const invitation = c.office!.messages.find(message => message.id === `invitation:${ti1.id}`)!;
  c = updateMessage(c, invitation.id, { read: true, archived: true });
  const before = JSON.stringify(c);
  assert.deepEqual(managerContinue(c), { kind: "tournament", label: "Review tournament", detail: ti1.name, eventId: ti1.id });
  assert.equal(managerCompetition(c)?.name, ti1.name);
  assert.equal(JSON.stringify(c), before);
});

test("Declining a due invitation releases Continue; ordinary messages do not block it", () => {
  const c = declineTournament(dated(), ti1.id);
  assert.ok(c.office!.messages.some(message => message.action?.kind === "page"));
  assert.equal(managerContinue(c).kind, "advance");
  assert.equal(managerCompetition(c), null);
});

test("Reserved entry remains actionable and manager selectors preserve campaign state", () => {
  const c = reserveTournament(dated(), ti1.id);
  const before = JSON.stringify(c);
  assert.equal(managerContinue(c).kind, "tournament");
  assert.equal(managerCompetition(c)?.stage, "Place reserved");
  assert.equal(JSON.stringify(c), before);
});

test("Registered series route to the tournament at its fixture date", () => {
  const c = enterHistoricalTournament(dated(), ti1.id, 42);
  const run = c.calendar!.runs[0];
  const fixture = nextTournamentFixture(run)!;
  c.calendar!.now = fixture.at;
  const action = managerContinue(c);
  assert.equal(action.kind, "tournament");
  assert.ok(action.kind === "tournament" && action.eventId === run.eventId);
  assert.match(action.label, /series|Resume tournament/);
  assert.equal(managerCompetition(c)?.eventId, run.eventId);
});

test("Legacy campaigns retain weekly advancement and event eligibility", () => {
  const c = createCampaign(DEFAULT_SETTINGS);
  assert.equal(c.calendar, undefined);
  const event = nextEvent(c)!;
  c.week = event.week;
  assert.equal(managerContinue(c).kind, "legacy-event");
  assert.equal(managerCompetition(c)?.legacy, true);
  assert.equal(c.calendar, undefined);
  const ti = nextEvent({ ...c, week: 16 })!;
  c.week = ti.week;
  c.qualified = false;
  assert.equal(managerContinue(c).kind, "advance");
});

test("Future invitations remain visible but allow the clock to advance toward their opening", () => {
  const c = dated();
  c.calendar!.now = "2011-08-16T00:00:00Z";
  assert.equal(managerContinue(c).kind, "advance");
  assert.equal(managerCompetition(c)?.eventId, ti1.id);
});

test("An unresolved bracket does not present another club's AI match as the managed opponent", () => {
  const c = enterHistoricalTournament(dated(), ti1.id, 42);
  const run = c.calendar!.runs[0];
  const others = run.teams.filter(team => team.id !== run.managed);
  run.fixtures = [{ ...run.fixtures[0], slots: [{ team: others[0].id }, { team: others[1].id }] }];
  assert.equal(managerCompetition(c)?.opponent, null);
});
