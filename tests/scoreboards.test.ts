import { test } from "node:test";
import assert from "node:assert/strict";
import { simulateSeries } from "../src/battle";
import { createCampaign, DEFAULT_SETTINGS } from "../src/game";
import { enableHistoricalCalendar, enterHistoricalTournament, settleTournamentMatch, tournamentBattleConfig } from "../src/historical-game";
import { fixtureTeams, historicalTournaments, nextTournamentFixture, recordTournamentSeries } from "../src/tournaments";
import { tournamentScoreboard } from "../src/scoreboards";

const event = historicalTournaments.find(e => e.year === 2011 && e.kind === "ti")!;
const campaign = () => enterHistoricalTournament(enableHistoricalCalendar(createCampaign(DEFAULT_SETTINGS)), event.id, 42);

test("simulated managed scoreboards survive settlement/reload, retain side order and recorded graphs", () => {
  const c = campaign();
  const run = c.calendar!.runs[0];
  const fixture = nextTournamentFixture(run)!;
  // Pin the manager to the second bracket slot to exercise managed-first storage.
  run.managed = fixtureTeams(run, fixture)![1];
  const summary = simulateSeries({ ...tournamentBattleConfig(c, run, fixture), captureReplay: false }).summary;
  const next = settleTournamentMatch(c, event.id, fixture.id, summary);
  const saved = JSON.parse(JSON.stringify(next)).calendar.runs[0];
  const view = tournamentScoreboard(event, saved, saved.matches[0])!;
  assert.deepEqual(view.result.series, summary);
  assert.equal(view.perspective, 0);
  assert.equal(view.teamIds[0], run.teams.find(t => t.id === run.managed)!.clubId);
  assert.equal(view.result.won, summary.winner === 0);
  assert.equal(settleTournamentMatch(next, event.id, fixture.id, summary), next);
  assert.equal(view.result.series!.games[0].players.length, 10);
  assert.ok(view.result.series!.games[0].timeline!.length > 0);
});

test("compact AI archives show real rows neutrally without inventing timelines or objective totals", () => {
  const c = campaign();
  const run = c.calendar!.runs[0];
  run.managed = "spectator";
  const fixture = nextTournamentFixture(run)!;
  const summary = simulateSeries({ ...tournamentBattleConfig(c, run, fixture, false), captureReplay: false }).summary;
  const saved = JSON.parse(JSON.stringify(recordTournamentSeries(run, fixture.id, summary)));
  const before = JSON.stringify(saved);
  const view = tournamentScoreboard(event, saved, saved.matches[0])!;
  assert.equal(view.perspective, null);
  assert.deepEqual(view.result.series!.games, saved.matches[0].performance.games);
  assert.deepEqual(view.result.series!.score, summary.score);
  assert.deepEqual(view.result.series!.games[0].players, summary.games[0].players);
  assert.equal(view.result.series!.games[0].timeline, undefined);
  assert.equal(view.result.series!.games[0].towers, undefined);
  assert.equal(view.result.series!.games[0].ancientHealth, undefined);
  assert.equal(JSON.stringify(saved), before);
  delete saved.matches[0].performance;
  assert.equal(tournamentScoreboard(event, saved, saved.matches[0]), null);
});

test("BO2 draws and default-win finals retain their saved format and only show played maps", () => {
  for (const format of [{ bestOf: 2 as const }, { bestOf: 5 as const, advantage: [1, 0] as [number, number] }]) {
    const c = campaign();
    const run = c.calendar!.runs[0];
    const fixture = nextTournamentFixture(run)!;
    Object.assign(fixture, format);
    const summary = simulateSeries({ ...tournamentBattleConfig(c, run, fixture, false), captureReplay: false }).summary;
    const ids = fixtureTeams(run, fixture)!;
    const match = { id: fixture.id, at: fixture.at, teams: ids, winner: summary.winner, score: summary.score, series: summary };
    const view = tournamentScoreboard(event, run, match)!;
    assert.equal(view.result.series!.bestOf, format.bestOf);
    assert.equal(view.result.series!.games.length, summary.games.length);
    assert.deepEqual(view.result.series!.advantage, summary.advantage);
    if (format.bestOf === 5) assert.equal(summary.games.length, summary.score[0] + summary.score[1] - 1);
    // A draw is a legitimate archived series, with no win/loss banner.
    if (format.bestOf === 2) {
      const drawn = { ...summary, winner: null, score: [1, 1] as [number, number] };
      const drawView = tournamentScoreboard(event, run, { ...match, winner: null, score: drawn.score, series: drawn })!;
      assert.equal(drawView.result.series!.winner, null);
      assert.equal(drawView.result.won, false);
    }
  }
});
