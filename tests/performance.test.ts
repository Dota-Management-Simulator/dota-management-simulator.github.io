import { test } from "node:test";
import assert from "node:assert/strict";
import { LaneBattle, simulateBestOfThree, simulateSeries } from "../src/battle";
import type { GameSummary, PlayerScore, SeriesSummary } from "../src/battle";
import { buildBattleConfig, createCampaign, DEFAULT_SETTINGS, events, prepareEvent, settleEvent } from "../src/game";
import type { Campaign, Result } from "../src/game";
import { enableHistoricalCalendar, enterHistoricalTournament, tournamentBattleConfig } from "../src/historical-game";
import { historicalTournaments, nextTournamentFixture, recordTournamentSeries } from "../src/tournaments";
import { performanceGroups, performanceRating, playerPerformance, summarizePerformance } from "../src/performance";

const player = (changes: Partial<PlayerScore> = {}): PlayerScore => ({ id: "real-fly", player: "Fly", heroId: "axe", hero: "Axe", team: 0, role: 0,
  level: 10, kills: 4, deaths: 0, assists: 2, gold: 1600, xp: 2000, lastHits: 50, ...changes });
const game = (p: PlayerScore, changes: Partial<GameSummary> = {}): GameSummary => ({ winner: 0, duration: 600,
  kills: [6, 3], towers: [2, 1], players: [p, player({ id: "real-fly.", player: "Fly", team: 1, kills: 1, deaths: 3, assists: 1 })], timeline: [],
  overtime: false, ancientHealth: [2000, 0], ...changes });
const series = (games: GameSummary[]): SeriesSummary => ({ engine: "lane-siege-v1", seed: 42, teams: ["Home", "Away"], winner: 0, score: [2, 0], games });
const result = (s?: SeriesSummary, changes: Partial<Result> = {}): Result => ({ eventId: "open", event: "Founders Open", year: 2011, week: 3, won: true,
  prize: 8000, points: 25, opponent: "Away", score: "2 – 0", ...(s ? { series: s } : {}), ...changes });
const campaign = (...results: Result[]): Campaign => ({ ...createCampaign(DEFAULT_SETTINGS), results });

test("career stats use exact identities on both sides, survive transfers, and do not invent archived maps", () => {
  const c = campaign(result(series([game(player())])), result(), result(series([game(player())]), { eventId: "skip", skipped: true }));
  c.roster = c.roster.filter(id => id !== "real-fly");
  assert.equal(playerPerformance(c, "real-fly").length, 1);
  const opponent = playerPerformance(c, "real-fly.")[0];
  assert.equal(opponent.won, false);
  assert.equal(opponent.team, "Away");
  assert.equal(opponent.opponent, "Home");
  assert.equal(playerPerformance(c, "not-recorded").length, 0);
  assert.equal(playerPerformance(c, "real-fly")[0].score.id, "real-fly");
});

test("resource rates are duration-weighted, starting gold is excluded, and zero-death KDA stays finite", () => {
  const rows = playerPerformance(campaign(result(series([game(player()), game(player({ kills: 6, assists: 3, gold: 9600, xp: 10000, lastHits: 150 }), { duration: 1800 })]))), "real-fly");
  const s = summarizePerformance(rows);
  assert.equal(s.gpm, 250);
  assert.equal(s.xpm, 300);
  assert.equal(s.kda, 15);
  assert.equal(s.lastHitsPerMinute, 5);
  assert.equal(s.kills, 5);
  assert.equal(s.participation, 100, "participation is capped per map");
  assert.ok(Object.values(summarizePerformance([])).filter(v => typeof v === "number").every(Number.isFinite));
});

test("partial telemetry reports its own sample, preserving measured zero and unknown legacy stats", () => {
  const rows = playerPerformance(campaign(result(series([
    game(player()), game(player({ heroDamage: 0, buildingDamage: 500, healing: 100, laneOutcome: "draw" }), { duration: 1200 }),
    game(player({ heroDamage: 6000, buildingDamage: 0, healing: 0, laneOutcome: "win" }), { duration: 600 }),
  ]))), "real-fly");
  const s = summarizePerformance(rows);
  assert.equal(s.heroDamage.games, 2);
  assert.equal(s.heroDamage.average, 3000);
  assert.equal(s.heroDamage.perMinute, 200);
  assert.equal(s.buildingDamage.average, 250);
  assert.equal(s.healing.average, 50);
  assert.equal(s.laneGames, 2);
  assert.equal(s.laneWinRate, 50);
  assert.equal(s.laneDraws, 1);
  const legacy = summarizePerformance(rows.filter(r => r.score.heroDamage == null));
  assert.equal(legacy.heroDamage.average, null);
  assert.equal(legacy.heroDamage.perMinute, null);
  assert.equal(legacy.laneWinRate, null);
});

test("event and hero grouping spans seasons without merging repeated events or distinct hero IDs", () => {
  const c = campaign(result(series([game(player()), game(player({ heroId: "chen", hero: "Chen" }))])),
    result(series([game(player())]), { year: 2012 }), result(series([game(player())])));
  const rows = playerPerformance(c, "real-fly");
  assert.equal(rows.length, 3, "duplicate event records do not duplicate maps");
  assert.equal(rows[0].year, 2012);
  const events = performanceGroups(rows, "eventKey");
  assert.equal(events.length, 2);
  assert.deepEqual(events.map(e => e.summary.games), [1, 2]);
  const heroes = performanceGroups(rows, "heroId");
  assert.equal(heroes.find(h => h.key === "axe")!.summary.games, 2);
  assert.equal(heroes.find(h => h.key === "chen")!.summary.games, 1);
});

test("in-progress dated runs use archived series orientation, count BO2 maps and exclude default wins", () => {
  const event = historicalTournaments.find(e => e.source.endsWith("/The_International/2011"))!;
  const c = enterHistoricalTournament(enableHistoricalCalendar(createCampaign(DEFAULT_SETTINGS)), event.id, 42);
  const run = c.calendar!.runs[0];
  const maps = [game(player()), game(player(), { winner: 1 })];
  const s = { ...series(maps), winner: null, bestOf: 2, score: [1, 1] as [number, number], advantage: [1, 0] as [number, number] };
  run.matches = [{ id: "fixture-1", teams: ["away", run.managed], score: [1, 1], winner: null, at: "2011-08-17", series: s },
    { id: "ai-only", teams: ["other", "away"], score: [1, 0], winner: 0, at: "2011-08-17" }];
  // A placement/result reference with a copied series must not add the maps twice.
  c.results = [result(s, { tournamentId: event.id, eventId: event.id })];
  const before = JSON.stringify(c);
  const rows = playerPerformance(c, "real-fly");
  assert.equal(rows.length, 2);
  assert.equal(summarizePerformance(rows).winRate, 50);
  assert.equal(rows[0].team, "Home", "stored series sides are authoritative rather than bracket order");
  assert.equal(performanceGroups(rows, "eventKey").length, 1);
  assert.equal(JSON.stringify(c), before, "reading performance never mutates the campaign");
  assert.deepEqual(playerPerformance(JSON.parse(JSON.stringify(c)), "real-fly"), rows);
});

test("performance rating rewards actual relative play, uses saved roles and remains separate from attributes", () => {
  const p = player(); const g = game(p);
  const score = performanceRating(p, g);
  assert.ok(score > performanceRating({ ...p, kills: 0, assists: 0, deaths: 10 }, g));
  assert.ok(score >= 1 && score <= 10);
  const symmetric = game(player({ kills: 0, assists: 0, deaths: 0, gold: 600, xp: 0 }), { kills: [0, 0], players: [player({ kills: 0, assists: 0, deaths: 0, gold: 600, xp: 0 }), player({ team: 1, id: "rival", kills: 0, assists: 0, deaths: 0, gold: 600, xp: 0 })] });
  assert.equal(performanceRating(symmetric.players[0], symmetric), 6.4);
  assert.equal(performanceRating(symmetric.players[1], symmetric), 5.6);
});

test("AI tournament games retain compact career stats without timelines and cannot be counted twice", () => {
  const event = historicalTournaments.find(e => e.source.endsWith("/The_International/2011"))!;
  const c = enterHistoricalTournament(enableHistoricalCalendar(createCampaign(DEFAULT_SETTINGS)), event.id, 42);
  const run = c.calendar!.runs[0];
  run.managed = "not-in-this-fixture";
  const fixture = nextTournamentFixture(run)!;
  const played = simulateSeries({ ...tournamentBattleConfig(c, run, fixture, false), captureReplay: false }).summary;
  const updated = recordTournamentSeries(run, fixture.id, played);
  const saved = updated.matches[0];
  assert.equal(saved.series, undefined);
  assert.ok(saved.performance);
  assert.equal(saved.performance.games.length, played.games.length);
  for (const g of saved.performance.games) {
    assert.deepEqual(Object.keys(g).sort(), ["draft", "duration", "kills", "players", "winner"]);
    assert.ok(!("timeline" in g));
    assert.ok(!("frames" in g));
  }
  c.calendar!.runs[0] = updated;
  const id = played.games[0].players[0].id;
  const rows = playerPerformance(c, id);
  assert.equal(rows.length, played.games.length);
  assert.equal(rows[0].score.heroDamage, played.games.at(-1)!.players[0].heroDamage);
  assert.equal(recordTournamentSeries(updated, fixture.id, played), updated);
  assert.deepEqual(playerPerformance(JSON.parse(JSON.stringify(c)), id), rows);
});

const config = buildBattleConfig(prepareEvent(createCampaign(DEFAULT_SETTINGS), events[0]), events[0], 42);
type BattleUnit = LaneBattle["units"][number];
type CombatAccess = { damage: (source: BattleUnit, target: BattleUnit, value: number) => void; cast: (source: BattleUnit, target: BattleUnit) => void };

test("engine counts effective hero/building damage without overkill and excludes creep attacks", () => {
  const b = new LaneBattle(config);
  const combat = b as unknown as CombatAccess;
  const source = b.units.find(u => u.kind === "hero" && u.team === 0)!;
  const target = b.units.find(u => u.kind === "hero" && u.team === 1)!;
  target.hp = 30;
  combat.damage(source, target, 100);
  assert.equal(source.heroDamage, 30);
  combat.damage(source, target, 100);
  assert.equal(source.heroDamage, 30, "dead targets add no damage");
  const tower = b.units.find(u => u.kind === "tower" && u.team === 1)!;
  tower.hp = 50;
  combat.damage(source, tower, 999);
  assert.equal(source.buildingDamage, 50);
  const creep = { ...source, kind: "creep" as const };
  const victim = b.units.find(u => u.kind === "hero" && u.team === 1 && !u.dead)!;
  combat.damage(creep, victim, 50);
  assert.equal(source.heroDamage, 30);
});

test("healing records restored health only and lane snapshots are taken once at ten match minutes", () => {
  const b = new LaneBattle(config);
  const source = b.units.find(u => u.kind === "hero" && u.team === 0)!;
  source.hero = { ...source.hero!, ability: "heal" };
  source.hp = source.max - 25;
  (b as unknown as CombatAccess).cast(source, source);
  assert.equal(source.healing, 25);
  (b as unknown as CombatAccess).cast(source, source);
  assert.equal(source.healing, 25, "overhealing adds nothing");
  assert.ok(b.units.filter(u => u.kind === "hero").every(u => u.laneOutcome == null));
  for (const u of b.units.filter(u => u.kind === "hero")) { u.gold = u.team === 0 ? 3000 : 1000; u.totalXp = 0; }
  b.time = 99.9;
  b.step();
  const heroes = b.units.filter(u => u.kind === "hero");
  assert.ok(heroes.every(u => u.laneOutcome === (u.team === 0 ? "win" : "loss")));
  for (const u of heroes) u.gold = u.team === 0 ? 1000 : 30000;
  b.step();
  assert.ok(heroes.every(u => u.laneOutcome === (u.team === 0 ? "win" : "loss")), "later resources never rewrite the lane result");
});

test("real played series persist measured stats without replays, and duplicate settlement never grows careers", () => {
  const c = createCampaign(DEFAULT_SETTINGS);
  const played = simulateBestOfThree({ ...config, captureReplay: false });
  const settled = settleEvent(c, events[0], played.summary);
  const id = c.roster[0];
  const rows = playerPerformance(settled, id);
  assert.equal(rows.length, played.summary.games.length);
  for (const g of played.summary.games) for (const p of g.players) {
    assert.ok([p.heroDamage, p.buildingDamage, p.healing].every(n => Number.isInteger(n) && n! >= 0));
    if (g.duration >= 600) assert.ok(p.laneOutcome);
    else assert.equal(p.laneOutcome, undefined);
  }
  assert.ok(played.summary.games.some(g => g.players.some(p => p.heroDamage! > 0)));
  assert.ok(played.frames.every(frames => !frames.length));
  assert.deepEqual(playerPerformance(JSON.parse(JSON.stringify(settled)), id), rows);
  assert.deepEqual(playerPerformance(settleEvent(settled, events[0], played.summary), id), rows);
});
