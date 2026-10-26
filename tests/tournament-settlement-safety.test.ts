import { test } from "node:test";
import assert from "node:assert/strict";
import { createCampaign, DEFAULT_SETTINGS } from "../src/game";
import { enableHistoricalCalendar, enterHistoricalTournament, settleTournamentMatch } from "../src/historical-game";
import { historicalTournaments, recordTournamentSeries } from "../src/tournaments";
import type { SeriesSummary } from "../src/battle";

function scenario() {
  const ti = historicalTournaments.find(e => e.kind === "ti" && e.year === 2011)!;
  const campaign = enterHistoricalTournament(enableHistoricalCalendar(createCampaign(DEFAULT_SETTINGS)), ti.id, 42);
  const run = campaign.calendar!.runs[0], other = run.teams.find(t => t.id !== run.managed)!;
  run.definition!.groups = [];
  run.fixtures = [0, 1].map(i => ({ id: `safety-${i}`, stage: "Safety test", label: "BO1", bestOf: 1 as const,
    at: new Date(Date.parse(campaign.calendar!.now) + i * 86400000).toISOString(), timeVerified: true,
    slots: [{ team: run.managed }, { team: other.id }] }));
  const series: SeriesSummary = { engine: "lane-siege-v1", seed: 42, teams: [campaign.settings.team, other.name],
    bestOf: 1, score: [1, 0], winner: 0, games: [{ winner: 0, duration: 600, kills: [0, 0], towers: [0, 0],
      ancientHealth: [100, 0], overtime: false, players: [], timeline: [] }] };
  return { campaign, run, series };
}

test("a blocked settlement cannot consume energy or record a match without advancing its clock", () => {
  const { campaign, run, series } = scenario();
  campaign.scrims = { research: {}, sessions: [{ id: "earlier-practice", opponentId: "test", opponent: "Practice club",
    at: new Date(Date.parse(campaign.calendar!.now) + 300000).toISOString(), bestOf: 1, focus: "balanced", status: "scheduled", source: "manager", seed: 1 }] };
  const before = JSON.stringify(campaign);
  assert.throws(() => settleTournamentMatch(campaign, run.eventId, run.fixtures[0].id, series), /scrim|commitment/i);
  assert.equal(JSON.stringify(campaign), before);
});

test("non-finite and non-positive map durations are rejected before tournament settlement", () => {
  for (const duration of [NaN, Infinity, 0, -600]) {
    const { campaign, run, series } = scenario();
    series.games[0].duration = duration;
    const before = JSON.stringify(campaign);
    assert.throws(() => recordTournamentSeries(run, run.fixtures[0].id, series), /result|duration/i);
    assert.throws(() => settleTournamentMatch(campaign, run.eventId, run.fixtures[0].id, series), /result|duration/i);
    assert.equal(JSON.stringify(campaign), before);
  }
});

test("successful settlement advances time once, preserves its input, and ignores duplicate delivery", () => {
  const { campaign, run, series } = scenario(), before = JSON.stringify(campaign);
  const next = settleTournamentMatch(campaign, run.eventId, run.fixtures[0].id, series);
  assert.equal(JSON.stringify(campaign), before);
  assert.equal(Date.parse(next.calendar!.now) - Date.parse(campaign.calendar!.now), 600000);
  assert.equal(next.calendar!.runs[0].matches.length, 1);
  assert.equal(settleTournamentMatch(next, run.eventId, run.fixtures[0].id, series), next);
});
