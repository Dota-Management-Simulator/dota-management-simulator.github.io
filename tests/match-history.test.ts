import { test } from "node:test";
import assert from "node:assert/strict";
import type { Campaign, Result } from "../src/game";
import { createCampaign, DEFAULT_SETTINGS } from "../src/game";
import type { GameSummary, PlayerScore, SeriesSummary } from "../src/battle";
import { simulateSeries } from "../src/battle";
import { campaignMatchHistory } from "../src/match-history";
import { playerPerformance } from "../src/performance";
import { enableHistoricalCalendar, enterHistoricalTournament, settleTournamentMatch, tournamentBattleConfig } from "../src/historical-game";
import { historicalTournaments, fixtureTeams, nextTournamentFixture } from "../src/tournaments";

const player = (id: string, team: 0 | 1): PlayerScore => ({ id, player: id, team, heroId: "axe", hero: "Axe", role: 0, level: 12,
  kills: 2, deaths: 1, assists: 3, gold: 4000, xp: 6000, lastHits: 40 });
const map = (winner: 0 | 1): GameSummary => ({ winner, duration: 1200, kills: [5, 3], towers: [2, 1],
  players: [player("real-fly", 0), player("real-fly.", 1)], timeline: [], overtime: false, ancientHealth: [1000, 0] });
const series: SeriesSummary = { engine: "lane-siege-v1", seed: 1, teams: ["Home", "Away"], winner: null,
  score: [1, 1], bestOf: 2, games: [map(0), map(1)], patch: { id: "2011.1", name: "Opening", versions: "6.70" } };
const result: Result = { eventId: "open", event: "Founders Open", year: 2011, week: 1, won: false,
  prize: 0, points: 0, opponent: "Away", score: "1 – 1", series };
const campaign = (): Campaign => ({ ...createCampaign(DEFAULT_SETTINGS), week: 9, results: [structuredClone(result)],
  scrims: { research: {}, sessions: [{ id: "practice", opponentId: "away", opponent: "Away", at: "2011-07-20T12:00:00Z",
    bestOf: 2, focus: "lanes", source: "manager", status: "complete", seed: 1, series: structuredClone(series) }] } });

test("club history indexes each map once with explicit practice and tournament association", () => {
  const c = campaign(), before = JSON.stringify(c);
  const rows = campaignMatchHistory(c);
  assert.equal(rows.length, 4);
  assert.equal(new Set(rows.map(r => r.key)).size, 4);
  const tournament = rows.filter(r => r.kind === "tournament"), practice = rows.filter(r => r.kind === "practice");
  assert.ok(tournament.every(r => r.event === "Founders Open"));
  assert.ok(practice.every(r => r.event === "Private practice · no tournament"));
  assert.deepEqual(new Set(tournament.map(r => r.outcome)), new Set(["W", "L"]));
  assert.ok(practice.every(r => r.result.playedAt === c.scrims!.sessions[0].at));
  assert.equal(JSON.stringify(c), before);
  assert.equal(playerPerformance(c, "real-fly").length, 2, "practice does not enter career stats");
});

test("player history uses exact saved participants across sides and later transfers", () => {
  const c = campaign(); c.roster = [];
  const rows = campaignMatchHistory(c, "real-fly.");
  assert.equal(rows.length, 4);
  assert.ok(rows.every(r => r.perspective === 1 && r.team === "Away" && r.opponent === "Home"));
  assert.ok(rows.every(r => r.player?.id === "real-fly."));
  assert.equal(campaignMatchHistory(c, "fly").length, 0);
  assert.equal(campaignMatchHistory(c, "unrecorded").length, 0);
});

test("unplayed practice, skipped results, future weeks and placement summaries do not invent appearances", () => {
  const c = campaign();
  c.scrims!.sessions.push({ ...c.scrims!.sessions[0], id: "scheduled", status: "scheduled", series: undefined });
  c.results.push({ ...result, eventId: "skip", skipped: true }, { ...result, eventId: "future", week: 12 }, { ...result, eventId: "placement", tournamentId: "ti" });
  assert.equal(campaignMatchHistory(c).length, 4);
});

test("old summaries stay readable without invented maps, hero identities or breakdowns", () => {
  const c = campaign(); c.scrims = undefined;
  c.results = [{ ...result, series: undefined }];
  const rows = campaignMatchHistory(c);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].game, null);
  assert.equal(rows[0].duration, undefined);
  assert.equal(rows[0].result.series, undefined);
  assert.equal(campaignMatchHistory(c, "real-fly").length, 0);
});

test("reloaded tournament maps retain their event, actual date and managed-first side order", () => {
  const event = historicalTournaments.find(e => e.year === 2011 && e.kind === "ti")!;
  let c = enterHistoricalTournament(enableHistoricalCalendar(createCampaign(DEFAULT_SETTINGS)), event.id, 42);
  const run = c.calendar!.runs[0], fixture = nextTournamentFixture(run)!;
  run.managed = fixtureTeams(run, fixture)![1];
  const summary = simulateSeries({ ...tournamentBattleConfig(c, run, fixture), captureReplay: false }).summary;
  c = settleTournamentMatch(c, event.id, fixture.id, summary);
  c = JSON.parse(JSON.stringify(c));
  const rows = campaignMatchHistory(c);
  assert.equal(rows.length, summary.games.length);
  assert.ok(rows.every(r => r.event === event.name && r.kind === "tournament" && r.perspective === 0));
  assert.ok(rows.every(r => r.result.series?.teams[0] === summary.teams[0]));
  assert.equal(rows[0].result.playedAt, c.calendar!.runs[0].matches[0].at);
  c.results.push({ ...result, tournamentId: event.id });
  assert.equal(campaignMatchHistory(c).length, rows.length);
});

test("exhibitions are separate and pruned bot archives retain only their real series summaries", () => {
  const c = campaign(); c.results = []; c.scrims = undefined;
  c.botChallenges = { attempts: [{ id: "old", at: "2019-05-01", patchId: "2019.1", bestOf: 1, score: [0, 1], won: false },
    { id: "recent", at: "2019-05-02", patchId: "2019.1", bestOf: 3, score: [1, 1], won: false, series }] };
  const rows = campaignMatchHistory(c);
  assert.equal(rows.length, 3);
  assert.ok(rows.every(r => r.kind === "exhibition"));
  assert.equal(rows.filter(r => r.game === null).length, 1);
  assert.equal(campaignMatchHistory(c, "real-fly").length, 2);
});
