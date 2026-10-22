import { test } from "node:test";
import assert from "node:assert/strict";
import { createCampaign, DEFAULT_SETTINGS } from "../src/game";
import type { Campaign } from "../src/game";
import { earnedInvitations, enableHistoricalCalendar, invitationRanking } from "../src/historical-game";
import { historicalTournaments } from "../src/tournaments";
import type { HistoricalTournament, TournamentRun } from "../src/tournament-types";
import { campaignStandings, nextRaceEvent } from "../src/standings";
import { declineTournament, reserveTournament, syncOffice } from "../src/office";

const ti1 = historicalTournaments.find(e => e.kind === "ti" && e.year === 2011)!;
const ti2 = historicalTournaments.find(e => e.kind === "ti" && e.year === 2012)!;
const dated = (year = 2011, custom = false) => enableHistoricalCalendar(createCampaign({ ...DEFAULT_SETTINGS, year,
  ...(custom ? { clubMode: "custom", team: "Test Club" } as const : {}) }));
function runFor(c: Campaign, id = "recorded", end = "2011-08-19"): TournamentRun {
  const clubs = c.world!.clubs.filter(club => club.active !== false && club.roster.length === 5).slice(0, 3);
  const { fixtures: _fixtures, ...definition } = { ...ti1, id, name: `Campaign ${id}`, start: end, end, kind: "event" as const, tier: 1, groups: [] };
  return { eventId: id, seed: 1, managed: c.world!.managedTeamId, teams: clubs.map(club => ({ id: club.id, clubId: club.id, name: club.name, roster: club.roster })),
    lineup: c.roster, prizeShares: {}, matches: [], fixtures: [], groupOrder: {}, state: "playing", placements: [], definition };
}
function addMatch(run: TournamentRun, id: string, at: string, score: [number, number], winner: 0 | 1 | null, advantage?: [number, number]) {
  const teams: [string, string] = [run.teams[0].id, run.teams[1].id];
  run.fixtures.push({ id, at, stage: "Group A", label: id, bestOf: 3, timeVerified: true, slots: [{ team: teams[0] }, { team: teams[1] }], advantage });
  run.matches.push({ id, at, teams, score, winner });
}
function complete(run: TournamentRun, winner = 0) {
  run.state = "complete";
  run.placements = [{ team: run.teams[winner].id, from: 1, to: 1, prize: 10000, points: 0 },
    { team: run.teams[1 - winner].id, from: 2, to: 2, prize: 4000, points: 0 }];
  return run;
}

test("TI1 uses the fixed field, maps a custom replacement once, and never invents opening form", () => {
  const c = dated(2011, true), before = JSON.stringify(c);
  const view = campaignStandings(c);
  assert.equal(view.event?.id, ti1.id);
  assert.equal(view.rows.filter(row => row.status === "invited").length, 16);
  assert.equal(view.rows.filter(row => row.managed).length, 1);
  assert.equal(view.rows.find(row => row.managed)!.name, "Test Club");
  assert.equal(view.rows.find(row => row.managed)!.status, "invited");
  assert.ok(view.rows.every(row => !row.played && !row.form.length && row.inviteRank === null));
  assert.equal(view.winners.length, 0);
  assert.equal(JSON.stringify(c), before);
});

test("records include AI sides, draws and team-zero wins, subtract default wins, and ignore duplicate/future series", () => {
  const c = dated();
  c.calendar!.now = "2011-08-19T12:00:00Z";
  const run = runFor(c);
  addMatch(run, "first", "2011-08-18T10:00:00Z", [3, 1], 0, [1, 0]);
  addMatch(run, "draw", "2011-08-19T10:00:00Z", [1, 1], null);
  addMatch(run, "future", "2011-08-20T10:00:00Z", [0, 2], 1);
  run.matches.push(structuredClone(run.matches[0]));
  c.calendar!.runs.push(run, structuredClone(run));
  const before = JSON.stringify(c), view = campaignStandings(c);
  const a = view.rows.find(row => row.id === run.teams[0].clubId)!;
  const b = view.rows.find(row => row.id === run.teams[1].clubId)!;
  assert.equal(view.recordedSeries, 2);
  assert.deepEqual([a.wins, a.draws, a.losses, a.mapWins, a.mapLosses], [1, 1, 0, 3, 2]);
  assert.deepEqual([b.wins, b.draws, b.losses], [0, 1, 1]);
  assert.deepEqual(a.form.map(f => f.outcome), ["D", "W"]);
  assert.equal(JSON.stringify(c), before);
});

test("champions, runner-up and gross prizes come from complete placements and survive the next TI window", () => {
  const c = dated();
  const run = complete(runFor(c, ti1.id, ti1.end));
  run.definition = { ...run.definition!, kind: "ti", name: ti1.name };
  c.calendar!.runs.push(run);
  c.calendar!.now = "2011-08-22T00:00:00Z";
  const view = campaignStandings(c);
  assert.equal(view.event?.id, ti2.id);
  assert.equal(view.winners.length, 1, "the last TI champion stays in recent winners after the race rolls over");
  assert.equal(view.winners[0].winner.name, run.teams[0].name);
  assert.equal(view.winners[0].runnerUp?.name, run.teams[1].name);
  assert.equal(view.winners[0].prize, 10000);
  assert.equal(view.rows.find(row => row.id === run.teams[0].clubId)!.titles, 0, "last TI is outside the new title-count window");
});

test("only completed events publish winners; unfinished and future-dated completions stay unknown", () => {
  const c = dated();
  c.calendar!.runs.push(runFor(c, "unfinished"), complete(runFor(c, "future", "2011-08-20")));
  assert.equal(campaignStandings(c).winners.length, 0);
});

test("the managed TI status distinguishes an offered invite, reservation, decline and a missed entry window", () => {
  const c = syncOffice(dated());
  assert.equal(campaignStandings(reserveTournament(c, ti1.id)).rows.find(row => row.managed)!.status, "reserved");
  assert.equal(campaignStandings(declineTournament(c, ti1.id)).rows.find(row => row.managed)!.status, "declined");
  c.calendar!.now = "2011-08-19T00:00:00Z";
  assert.equal(campaignStandings(c, ti1).rows.find(row => row.managed)!.status, "missed");
});

test("a completed qualifier gives the custom club a real TI place without inventing a main-event title", () => {
  const c = dated(2012, true);
  c.calendar!.now = "2012-04-02T00:00:00Z";
  const run = complete(runFor(c, "qualifier", "2012-04-01"));
  run.definition = { ...run.definition!, kind: "qualifier", qualification: [{ eventId: ti2.id, from: 1, to: 1 }] };
  c.calendar!.runs.push(run);
  const view = campaignStandings(c), own = view.rows.find(row => row.managed)!;
  assert.equal(own.status, "qualified");
  assert.equal(own.titles, 0);
  assert.equal(own.inviteRank, null);
  assert.ok(!earnedInvitations(c, ti2).includes(c.world!.replacedTeamId!));
  assert.equal(view.winners[0].qualifier, true);
});

test("projected invitation order uses the actual entry ranking; freezing invitations removes forecasts and reconstructed scores", () => {
  const c = dated(2012);
  c.calendar!.now = "2012-04-02T00:00:00Z";
  const run = complete(runFor(c, "league", "2012-04-01"));
  c.calendar!.runs.push(run);
  const ranking = invitationRanking(c, ti2);
  assert.equal(ranking[0].clubId, run.teams[0].clubId);
  assert.equal(ranking[0].performance, 1);
  assert.deepEqual(earnedInvitations(c, ti2), ranking.slice(0, ti2.invited.length).map(row => row.id));
  const forecast = campaignStandings(c);
  assert.equal(forecast.rows.filter(row => row.status === "projected").length, ti2.invited.length);
  c.calendar!.invitations[ti2.id] = [...earnedInvitations(c, ti2)];
  const frozen = [...c.calendar!.invitations[ti2.id]];
  c.players.forEach(p => Object.keys(p.stats).forEach(key => { p.stats[key as keyof typeof p.stats] = 99; }));
  const confirmed = campaignStandings(c);
  assert.equal(confirmed.rows.filter(row => row.status === "projected").length, 0);
  assert.equal(confirmed.rows.filter(row => row.status === "invited").length, frozen.length);
  assert.ok(confirmed.rows.every(row => row.inviteRank === null));
  assert.deepEqual(earnedInvitations(c, ti2), frozen);
});

test("old TI views exclude later matches and winners, and cannot retrospectively manufacture invitations", () => {
  const c = dated();
  const old = runFor(c, "during-ti", "2011-08-20");
  addMatch(old, "early", "2011-08-20T10:00:00Z", [2, 0], 0);
  const later = complete(runFor(c, "later", "2011-09-01"));
  addMatch(later, "late", "2011-09-01T10:00:00Z", [0, 2], 1);
  c.calendar!.runs.push(old, later);
  c.calendar!.now = "2011-09-02T00:00:00Z";
  const view = campaignStandings(c, ti1);
  assert.equal(view.recordedSeries, 1);
  assert.equal(view.winners.length, 0);
  c.calendar!.now = "2013-01-01T00:00:00Z";
  assert.equal(campaignStandings(c, ti2).rows.filter(row => row.status === "projected").length, 0);
});

test("unlinked field slots are event-scoped even when their display names match", () => {
  const c = dated(); c.calendar!.now = "2011-08-20T00:00:00Z";
  const runs = [runFor(c, "one"), runFor(c, "two")];
  for (const run of runs) {
    run.teams[1] = { id: "same-slot", name: "Unlinked team", roster: [] };
    addMatch(run, "match", "2011-08-19T10:00:00Z", [0, 2], 1);
    c.calendar!.runs.push(run);
  }
  const unlinked = campaignStandings(c).rows.filter(row => row.name === "Unlinked team");
  assert.equal(unlinked.length, 2);
  assert.ok(unlinked.every(row => row.played === 1));
  assert.notEqual(unlinked[0].id, unlinked[1].id);
});

test("the calendar respects the cancelled 2020 TI and does not invent editions after imported history", () => {
  const c = dated(2020);
  assert.equal(nextRaceEvent(c)?.year, 2021);
  c.calendar!.now = "2030-01-01T00:00:00Z";
  assert.equal(nextRaceEvent(c), null);
});

test("legacy archives retain their clock and qualification, while unknown rival prizes and match records stay unknown", () => {
  const c = createCampaign(DEFAULT_SETTINGS);
  c.week = 8; c.points = 80; c.qualified = true;
  c.results.push({ eventId: "open", event: "Founders Open", year: c.year, week: 3, won: false, prize: 960, points: 6, opponent: "Old rival", score: "Archived" });
  const before = JSON.stringify(c), view = campaignStandings(c);
  assert.equal(view.rows.find(row => row.managed)!.status, "qualified");
  assert.equal(view.recordedSeries, 0);
  assert.equal(view.winners[0].winner.name, "Old rival");
  assert.equal(view.winners[0].prize, null);
  assert.equal(c.calendar, undefined);
  assert.equal(JSON.stringify(c), before);
});
