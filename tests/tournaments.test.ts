import { test } from "node:test";
import assert from "node:assert/strict";
import { advanceCalendarTo, advanceWeek, buildBattleConfig, createCampaign, DEFAULT_SETTINGS, events, negotiateContract, recruitmentBlocker, signPlayer, weeklyWages } from "../src/game";
import { commitTournamentRun, earnedInvitations, enableHistoricalCalendar, enterHistoricalTournament, qualifiedForTournament, settleTournamentMatch, tournamentBattleConfig, tournamentEntryBlocker } from "../src/historical-game";
import { fixtureTeams, groupStandings, historicalTournaments, nextTournamentFixture, recordTournamentSeries, seededTournamentFixtures, tournamentOpponentCondition, tournamentForRun } from "../src/tournaments";
import { campaignWeek, initialOffer, weeklyPractice } from "../src/contracts";
import { seededRandom, simulateSeries } from "../src/battle";
import type { GameSummary, SeriesSummary } from "../src/battle";
import type { HistoricalTournament, TournamentFixture, TournamentRun } from "../src/tournament-types";
import { simulateOtherTournamentMatches } from "../src/tournament.worker";

const ti1 = historicalTournaments.find(e => e.source.endsWith("/The_International/2011"))!;
function modelRun(event: HistoricalTournament, seed: number): TournamentRun {
  return { eventId: event.id, seed, managed: event.teams[0], teams: event.teams.map(id => ({ id, name: event.teamNames[id], roster: [] })), lineup: [], prizeShares: {}, matches: [], fixtures: seededTournamentFixtures(event, seed), groupOrder: {}, state: "playing", placements: [] };
}
// A topology test supplies synthetic legal map results. Actual gameplay always
// calls LaneBattle; this helper does not form part of the game's outcome path.
function modelSeries(run: TournamentRun, f: TournamentFixture, random: () => number): SeriesSummary {
  const keys = fixtureTeams(run, f)!;
  const score: [number, number] = [...f.advantage ?? [0, 0]];
  const games: GameSummary[] = [];
  while (f.bestOf === 2 ? games.length < 2 : Math.max(...score) < Math.floor(f.bestOf / 2) + 1) {
    const winner = random() < 0.5 ? 0 : 1;
    score[winner]++;
    games.push({ winner, duration: 1200, players: [], timeline: [], kills: [0, 0], towers: [0, 0], ancientHealth: winner === 0 ? [1, 0] : [0, 1], overtime: false });
  }
  return { engine: "lane-siege-v1", seed: run.seed, teams: keys.map(k => run.teams.find(t => t.id === k)!.name) as [string, string], score, winner: score[0] === score[1] ? null : score[0] > score[1] ? 0 : 1, games, bestOf: f.bestOf };
}

test("TI1 has its full field, round-robin groups, mixed playoff lengths, final advantage and actual placement prizes", () => {
  assert.equal(ti1.status, "ready");
  assert.equal(ti1.teams.length, 16);
  assert.deepEqual(ti1.groups.map(g => g.teams.length), [4, 4, 4, 4]);
  assert.equal(ti1.fixtures.filter(f => f.group).length, 24);
  assert.equal(ti1.fixtures.filter(f => !f.group).length, 22);
  assert.equal(ti1.pool, 1600000);
  assert.equal(ti1.prizes.find(p => p.from === 1)!.usd, 1000000);
  assert.equal(ti1.prizes.find(p => p.from === 2)!.usd, 250000);
  assert.deepEqual(ti1.fixtures.at(-1)!.advantage, [1, 0]);
  assert.ok(ti1.fixtures.filter(f => f.group).every(f => f.bestOf === 1));
  assert.equal(ti1.fixtures.filter(f => !f.group && f.bestOf === 1).length, 18);
  assert.deepEqual(ti1.fixtures.filter(f => !f.group && f.bestOf === 3).map(f => f.label), ["Upper Bracket Final (Bo3)", "Lower Bracket R5 (Bo3)", "Lower Bracket Final (Bo3)"]);
  assert.equal(ti1.fixtures.at(-1)!.bestOf, 5);
  assert.equal(ti1.fixtures.filter(f => f.label === "Lower Bracket R2 (Bo1)").length, 4);
  assert.equal(ti1.fixtures.filter(f => f.label === "Lower Bracket R4 (Bo1)").length, 2);
});

test("Valve's reviewed TI graphs include every group pair, exact series formats, era identities and reconciled allocation", () => {
  for (const [year, field, pairs, pool, first, invites] of [[2018, 18, 72, 25532177, 11234158, 8], [2019, 18, 72, 34330068, 15620181, 12], [2021, 18, 72, 40018195, 18208279, 12], [2022, 20, 90, 18930775, 8518849, 12]]) {
    const event = historicalTournaments.find(e => e.kind === "ti" && e.year === year)!;
    assert.equal(event.status, "ready");
    assert.equal(event.teams.length, field);
    assert.equal(event.fixtures.filter(f => f.group).length, pairs);
    assert.equal(event.fixtures.filter(f => !f.group).length, 22);
    assert.ok(event.fixtures.every(f => f.timeVerified && f.dateVerified));
    assert.ok(event.fixtures.filter(f => f.group).every(f => f.bestOf === 2));
    assert.equal(event.fixtures.filter(f => !f.group && f.bestOf === 1).length, 4);
    assert.equal(event.fixtures.filter(f => !f.group && f.bestOf === 5).length, 1);
    assert.equal(event.fixtures.find(f => f.bestOf === 5)!.advantage, undefined);
    assert.equal(event.invited.length, invites);
    assert.equal(event.pool, pool);
    assert.equal(event.prizes.find(p => p.from === 1)!.usd, first);
    assert.ok(Math.abs(event.prizes.reduce((n, p) => n + p.usd * (p.to - p.from + 1), 0) - pool) < field / 2);
    assert.ok(!Object.values(event.teamNames).some(name => /Shopify|Ascent|Neptune|Steam club/.test(name)));
    const two = event.groups[1].teams.map(slot => "team" in slot ? event.teamNames[slot.team] : "");
    if (year === 2022) assert.ok(two.indexOf("Fnatic") < two.indexOf("Team Spirit"));
  }
  const unreviewed = historicalTournaments.filter(e => e.source.includes("www.dota2.com/webapi"));
  assert.ok(unreviewed.length > 100, "first-party dates/stages/pools are available for continued research");
  assert.ok(unreviewed.every(e => e.status === "needs-review"), "mutable Steam team names never create assumed playable historical fields");
  for (let year = 2021; year <= 2026; year++) assert.equal(historicalTournaments.filter(e => e.kind === "ti" && e.year === year).length, 1, "primary sources must not duplicate a TI");
});

test("TI2011–2019 retain complete main fields, TI2014's gauntlets, and TI2017's separately awarded All-Star money", () => {
  for (let year = 2011; year <= 2019; year++) {
    const event = historicalTournaments.find(e => e.kind === "ti" && e.year === year)!;
    assert.equal(event.status, "ready", `TI${year} has its main field and stages`);
  }
  const main = historicalTournaments.find(e => e.kind === "ti" && e.year === 2014)!;
  assert.equal(main.teams.length, 16);
  assert.equal(main.groups.length, 1);
  assert.equal(main.fixtures.filter(f => f.group && f.bestOf === 1).length, 120);
  assert.equal(main.fixtures.filter(f => !f.group).length, 16);
  assert.equal(main.start, "2014-07-09");
  const wildcard = historicalTournaments.find(e => e.source.endsWith("/The_International/2014/Phase_One"))!;
  assert.equal(wildcard.parent, main.id);
  assert.equal(wildcard.fixtures.length, 3);
  assert.ok(wildcard.fixtures.every(f => f.bestOf === 3));
  assert.equal(wildcard.pool, 0);
  assert.equal(wildcard.status, "needs-review", "unknown regional entry links do not turn the wildcard into an open event");
  const ti7 = historicalTournaments.find(e => e.kind === "ti" && e.year === 2017)!;
  assert.equal(ti7.pool, 24687916);
  assert.equal(ti7.prizes.find(p => p.from === 1)!.usd, 10862683);
  assert.match(ti7.poolNote!, /All-Star/);
});

test("a club with a main-event invitation cannot consume another regional qualifying place", () => {
  const qualifier = historicalTournaments.find(e => e.source.endsWith("/The_International/2012/West_Qualifiers"))!;
  const c = enableHistoricalCalendar(createCampaign({ ...DEFAULT_SETTINGS, year: 2012 }));
  c.calendar!.now = qualifier.start;
  const id = c.world!.replacedTeamId ?? c.world!.managedTeamId;
  c.calendar!.invitations[qualifier.parent!] = [id];
  assert.ok(!earnedInvitations(c, qualifier).includes(id));
  c.calendar!.invitations[qualifier.id] = [id];
  assert.match(tournamentEntryBlocker(c, qualifier)!, /already has a place/);
});

test("other-team series respect a dated batch limit and advance payroll once instead of revealing a future bracket on an old club date", () => {
  const c = enterHistoricalTournament(enableHistoricalCalendar(createCampaign(DEFAULT_SETTINGS)), ti1.id, 123);
  const run = structuredClone(c.calendar!.runs[0]);
  const ai = run.teams.filter(team => team.id !== run.managed).slice(0, 2);
  run.fixtures = ["2011-08-24T10:00:00Z", "2011-08-31T10:00:00Z"].map((at, i) => ({ id: `dated-ai-${i}`, stage: "Test stage", label: "BO1", at, bestOf: 1, timeVerified: true, slots: [{ team: ai[0].id }, { team: ai[1].id }] }));
  run.fixtures.push({ id: "managed-next", stage: "Test stage", label: "BO1", at: "2011-09-02T10:00:00Z", bestOf: 1, timeVerified: true, slots: [{ team: run.managed }, { team: ai[0].id }] });
  c.calendar!.runs[0] = run;
  const config = buildBattleConfig(c, events[0], 123);
  const templates = Object.fromEntries(ai.map((team, i) => [team.id, { name: team.name, players: config.players[i], bonus: 0 }]));
  const input = { run, templates, year: 2011, heroPoolThroughYear: 2010, through: "2011-08-25T00:00:00Z" };
  assert.equal(simulateOtherTournamentMatches({ ...input, through: "2011-08-23T00:00:00Z" }), run);
  const played = simulateOtherTournamentMatches(input);
  assert.equal(played.matches.length, 1);
  const next = commitTournamentRun(c, played);
  assert.ok(Date.parse(next.calendar!.now) > Date.parse("2011-08-24T10:00:00Z"));
  assert.ok(Date.parse(next.calendar!.now) < Date.parse("2011-08-25T00:00:00Z"));
  assert.equal(next.calendar!.paidWeeks, c.calendar!.paidWeeks + 1);
  assert.equal(next.cash, c.cash - weeklyWages(c));
  assert.equal(next.results.length, 0);
  assert.equal(commitTournamentRun(next, played), next);
});

test("TI2024 uses a five-match four-way placement tie and omits dead games in a 2nd–4th tie", () => {
  const original = historicalTournaments.find(e => e.kind === "ti" && e.year === 2024)!;
  assert.equal(original.status, "ready");
  assert.equal(original.fixtures.filter(f => f.group).length, 24);
  assert.equal(original.fixtures.filter(f => !f.group).length, 30, "eight seeding deciders precede the 22-match playoff");
  assert.equal(original.fixtures.filter(f => !f.group && f.bestOf === 1).length, 0);
  assert.equal(original.invited.length, 6);
  const group = original.groups[0];
  const keys = group.teams.map(slot => "team" in slot ? slot.team : "");
  const event = { ...original, id: "ti2024-tie-test", teams: keys, groups: [group], fixtures: original.fixtures.filter(f => f.group === group.id),
    placements: keys.map((_, i) => ({ slot: { group: group.id, rank: i + 1 }, from: i + 1, to: i + 1 })) };
  const createRun = () => { const run = modelRun(event, 42); const { fixtures: _, ...definition } = event; run.definition = definition; return run; };
  const draw = (run: TournamentRun, fixture: TournamentFixture): SeriesSummary => {
    const series = modelSeries(run, fixture, () => 0);
    series.games[1].winner = 1; series.score = [1, 1]; series.winner = null;
    return series;
  };
  let run = createRun();
  while (nextTournamentFixture(run)?.group) { const fixture = nextTournamentFixture(run)!; run = recordTournamentSeries(run, fixture.id, draw(run, fixture)); }
  assert.equal(run.fixtures.filter(f => !f.group).length, 5);
  while (run.state === "playing") { const fixture = nextTournamentFixture(run)!; run = recordTournamentSeries(run, fixture.id, modelSeries(run, fixture, () => 0)); }
  assert.equal(run.matches.length, 11);
  assert.equal(new Set(run.placements.map(p => p.team)).size, 4);

  run = createRun();
  while (nextTournamentFixture(run)?.group) {
    const fixture = nextTournamentFixture(run)!;
    const opponents = fixtureTeams(run, fixture)!;
    const side = opponents.indexOf(keys[0]);
    run = recordTournamentSeries(run, fixture.id, side < 0 ? draw(run, fixture) : modelSeries(run, fixture, () => side === 0 ? 0 : 0.99));
  }
  assert.equal(run.fixtures.filter(f => !f.group).length, 3);
  for (let i = 0; i < 2; i++) { const fixture = nextTournamentFixture(run)!; run = recordTournamentSeries(run, fixture.id, modelSeries(run, fixture, () => 0)); }
  assert.equal(run.state, "complete");
  assert.equal(run.fixtures.filter(f => !f.group).length, 2, "no match is played solely to separate the tied third/fourth teams");
  assert.equal(run.matches.length, 8);
});

test("every playable sourced tournament resolves alternate outcomes into a complete, unique placement field", () => {
  for (const event of historicalTournaments.filter(e => e.status === "ready")) {
    for (let seed = 1; seed <= 8; seed++) {
      let run = modelRun(event, seed);
      const random = seededRandom(seed);
      for (let count = 0; run.state === "playing" && count < 2000; count++) {
        const fixture = nextTournamentFixture(run);
        assert.ok(fixture, `${event.name}: unresolved advancement`);
        assert.equal(new Set(fixtureTeams(run, fixture)!).size, 2, `${event.name}: team plays itself`);
        run = recordTournamentSeries(run, fixture.id, modelSeries(run, fixture, random));
      }
      assert.equal(run.state, "complete", event.name);
      assert.equal(new Set(run.placements.map(p => p.team)).size, event.teams.length, event.name);
      assert.equal(run.placements.filter(p => p.from === 1).length, 1, event.name);
    }
  }
});

test("all ready events have complete round-robin pairs, legal formats, reconciled prizes and chronological dependencies", () => {
  for (const event of historicalTournaments.filter(e => e.status === "ready")) {
    assert.equal(event.limitations.length, 0, event.name);
    assert.equal(event.placements.length, event.teams.length, event.name);
    assert.ok(Math.abs(event.prizes.reduce((sum, p) => sum + p.usd * (p.to - p.from + 1), 0) - event.pool) <= Math.max(1, event.teams.length * 0.51), event.name);
    const fixtureById = new Map(event.fixtures.map(f => [f.id, f]));
    assert.equal(fixtureById.size, event.fixtures.length, event.name);
    for (const fixture of event.fixtures) {
      assert.ok([1, 2, 3, 5, 7].includes(fixture.bestOf), event.name);
      assert.ok((fixture.advantage ?? [0, 0]).every(n => n >= 0 && Number.isInteger(n) && n < Math.floor(fixture.bestOf / 2) + 1), event.name);
      if (fixture.bestOf === 2) assert.ok(!fixture.advantage?.some(Boolean), event.name);
      for (const slot of fixture.slots) if ("match" in slot) {
        assert.ok(fixtureById.has(slot.match), event.name);
        assert.ok(fixtureById.get(slot.match)!.at.slice(0, 10) <= fixture.at.slice(0, 10), `${event.name}: dependency dates`);
      }
    }
    for (const group of event.groups) {
      assert.equal(group.mode, "round-robin", event.name);
      const pairs = new Map<string, number>();
      const slotKey = (slot: typeof group.teams[number]) => JSON.stringify(slot);
      for (const fixture of event.fixtures.filter(f => f.group === group.id)) {
        assert.equal(fixture.bestOf, group.games, event.name);
        const key = fixture.slots.map(slotKey).sort().join("|");
        assert.notEqual(slotKey(fixture.slots[0]), slotKey(fixture.slots[1]), event.name);
        pairs.set(key, (pairs.get(key) ?? 0) + 1);
      }
      assert.equal(pairs.size, group.teams.length * (group.teams.length - 1) / 2, event.name);
      assert.ok([...pairs.values()].every(count => count === group.legs), event.name);
    }
  }
});

test("regular groups cannot inherit qualifier or tiebreak lengths, and default wins remain separate from maps", () => {
  for (const name of ["GosuLeague Season 1", "The Defense Season 4", "DreamLeague Season 4"])
    assert.ok(historicalTournaments.find(e => e.name === name)!.groups.every(g => g.games === 2), name);
  assert.ok(historicalTournaments.find(e => e.name === "EPICENTER 2017")!.groups.every(g => g.games === 3));
  for (const name of ["GosuLeague Season 1", "GosuLeague Season 4 Divison 1", "GosuLeague Season 5 Division 1"])
    assert.equal(historicalTournaments.find(e => e.name === name)!.groups[0].tieBreak!.twoTeamBestOf, 3, name);
  const kickoff = historicalTournaments.find(e => e.name === "DreamLeague Kick-Off Season")!;
  assert.equal(kickoff.groups[0].games, 1);
  assert.equal(kickoff.groups[0].legs, 2);
  assert.equal(kickoff.fixtures.filter(f => f.group).length, 30);
  for (const name of ["StarLadder StarSeries Season 4", "Electronic Sports Prime Shock Therapy Cup", "ECL 2014 Spring"])
    assert.deepEqual(historicalTournaments.find(e => e.name === name)!.fixtures.at(-1)!.advantage, [1, 0], name);
});

test("unverified group schedules and unsupported formats cannot be entered while old registered rules stay pinned", () => {
  const c = enableHistoricalCalendar(createCampaign(DEFAULT_SETTINGS));
  for (const name of ["The Premier League Season 2", "The Summit 3", "MLG World Finals", "The Shanghai Major 2016", "DOTA Summit 8", "DreamLeague Kick-Off Season", "Armaggeddon Dota 2 Grand Slam Asia 2013"]) {
    const event = historicalTournaments.find(e => e.name === name)!;
    assert.equal(event.status, "needs-review", name);
    assert.match(tournamentEntryBlocker(c, event)!, /verification pending/, name);
    assert.throws(() => enterHistoricalTournament(c, event.id), /verification pending/, name);
  }
  const registered = enterHistoricalTournament(c, ti1.id, 123).calendar!.runs[0];
  const original = JSON.stringify(registered);
  const restored = JSON.parse(original) as TournamentRun;
  assert.equal(tournamentForRun(restored)!.fixtures.length, registered.fixtures.length);
  assert.equal(JSON.stringify(restored), original, "catalog reads never migrate registered results or rules");
});

test("real weeks pay once across dates and year boundaries; legacy campaigns retain their original clock", () => {
  const legacy = createCampaign(DEFAULT_SETTINGS);
  const c = enableHistoricalCalendar(legacy);
  assert.equal(c.calendar!.now, "2011-07-17T00:00:00Z");
  assert.equal(campaignWeek(c), campaignWeek(legacy));
  const sixDays = advanceCalendarTo(c, "2011-07-23T23:59:59Z");
  assert.equal(sixDays.cash, c.cash);
  const week = advanceWeek(c);
  assert.equal(week.cash, c.cash - weeklyWages(c));
  assert.equal(campaignWeek(week), campaignWeek(c) + 1);
  assert.equal(advanceCalendarTo(week, week.calendar!.now), week);
  let yearEnd = enableHistoricalCalendar(createCampaign({ ...DEFAULT_SETTINGS, year: 2012 }));
  yearEnd = advanceCalendarTo(yearEnd, "2012-12-28T00:00:00Z");
  const next = advanceWeek(yearEnd);
  assert.equal(next.year, 2013);
  assert.equal(campaignWeek(next), campaignWeek(yearEnd) + 1);
  assert.equal(advanceWeek({ ...legacy, week: 18 }).year, 2012);
});

test("registered players finish the tournament after expiry; transfers, duplicate settlement, and prize-share changes cannot bypass it", () => {
  let c = enableHistoricalCalendar(createCampaign(DEFAULT_SETTINGS));
  const id = c.roster[0];
  const player = c.players.find(p => p.id === id)!;
  c = negotiateContract(c, id, { ...initialOffer(c, player), wage: player.wage * 2, prizeShare: 10 }).campaign;
  c = enterHistoricalTournament(c, ti1.id, 42);
  const original = c.calendar!.runs[0];
  const recruit = c.players.find(p => !c.roster.includes(p.id) && p.role === player.role)!;
  assert.match(recruitmentBlocker(c, recruit.id)!, /finish/);
  assert.equal(signPlayer(c, recruit.id), c);
  assert.equal(advanceWeek(c), c, "advancing cannot skip registered games");
  c.contracts![id].expiresAt = campaignWeek(c);
  const expiredMood = weeklyPractice(c, c.players.find(p => p.id === id)!, "Balanced").happiness;
  const withoutRun = structuredClone(c); withoutRun.calendar!.runs = [];
  assert.equal(weeklyPractice(withoutRun, withoutRun.players.find(p => p.id === id)!, "Balanced").happiness, expiredMood - 2);
  c.contracts![id].prizeShare = 0;
  let run = original;
  const random = seededRandom(100);
  while (run.state === "playing") { const f = nextTournamentFixture(run)!; run = recordTournamentSeries(run, f.id, modelSeries(run, f, random)); }
  const settled = commitTournamentRun(c, run);
  const prize = run.placements.find(p => p.team === run.managed)!.prize;
  assert.equal(settled.cash, c.cash + prize - Math.floor(prize * 0.1) - (settled.calendar!.paidWeeks - c.calendar!.paidWeeks) * weeklyWages(c));
  assert.equal(commitTournamentRun(settled, run), settled);
  assert.equal(settled.results.length, 1);
  assert.equal(settled.results[0].tournamentId, ti1.id);
  assert.deepEqual(JSON.parse(JSON.stringify(settled)).calendar.runs[0].matches, settled.calendar!.runs[0].matches);
});

test("BO1, fixed two-map groups, and BO5 with a default win all use actual lane-engine map results", () => {
  const c = createCampaign(DEFAULT_SETTINGS);
  const base = buildBattleConfig(c, events[0], 1234);
  for (const format of [{ bestOf: 1 as const }, { bestOf: 2 as const }, { bestOf: 5 as const, advantage: [1, 0] as [number, number] }]) {
    const result = simulateSeries({ ...base, seriesFormat: format, captureReplay: false });
    const actual = [0, 1].map(side => result.summary.games.filter(g => g.winner === side).length + (format.advantage?.[side] ?? 0));
    assert.deepEqual(result.summary.score, actual);
    assert.ok(result.summary.games.every(g => g.ancientHealth[1 - g.winner] === 0));
    assert.ok(result.frames.every(f => f.length === 0));
    if (format.bestOf === 2) assert.equal(result.summary.games.length, 2);
    else assert.equal(Math.max(...actual), Math.floor(format.bestOf / 2) + 1);
  }
});

test("managed series settlement rejects another fixture's result and cannot settle twice", () => {
  let c = enterHistoricalTournament(enableHistoricalCalendar(createCampaign(DEFAULT_SETTINGS)), ti1.id, 7);
  let run = c.calendar!.runs[0];
  const random = seededRandom(13);
  while (!fixtureTeams(run, nextTournamentFixture(run)!)!.includes(run.managed)) {
    const f = nextTournamentFixture(run)!; run = recordTournamentSeries(run, f.id, modelSeries(run, f, random));
  }
  c = commitTournamentRun(c, run);
  const fixture = nextTournamentFixture(run)!;
  const config = tournamentBattleConfig(c, run, fixture);
  const result = simulateSeries({ ...config, captureReplay: false }).summary;
  assert.throws(() => settleTournamentMatch(c, ti1.id, "wrong-match", result));
  const next = settleTournamentMatch(c, ti1.id, fixture.id, result);
  assert.equal(settleTournamentMatch(next, ti1.id, fixture.id, result), next);
  assert.ok(Date.parse(next.calendar!.now) > Date.parse(c.calendar!.now));
  assert.equal(next.results.length, 0, "a group win never settles a whole event");
});

test("a regional qualifier earns the correct main-event field slot, pays no invented cash, and does not duplicate clubs or players", () => {
  const qualifier = historicalTournaments.find(e => e.source.endsWith("/The_International/2012/West_Qualifiers"))!;
  const main = historicalTournaments.find(e => e.source.endsWith("/The_International/2012"))!;
  assert.equal(qualifier.fixtures.length, 14);
  assert.equal(qualifier.fixtures.at(-1)!.bestOf, 5);
  assert.equal(qualifier.fixtures.at(-1)!.advantage, undefined);
  assert.equal(main.invited.length, 13);
  let c = enableHistoricalCalendar(createCampaign({ ...DEFAULT_SETTINGS, year: 2012 }));
  c.calendar!.now = c.calendar!.origin = "2012-01-01T00:00:00Z"; // Existing qualifier/payroll scenario.
  // Long pre-event gap is a recovery block, avoiding unrelated resignations.
  c.cash = 1000000;
  for (const id of c.roster) c.training[id] = "Rest";
  const club = c.world!.managedTeamId;
  // An organizer-issued invitation is part of the fixture setup; all series
  // below still have to be won before the main-event place is awarded.
  c.calendar!.invitations[qualifier.id] = [...qualifier.invited.slice(1), club];
  c.calendar!.invitations[main.id] = main.invited.filter(id => id !== club);
  assert.match(tournamentEntryBlocker(c, main)!, /qualifying place/);
  c = enterHistoricalTournament(c, qualifier.id, 43);
  assert.equal(qualifiedForTournament(c, main), false);
  const before = c.cash;
  const paidBefore = c.calendar!.paidWeeks;
  const wages = weeklyWages(c);
  let run = c.calendar!.runs[0];
  const random = seededRandom(19);
  while (run.state === "playing") {
    const fixture = nextTournamentFixture(run)!;
    const teams = fixtureTeams(run, fixture)!;
    run = recordTournamentSeries(run, fixture.id, modelSeries(run, fixture, teams.includes(run.managed) ? () => teams[0] === run.managed ? 0 : 1 : random));
  }
  c = commitTournamentRun(c, run);
  assert.equal(c.calendar!.paidWeeks, paidBefore + 1, "the final Sunday crosses a real payroll boundary");
  assert.equal(c.cash, before - wages, "a zero-cash qualifier still incurs the elapsed week's wages");
  assert.equal(c.results[0].prize, 0);
  assert.ok(qualifiedForTournament(c, main));
  c = enterHistoricalTournament(c, main.id, 44);
  const entered = c.calendar!.runs.at(-1)!;
  assert.equal(entered.managed, "mtw", "the Western qualifying place replaces its historical slot, not an invited team");
  const realClubs = entered.teams.flatMap(t => t.clubId ? [t.clubId] : []);
  assert.equal(new Set(realClubs).size, realClubs.length);
  const players = entered.teams.flatMap(t => t.roster);
  assert.equal(new Set(players).size, 80);
  const losing = structuredClone(c);
  losing.calendar!.runs = [structuredClone(run)];
  const placement = losing.calendar!.runs[0].placements.find(p => p.team === run.managed)!;
  placement.from = 2; placement.to = 2;
  assert.equal(qualifiedForTournament(losing, main), false, "losing the final cannot qualify through the winner's award");
});

test("partner research preserves actual formats, default wins, cross-year dates and currency conversions", () => {
  const malaysia = historicalTournaments.find(e => e.name === "Malaysia Invitational")!;
  assert.equal(malaysia.pool, 10000);
  assert.equal(malaysia.groups.length, 0, "the event was double elimination without a group stage");
  assert.ok(malaysia.fixtures.slice(0, -1).every(f => f.bestOf === 1));
  assert.deepEqual(malaysia.fixtures.at(-1)!.advantage, [1, 0]);
  const defense = historicalTournaments.find(e => e.name === "The Defense Season 1")!;
  assert.equal(defense.status, "ready");
  assert.equal(defense.start, "2011-11-15");
  assert.equal(defense.end, "2012-03-04");
  assert.deepEqual(defense.groups.map(g => g.teams.length), [6, 6, 6, 6, 6, 6]);
  assert.equal(defense.fixtures.filter(f => f.group).length, 90);
  assert.equal(defense.teams.length, 24, "sponsor changes during an event must not create extra teams");
  assert.equal(defense.pool, 13196, "EUR 10,000 is not USD 10,000");
  const dreamhack = historicalTournaments.find(e => e.name === "DreamHack Winter 2011")!;
  assert.equal(dreamhack.nativePool?.amount, 100000);
  assert.equal(dreamhack.nativePool?.currency, "SEK");
  assert.equal(dreamhack.pool, 14253, "the archived placement conversions take precedence over an approximate headline conversion");
  for (const event of historicalTournaments.filter(e => e.status === "ready" && /Group Stage|round.robin/i.test(e.format))) {
    assert.ok(event.groups.length || event.fixtures.some(f => /group/i.test(f.stage)), `${event.name}: missing groups must block entry`);
  }
});

test("TI2015 scoring counts 3/1/0 points; a tie across an advancement boundary requires the sourced BO3", () => {
  const ti5 = historicalTournaments.find(e => e.source.endsWith("/The_International/2015"))!;
  assert.deepEqual(ti5.groups[0].scoring, { "2-0": 3, "1-1": 1, "0-2": 0 });
  assert.equal(ti5.fixtures.filter(f => f.group).length, 56);
  const event = structuredClone(ti5);
  event.id = "boundary-test";
  event.teams = ["a", "b", "c", "d"];
  event.teamNames = { a: "A", b: "B", c: "C", d: "D" };
  event.groups = [{ ...ti5.groups[0], id: "g", name: "Test group", teams: event.teams.map(team => ({ team })), tieBreak: { ...ti5.groups[0].tieBreak!, boundaries: [1] } }];
  event.fixtures = [["a", "b"], ["a", "c"], ["a", "d"], ["b", "c"], ["b", "d"], ["c", "d"]].map(([a, b], i) => ({ id: `m${i}`, stage: "Group", label: "BO2", at: "2015-07-27", timeVerified: false, bestOf: 2, group: "g", slots: [{ team: a }, { team: b }] }));
  event.placements = event.teams.map((_, i) => ({ slot: { group: "g", rank: i + 1 }, from: i + 1, to: i + 1 }));
  let run = modelRun(event, 100);
  const { fixtures: _fixtures, ...definition } = event; run.definition = definition;
  while (run.matches.length < 6) {
    const fixture = nextTournamentFixture(run)!;
    const teams = fixtureTeams(run, fixture)!;
    // A beats B head-to-head, but their overall points tie at six.
    const winner = teams.includes("a") && teams.includes("d") ? teams.indexOf("d") : 0;
    run = recordTournamentSeries(run, fixture.id, modelSeries(run, fixture, () => winner));
  }
  assert.equal(groupStandings(run, "g").find(r => r.team === "a")!.points, 6);
  assert.equal(groupStandings(run, "g").find(r => r.team === "b")!.points, 6);
  const tie = nextTournamentFixture(run)!;
  assert.equal(tie.bestOf, 3);
  assert.match(tie.stage, /tiebreaker/);
  const bSide = fixtureTeams(run, tie)!.indexOf("b");
  run = recordTournamentSeries(run, tie.id, modelSeries(run, tie, () => bSide));
  assert.equal(run.placements.find(p => p.from === 1)!.team, "b", "the tiebreaker winner overrides the earlier head-to-head result");
});

test("opponents accumulate fatigue from their actual maps, with stamina, recovery, and default wins handled separately", () => {
  const run = modelRun(ti1, 1);
  const id = run.teams[0].id;
  run.matches = [{ id: "fatigue", teams: [id, run.teams[1].id], score: [3, 1], winner: 0, at: "2011-08-17" }];
  run.fixtures.push({ id: "fatigue", stage: "Final", label: "BO5", at: "2011-08-17", timeVerified: false, bestOf: 5, advantage: [1, 0], slots: [{ team: id }, { team: run.teams[1].id }] });
  const fresh = { energy: 90, happiness: 85, stamina: 80 };
  assert.equal(tournamentOpponentCondition(run, id, fresh, "2011-08-17").energy, 84, "three real maps, not four score points");
  assert.equal(tournamentOpponentCondition(run, id, { ...fresh, stamina: 40 }, "2011-08-17").energy, 81);
  assert.equal(tournamentOpponentCondition(run, id, fresh, "2011-08-24").energy, 96);
});
