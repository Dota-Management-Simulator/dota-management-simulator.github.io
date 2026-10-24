import { test } from "node:test";
import assert from "node:assert/strict";
import { advanceCalendarTo, createCampaign, DEFAULT_SETTINGS } from "../src/game";
import { enableHistoricalCalendar } from "../src/historical-game";
import { advanceManagerWeek, syncOffice, updateMessage } from "../src/office";
import { campaignPatch } from "../src/patches";
import { announcedPatches } from "../src/patch-announcements";
import { bracketSlot, tournamentBrackets, BRACKET_CARD_HEIGHT } from "../src/tournament-bracket";
import { fixtureTeams, historicalTournaments, nextTournamentFixture, recordTournamentSeries, seededTournamentFixtures } from "../src/tournaments";
import type { SeriesSummary } from "../src/battle";
import type { HistoricalTournament, TournamentRun } from "../src/tournament-types";

test("weekly Continue after TI announces the new patch once; read/archive and exact note links survive reload", () => {
  let c = enableHistoricalCalendar(createCampaign(DEFAULT_SETTINGS));
  c = advanceCalendarTo(c, "2011-08-21T00:00:00Z");
  c = syncOffice(c);
  assert.equal(campaignPatch(c).id, "2011.2");
  const before = JSON.stringify(c);
  let next = advanceManagerWeek(c);
  assert.equal(JSON.stringify(c), before);
  assert.equal(campaignPatch(next).id, "2012.1");
  const announcement = next.office!.messages.find(m => m.id === "patch:2012.1")!;
  assert.ok(announcement && !announcement.read);
  assert.match(announcement.body, /post-TI.*New heroes:/s);
  assert.deepEqual(announcement.action, { kind: "patch", patchId: "2012.1" });
  next = updateMessage(next, announcement.id, { read: true, archived: true });
  next = syncOffice(JSON.parse(JSON.stringify(next)));
  assert.equal(syncOffice(next), next);
  assert.equal(next.office!.messages.filter(m => m.id === announcement.id).length, 1);
  assert.ok(next.office!.messages.find(m => m.id === announcement.id)!.archived);
  next = syncOffice(advanceCalendarTo(next, "2011-10-15T00:00:00Z"));
  assert.ok(!next.office!.messages.find(m => m.id === announcement.id)!.expired, "older notes remain readable");
});

test("migration announces current rules only; jumps preserve both phases, milestones, future drops and weekly saves", () => {
  const dated = { year: 2023, week: 1, calendar: { now: "2023-05-01T00:00:00Z" } };
  const current = campaignPatch(dated);
  assert.deepEqual(announcedPatches(dated).map(p => p.id), [current.id]);
  assert.deepEqual(announcedPatches(dated, "2022.1").map(p => p.id), ["2022.2", "2023.1"]);
  assert.deepEqual(announcedPatches({ year: 2027, week: 9 }, "2026.2").map(p => p.id), ["2027.1", "2027.2"]);
  let c = createCampaign(DEFAULT_SETTINGS);
  c.week = 16;
  c = syncOffice(c);
  const next = advanceManagerWeek(c);
  assert.equal(next.week, 17);
  assert.ok(next.office!.messages.some(m => m.id === "patch:2012.1"));
  const modern = enableHistoricalCalendar(createCampaign({ ...DEFAULT_SETTINGS, year: 2023 }));
  modern.calendar!.now = "2023-01-01T00:00:00Z"; // Test first-phase migration explicitly.
  const notice = syncOffice(modern).office!.messages.find(m => m.id === "patch:2023.1")!;
  assert.match(notice.body, /7.33.*New Frontiers/s);
  assert.match(notice.body, /official trailer/);
});

const modelRun = (e: HistoricalTournament): TournamentRun => ({ eventId: e.id, seed: 19, managed: e.teams[0], teams: e.teams.map(id => ({ id, name: e.teamNames[id], roster: [] })), lineup: [], prizeShares: {}, fixtures: seededTournamentFixtures(e, 19), matches: [], groupOrder: {}, state: "playing", placements: [] });
function playNext(run: TournamentRun) {
  const f = nextTournamentFixture(run)!;
  const keys = fixtureTeams(run, f)!;
  const score: [number, number] = [...f.advantage ?? [0, 0]];
  const games: SeriesSummary["games"] = [];
  while (f.bestOf === 2 ? games.length < 2 : score[0] < Math.floor(f.bestOf / 2) + 1) {
    score[0]++;
    games.push({ winner: 0, duration: 1200, players: [], timeline: [], kills: [0, 0], towers: [0, 0], ancientHealth: [1, 0], overtime: false });
  }
  return recordTournamentSeries(run, f.id, { engine: "lane-siege-v1", seed: run.seed, teams: keys.map(k => run.teams.find(t => t.id === k)!.name) as [string, string], score, winner: 0, games, bestOf: f.bestOf });
}

test("TI bracket appears at playoffs, resolves real campaign winner/loser paths and survives a completed save", () => {
  const event = historicalTournaments.find(e => e.kind === "ti" && e.year === 2011)!;
  let run = modelRun(event);
  assert.ok(tournamentBrackets(run).every(b => !b.reached));
  while (nextTournamentFixture(run)?.group) run = playNext(run);
  const before = JSON.stringify(run);
  const bracket = tournamentBrackets(run).find(b => b.stage === "Playoffs")!;
  assert.equal(JSON.stringify(run), before);
  assert.ok(bracket.reached);
  assert.equal(bracket.nodes.length, 22);
  assert.equal(bracket.nextId, nextTournamentFixture(run)!.id);
  assert.ok(bracket.edges.some(e => e.outcome === "loser"));
  for (const edge of bracket.edges) assert.ok(edge.to.x > edge.from.x);
  for (const node of bracket.nodes) assert.ok(node.y >= 0 && node.y + BRACKET_CARD_HEIGHT <= bracket.height);
  const first = nextTournamentFixture(run)!;
  run = playNext(run);
  const result = run.matches.find(m => m.id === first.id)!;
  assert.equal(bracketSlot(run, bracket.fixtures, { match: first.id, outcome: "winner" }).key, result.teams[0]);
  assert.equal(bracketSlot(run, bracket.fixtures, { match: first.id, outcome: "loser" }).key, result.teams[1]);
  let guard = 0;
  while (run.state === "playing" && guard++ < 200) run = playNext(run);
  assert.equal(run.state, "complete");
  assert.ok(tournamentBrackets(JSON.parse(JSON.stringify(run))).every(b => b.reached));
  assert.equal(run.fixtures.at(-1)!.advantage![0], 1);
});

test("stage visibility handles bracket-only events, group-only events and later elimination stages", () => {
  const event = historicalTournaments.find(e => e.status === "ready" && e.groups.length === 0)!;
  let run = modelRun(event);
  assert.ok(tournamentBrackets(run).some(b => b.reached));
  const opening = run.fixtures[0];
  run.fixtures = [{ ...opening, stage: "Seeding" }, { ...opening, id: "final", stage: "Finals", slots: [{ match: opening.id, outcome: "winner" }, { match: opening.id, outcome: "loser" }] }];
  assert.deepEqual(tournamentBrackets(run).map(b => b.reached), [true, false]);
  run = playNext(run);
  assert.deepEqual(tournamentBrackets(run).map(b => b.reached), [true, true]);
  const finals = tournamentBrackets(run)[1];
  assert.match(bracketSlot(run, finals.fixtures, finals.fixtures[0].slots[0]).source, /^Winner:/);
  assert.doesNotMatch(bracketSlot(run, finals.fixtures, finals.fixtures[0].slots[0]).source, /M0/);
  const groupOnly = historicalTournaments.find(e => e.status === "ready" && e.fixtures.every(f => f.group))!;
  assert.deepEqual(tournamentBrackets(modelRun(groupOnly)), []);
});
