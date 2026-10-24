import { test } from "node:test";
import assert from "node:assert/strict";
import { createCampaign, DEFAULT_SETTINGS, readSave, SAVE_KEY, signPlayer } from "../src/game";
import { enterHistoricalTournament, enableHistoricalCalendar, invitationRanking, tournamentBattleConfig, tournamentTeamTemplate, withTournamentStrength } from "../src/historical-game";
import { allRosterReferences, historicalPlayerId, sourceFor } from "../src/history";
import { historicalLineupStrength } from "../src/historical-strength";
import { historicalPower, lineupFormResults, tournamentCombatBonus, tournamentForm } from "../src/tournament-form";
import { historicalTournaments } from "../src/tournaments";
import { simulateSeries } from "../src/battle";
import { simulateOtherTournamentMatches } from "../src/tournament.worker";
import type { Campaign } from "../src/game";
import type { TournamentFixture } from "../src/tournament-types";

const ti1 = historicalTournaments.find(e => e.year === 2011 && e.kind === "ti")!;
function entered(custom = false) {
  const c = enableHistoricalCalendar(createCampaign({ ...DEFAULT_SETTINGS,
    difficulty: "Contender", ...(custom ? { clubMode: "custom", team: "Counterfactual" } as const : {}) }));
  // Isolate strength from the separately tested new-game preparation month.
  c.calendar!.now = c.calendar!.origin = "2011-08-17T00:00:00Z";
  return enterHistoricalTournament(c, ti1.id, 997);
}
const lineup = (c: Campaign, id: string) => c.calendar!.runs[0].teams.find(t => t.id === id)!;
const fixture = (a: string, b: string, id = "test", at = "2011-08-18T10:00:00Z"): TournamentFixture => ({ id, at, stage: "Test", label: "Test", bestOf: 1, timeVerified: true, slots: [{ team: a }, { team: b }] });

test("source finishes give intact historical lineups a graded baseline without changing their 15–40 attributes", () => {
  const c = entered();
  const strengths = ["navi", "ehome", "scythe", "mym", "sgc"].map(id => historicalPower(lineup(c, id).strength));
  for (let i = 1; i < strengths.length; i++) assert.ok(strengths[i - 1] > strengths[i]);
  assert.deepEqual(ti1.historicalResults?.navi, { from: 1, to: 1 });
  assert.deepEqual(ti1.historicalResults?.ehome, { from: 2, to: 2 });
  assert.ok(c.players.every(p => Object.values(p.stats).every(value => value >= 15 && value <= 40)));
  const unknown = historicalLineupStrength(ti1, ["unknown-0", "unknown-1", "unknown-2", "unknown-3", "unknown-4"]);
  assert.equal(historicalPower(unknown), 0);
  assert.equal(unknown.covered, 0);
});

test("TI champions across imported eras use their actual identity references, including year-only roster observations", () => {
  for (const event of historicalTournaments.filter(e => e.kind === "ti" && e.status === "ready")) {
    const winner = Object.entries(event.historicalResults ?? {}).find(([, p]) => p.from === 1 && p.to === 1)!;
    assert.ok(winner, `${event.year} has an observed winner`);
    const reference = allRosterReferences.find(r => r.id === winner[0] && sourceFor(r.source)?.url === event.source)!;
    assert.ok(reference, `${event.year} has a matching sourced lineup`);
    const roster = reference.playerIds ?? reference.roster.map(historicalPlayerId);
    const strength = historicalLineupStrength(event, roster);
    assert.equal(strength.retained, 5, `${event.year} uses the matching reference`);
    assert.equal(strength.reference?.from, 1);
    assert.ok(historicalPower(strength) > 0.4);
  }
});

test("strength follows players through transfers and custom clubs; an old tournament slot cannot bestow its brand's power", () => {
  const c = entered(), run = c.calendar!.runs[0];
  const champions = lineup(c, "navi"), underdogs = lineup(c, "sgc");
  const changed = [...champions.roster]; changed[0] = underdogs.roster[0];
  const reduced = historicalLineupStrength(ti1, changed);
  assert.equal(reduced.retained, 4);
  assert.ok(historicalPower(reduced) < historicalPower(champions.strength));
  const recruited = [...underdogs.roster]; recruited[0] = champions.roster[0];
  assert.ok(historicalPower(historicalLineupStrength(ti1, recruited)) > historicalPower(underdogs.strength));
  const custom = entered(true);
  assert.deepEqual(lineup(custom, "navi").strength, champions.strength);
  const replacement = structuredClone(run);
  replacement.teams.find(t => t.id === "navi")!.roster = [...underdogs.roster];
  delete replacement.teams.find(t => t.id === "navi")!.strength;
  assert.deepEqual(withTournamentStrength(replacement).teams.find(t => t.id === "navi")!.strength, underdogs.strength);
  assert.equal(lineup(c, "navi").strength?.retained, 5, "the registered source is immutable");
});

test("an actual signing changes both registered teams' historical strength and preserves the rival's replacement lineup", () => {
  const original = enableHistoricalCalendar(createCampaign({ ...DEFAULT_SETTINGS, historicalTeamId: "sgc" }));
  const transferred = signPlayer(original, "real-dendi");
  assert.ok(transferred.roster.includes("real-dendi"));
  const before = enterHistoricalTournament(original, ti1.id, 997);
  const after = enterHistoricalTournament(transferred, ti1.id, 997);
  assert.ok(historicalPower(lineup(after, "sgc").strength) > historicalPower(lineup(before, "sgc").strength));
  assert.ok(historicalPower(lineup(after, "navi").strength) < historicalPower(lineup(before, "navi").strength));
  assert.equal(lineup(after, "navi").roster.length, 5);
  assert.ok(!lineup(after, "navi").roster.includes("real-dendi"));
  assert.equal(new Set(after.calendar!.runs[0].teams.flatMap(t => t.roster)).size, 80);
});

test("upsets change both sides' form, follow transferred players, decay, exclude future/default maps and count each result once", () => {
  const c = entered(), run = c.calendar!.runs[0];
  const a = lineup(c, "navi"), b = lineup(c, "ehome");
  run.fixtures = [fixture(a.id, b.id)];
  run.matches = [{ id: "test", at: run.fixtures[0].at, teams: [a.id, b.id], score: [0, 2], winner: 1 }];
  const at = run.matches[0].at;
  const loss = tournamentForm([run], a.roster, at), gain = tournamentForm([run], b.roster, at);
  assert.ok(loss < 0 && gain > 0);
  assert.equal(loss, -gain);
  assert.ok(Math.abs(tournamentForm([run], [b.roster[0], ...Array.from({ length: 4 }, (_, i) => `new-${i}`)], at) - gain / 5) < 1e-12);
  const later = new Date(Date.parse(at) + 8 * 604800000).toISOString();
  assert.equal(tournamentForm([run], b.roster, later), gain / 2);
  assert.equal(tournamentForm([run], b.roster, "2011-08-17"), 0);
  run.matches.push(structuredClone(run.matches[0]));
  assert.equal(tournamentForm([run, structuredClone(run)], b.roster, at), gain);
  run.fixtures[0].advantage = [0, 2];
  assert.equal(tournamentForm([run], b.roster, at), 0);
});

test("real campaign form carries into later events and invitation ranking responds to roster changes", () => {
  const c = entered(), run = c.calendar!.runs[0];
  const past = structuredClone(run); past.eventId = "prior-campaign-event";
  past.fixtures = [fixture("navi", "ehome", "prior", "2011-08-17T00:00:00Z")];
  past.matches = [{ id: "prior", at: past.fixtures[0].at, teams: ["navi", "ehome"], score: [0, 2], winner: 1 }];
  c.calendar!.runs.push(past);
  const future = fixture("navi", "ehome");
  const template = tournamentTeamTemplate(c, run, "navi");
  assert.ok(template.form[0].change < 0);
  const config = tournamentBattleConfig(c, run, future);
  assert.ok(config.bonuses[0] < historicalPower(lineup(c, "navi").strength));
  const event = { ...ti1, id: "future-invites", year: 2012, invited: ["navi", "ehome"] };
  const before = invitationRanking(c, event).find(t => t.id === "navi")!.baseline;
  const club = c.world!.clubs.find(t => t.id === "navi")!;
  club.roster = [...lineup(c, "sgc").roster];
  const after = invitationRanking(c, event).find(t => t.id === "navi")!.baseline;
  assert.ok(after < before);
});

test("AI worker and watched/skip configs use identical history, form, conditioning and seeded map outcomes", () => {
  const c = entered(), run = c.calendar!.runs[0];
  run.fixtures = [fixture("ehome", "mym"), fixture("ehome", "mym", "second", "2011-08-19T10:00:00Z"), fixture("navi", "ehome", "stop", "2011-08-20T10:00:00Z")];
  const templates = Object.fromEntries(run.teams.map(t => [t.id, tournamentTeamTemplate(c, run, t.id)]));
  const input = { run, templates, year: 2011, heroPoolThroughYear: 2010, through: "2011-08-18T23:00:00Z" };
  const worker = simulateOtherTournamentMatches(input);
  const direct = simulateSeries({ ...tournamentBattleConfig(c, run, run.fixtures[0], false), captureReplay: false }).summary;
  assert.deepEqual(worker.matches[0].score, direct.score);
  assert.deepEqual(worker.matches[0].performance?.games[0].players, direct.games[0].players);
  assert.equal(worker.matches.length, 1);
  const resumed = simulateOtherTournamentMatches({ ...input, run: JSON.parse(JSON.stringify(worker)), through: undefined });
  const uninterrupted = simulateOtherTournamentMatches({ ...input, through: undefined });
  assert.deepEqual(resumed, uninterrupted);
  const next = tournamentBattleConfig(c, worker, run.fixtures[1], false);
  const team = worker.teams.find(t => t.id === "ehome")!;
  assert.equal(next.bonuses[0], tournamentCombatBonus(worker, team, run.fixtures[1].at));
});

test("historical favorites win more often, while stronger management can reverse the very same seeded matchup", () => {
  const c = entered(), run = c.calendar!.runs[0];
  const f = fixture("navi", "sgc");
  let favoriteWins = 0, improvedWins = 0;
  for (let i = 1; i <= 12; i++) {
    const config = { ...tournamentBattleConfig(c, run, f, false), seed: i * 7919, captureReplay: false };
    const result = simulateSeries(config).summary;
    if (result.winner === 0) favoriteWins++;
    assert.equal(result.games[0].ancientHealth[1 - result.games[0].winner], 0);
    const improved = structuredClone(config);
    for (const p of improved.players[1]) {
      for (const skill of Object.keys(p.skills)) p.skills[skill] = 99;
      p.energy = 100; p.happiness = 100;
    }
    if (simulateSeries(improved).summary.winner === 1) improvedWins++;
  }
  assert.ok(favoriteWins >= 9, `intact favorites won ${favoriteWins}/12`);
  assert.ok(improvedWins >= 3, `developed underdogs won ${improvedWins}/12`);
});

test("existing saves and registered results retain attributes, finances, dates and outcomes when optional strength evidence is added", () => {
  const c = entered(), run = c.calendar!.runs[0];
  const f = fixture("navi", "ehome");
  const result = simulateSeries({ ...tournamentBattleConfig(c, run, f), captureReplay: false }).summary;
  run.fixtures = [f];
  run.matches = [{ id: f.id, at: f.at, teams: ["navi", "ehome"], score: result.score, winner: result.winner, series: result }];
  for (const team of run.teams) delete team.strength;
  delete run.definition!.historicalResults;
  const snapshot = JSON.stringify(c);
  const hydrated = withTournamentStrength(run);
  assert.ok(hydrated.teams.every(team => team.strength));
  assert.equal(JSON.stringify(c), snapshot);
  assert.ok(Math.abs(historicalPower(hydrated.teams.find(t => t.id === "navi")!.strength) - 0.44) < 1e-10);
  const storage = { getItem: (key: string) => key === SAVE_KEY ? snapshot : null };
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
  try {
    const loaded = readSave()!;
    assert.deepEqual(loaded.players, c.players);
    assert.equal(loaded.cash, c.cash);
    assert.equal(loaded.calendar?.now, c.calendar?.now);
    assert.deepEqual(loaded.calendar?.runs[0].matches, run.matches);
  } finally {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
  assert.equal(lineupFormResults([hydrated], c.roster).length, 1);
});
