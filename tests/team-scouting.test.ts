import { test } from "node:test";
import assert from "node:assert/strict";
import { buildBattleConfig, createCampaign, DEFAULT_SETTINGS, events, readSave, SAVE_KEY } from "../src/game";
import { enableHistoricalCalendar } from "../src/historical-game";
import { historicalTournaments } from "../src/tournaments";
import { autoDraftMap, draftCanFinish } from "../src/draft";
import { getHeroPool } from "../src/heroes";
import { historicalPatches, patchById } from "../src/patches";
import { frequentHeroes, nextScoutSeries, ownScoutConfig, scoutingTeamForConfig, scoutingTeams, staffDraftAdvice, teamScoutSeries } from "../src/team-scouting";
import type { Campaign } from "../src/game";
import type { TournamentRun } from "../src/tournament-types";
import type { PlayerScore } from "../src/battle";

function fixture() {
  const c = enableHistoricalCalendar(createCampaign(DEFAULT_SETTINGS));
  const clubs = c.world!.clubs.filter(t => t.active !== false).slice(0, 3);
  const { fixtures: _, ...definition } = historicalTournaments.find(e => e.year === 2011 && e.kind === "ti")!;
  const run: TournamentRun = { eventId: definition.id, definition, seed: 13, patchId: "2011.2", managed: clubs[0].id,
    lineup: c.roster, prizeShares: {}, teams: clubs.map(t => ({ id: t.id, clubId: t.id, name: t.name, roster: [...t.roster] })),
    matches: [], fixtures: [{ id: "next", stage: "Group A", label: "Opening", at: "2011-08-18T10:00:00Z", bestOf: 3, timeVerified: true, slots: [{ team: clubs[1].id }, { team: clubs[0].id }] }],
    groupOrder: {}, state: "playing", placements: [] };
  c.calendar!.runs.push(run);
  return { c, run, team: scoutingTeams(c).find(t => t.id === clubs[1].id)! };
}
function addPlayed(c: Campaign, run: TournamentRun) {
  const cfg = nextScoutSeries(c)!.config!, draft = autoDraftMap(cfg);
  const players: PlayerScore[] = cfg.players.flatMap((side, t) => side.map((p, role) => ({ id: p.id, player: p.name, team: t as 0|1, role,
    heroId: draft.heroes[t][role], hero: draft.heroes[t][role], kills: 2, deaths: 1, assists: 3, level: 12, gold: 9000, xp: 12000, lastHits: 50, buildingDamage: 1000, laneOutcome: "win" })));
  // Public archive is stored in the opposite orientation to the preview config.
  const oriented = players.map(p => ({ ...p, team: (1 - p.team) as 0|1 }));
  run.fixtures.push({ ...run.fixtures[0], id: "played", advantage: [0, 1] });
  run.matches.push({ id: "played", at: "2011-08-17T12:00:00Z", teams: [run.teams[1].id, run.teams[0].id], score: [1, 1], winner: 0,
    performance: { teams: [run.teams[1].name, run.teams[0].name], games: [{ winner: 0, duration: 1800, kills: [10, 10], players: oriented,
      draft: { ...draft, actions: draft.actions.map(a => ({ ...a, side: (1 - a.side) as 0|1 })) } }] } });
  c.calendar!.now = "2011-08-17T14:00:00Z";
  return cfg;
}

test("directory and empty scouting are read-only, include each active club and do not invent form", () => {
  const { c } = fixture(), before = JSON.stringify(c), teams = scoutingTeams(c);
  assert.equal(teams.filter(t => t.managed).length, 1);
  assert.equal(new Set(teams.map(t => t.id)).size, teams.length);
  assert.ok(teams.every(t => teamScoutSeries(c, t).length === 0));
  assert.equal(JSON.stringify(c), before);
});

test("next series uses registered lineup, managed-first orientation and pinned patch across reloads", () => {
  const { c, run } = fixture();
  const pinned = [...run.teams[1].roster];
  c.world!.clubs.find(t => t.id === run.teams[1].clubId)!.roster.reverse();
  c.calendar!.now = "2012-01-01T00:00:00Z";
  const next = nextScoutSeries(c)!;
  assert.equal(next.team!.name, run.teams[1].name);
  assert.deepEqual(next.team!.roster, pinned);
  assert.equal(next.config!.teams[0], c.settings.team);
  assert.deepEqual(next.config!.players[1].map(p => p.id), pinned);
  assert.equal(next.config!.patchId, "2011.2");
  assert.equal(JSON.stringify(nextScoutSeries(JSON.parse(JSON.stringify(c)))), JSON.stringify(next));
});

test("unresolved brackets and no scheduled events cannot invent a next opponent", () => {
  const { c, run } = fixture();
  run.fixtures[0].slots = [{ match: "unplayed", outcome: "winner" }, { team: run.managed }];
  run.fixtures.push({ ...run.fixtures[0], id: "unplayed", slots: [{ team: run.teams[1].id }, { team: run.teams[2].id }] });
  assert.equal(nextScoutSeries(c)!.team, null);
  assert.equal(nextScoutSeries(c)!.config, undefined);
  run.state = "complete";
  assert.equal(nextScoutSeries(c), null);
});

test("public records read compact AI scoreboards once, filter future matches and exclude default wins", () => {
  const { c, run, team } = fixture(); addPlayed(c, run);
  run.matches.push(structuredClone(run.matches[0]), { ...structuredClone(run.matches[0]), id: "future", at: "2011-09-01T00:00:00Z" });
  c.calendar!.runs.push(structuredClone(run));
  const before = JSON.stringify(c), rows = teamScoutSeries(c, team);
  assert.equal(rows.length, 1); assert.equal(rows[0].score, "1–0"); assert.equal(rows[0].outcome, "W");
  assert.equal(rows[0].maps.length, 1); assert.equal(rows[0].maps[0].players.length, 5);
  assert.ok(rows[0].maps[0].players.every(p => team.roster.includes(p.id)));
  assert.ok(rows[0].maps[0].bans.length > 0);
  assert.equal(frequentHeroes(rows[0].maps).length, 5);
  assert.equal(JSON.stringify(c), before);
});

test("staff add distinct insights and observed threats; departed players no longer create priority bans", () => {
  const { c, run, team } = fixture(), cfg = addPlayed(c, run);
  c.staffIds = [];
  assert.equal(staffDraftAdvice(c, cfg, team).notes.length, 0);
  assert.equal(staffDraftAdvice(c, cfg, team).canApply, false);
  c.staffIds = ["c3", "unknown", "c3"];
  assert.equal(staffDraftAdvice(c, cfg, team).canApply, false);
  c.staffIds = ["c1", "c2", "c4", "c5", "c6", "c6"];
  const before = JSON.stringify(c), advice = staffDraftAdvice(c, cfg, team);
  assert.equal(advice.notes.length, 5); assert.equal(advice.canApply, true);
  assert.equal(advice.threats.length, 5); assert.ok(advice.observedBans.length > 0);
  assert.ok(advice.plan.bans.length > 0);
  assert.ok(draftCanFinish(getHeroPool(cfg.year, cfg.heroPoolThroughYear, patchById(cfg.patchId)), [advice.plan.preferred.flat(), []], advice.plan.bans));
  assert.ok(advice.notes.find(n => n.id === "c4")!.detail.includes("GPM"));
  assert.ok(advice.notes.find(n => n.id === "c2")!.detail.includes("5 recorded lane"));
  assert.equal(staffDraftAdvice(c, cfg, { ...team, roster: ["replacement"] }).threats.length, 0);
  assert.equal(JSON.stringify(c), before);
  c.staffIds = ["c1"];
  assert.equal(staffDraftAdvice(c, cfg, team).notes.length, 1);
  assert.deepEqual(staffDraftAdvice(c, cfg, team).plan.bans, []);
});

test("staff plans are legal in every phase and ignore opponent private preparation, staffing and combat coefficients", () => {
  const c = createCampaign(DEFAULT_SETTINGS); c.staffIds = ["c1", "c2", "c4", "c5", "c6"];
  const base = buildBattleConfig(c, events[0], 42);
  for (const patch of historicalPatches) {
    const cfg = { ...base, year: patch.year, patchId: patch.id, heroPoolThroughYear: patch.year - 1 };
    const advice = staffDraftAdvice(c, cfg, null), picks = advice.plan.preferred.map(ids => ids[0]);
    const pool = getHeroPool(cfg.year, cfg.heroPoolThroughYear, patch);
    assert.ok(advice.canApply, patch.id);
    assert.equal(new Set(picks).size, 5);
    assert.ok(picks.every((id, role) => pool.some(h => h.id === id && h.roles.includes(role))), patch.id);
    assert.ok(draftCanFinish(pool, [picks, []], advice.plan.bans));
  }
  const before = staffDraftAdvice(c, base, null);
  const changed = structuredClone(base);
  changed.patchObservers![1] = { teamKey: "Private", staffIds: ["c6"] };
  changed.draftPreparations = [undefined, { approach: "push", preferred: [["chen"], [], [], [], []], bans: ["axe"] }];
  assert.deepEqual(staffDraftAdvice(c, changed, null), before);
  const patch = patchById(base.patchId)!;
  const old = patch.heroBalance!.map(h => h.power);
  try { patch.heroBalance!.forEach(h => h.power = 80); assert.deepEqual(staffDraftAdvice(c, { ...base }, null), before); }
  finally { patch.heroBalance!.forEach((h, i) => { if (old[i] == null) delete h.power; else h.power = old[i]; }); }
});

test("plans use existing save field, preserve cash/date/ratings, and legacy circuits keep working", () => {
  const c = createCampaign(DEFAULT_SETTINGS); c.staffIds = ["c1"];
  const next = nextScoutSeries(c)!; assert.ok(next.team); assert.ok(next.config);
  assert.ok(scoutingTeamForConfig(c, next.config!));
  const team = scoutingTeams(c).find(t => !t.managed && t.roster.length === 5)!;
  assert.ok(ownScoutConfig(c, team));
  const before = JSON.stringify(c), advice = staffDraftAdvice(c, next.config!, next.team);
  c.draftPreparation = advice.plan;
  const oldStorage = globalThis.localStorage;
  try {
    globalThis.localStorage = { getItem: (k: string) => k === SAVE_KEY ? JSON.stringify(c) : null } as Storage;
    assert.deepEqual(readSave()!.draftPreparation, advice.plan);
  } finally { globalThis.localStorage = oldStorage; }
  delete c.draftPreparation; assert.equal(JSON.stringify(c), before);
});

test("unlinked same-name field teams remain event-scoped", () => {
  const { c, run } = fixture(); addPlayed(c, run);
  run.teams[1].clubId = undefined; run.teams[1].name = "Same name";
  const other = structuredClone(run); other.eventId = "other-event";
  c.calendar!.runs.push(other);
  const teams = scoutingTeams(c).filter(t => t.name === "Same name");
  assert.equal(teams.length, 2);
  assert.ok(teams.every(t => teamScoutSeries(c, t).length === 1));
});
