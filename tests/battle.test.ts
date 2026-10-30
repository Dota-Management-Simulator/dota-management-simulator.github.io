import { test } from "node:test";
import assert from "node:assert/strict";
import { LaneBattle, simulateBestOfThree } from "../src/battle";
import {
  buildBattleConfig,
  createCampaign,
  DEFAULT_SETTINGS,
  events,
  prepareEvent,
  settleEvent,
  data,
} from "../src/game";
import { getHeroPool, heroById } from "../src/heroes";

const original = createCampaign(DEFAULT_SETTINGS);
const config = buildBattleConfig(
  prepareEvent(original, events[0]),
  events[0],
  42,
);
const simulated = simulateBestOfThree(config);

test("player skills change the controller without changing hero power or movement speed", () => {
  const drafted = new LaneBattle(config).units.filter(u => u.kind === "hero");
  const heroesAt = (skill: number) => {
    const c = structuredClone(config);
    c.draft = [drafted.slice(0, 5).map(u => u.hero!.id), drafted.slice(5).map(u => u.hero!.id)];
    c.bonuses = [0, 0];
    for (const side of c.players) for (const p of side) {
      p.energy = 100; p.happiness = 100;
      for (const key of Object.keys(p.skills)) p.skills[key] = skill;
    }
    return new LaneBattle(c).units.filter(u => u.kind === "hero");
  };
  const zero = heroesAt(0), low = heroesAt(15), high = heroesAt(40), veteran = heroesAt(75);
  for (let i = 0; i < low.length; i++) {
    for (const peers of [zero, high, veteran]) {
      assert.equal(low[i].power, peers[i].power);
      assert.equal(low[i].speed, peers[i].speed);
      assert.equal(low[i].damage, peers[i].damage);
      assert.equal(low[i].max, peers[i].max);
    }
  }
});

test("classic pool contains 46 unique TI1 heroes and all featured meta heroes are eligible", () => {
  const pool = getHeroPool(2011);
  assert.equal(pool.length, 46);
  assert.equal(new Set(pool.map((h) => h.id)).size, 46);
  assert.ok(pool.some((h) => h.id === "axe"));
  assert.ok(pool.some((h) => h.id === "chen"));
  for (const late of ["ember_spirit", "oracle", "earth_spirit", "juggernaut"])
    assert.ok(!pool.some((h) => h.id === late));
  for (const meta of data.patch.heroes)
    assert.ok(pool.some((h) => h.id === meta.id));
});
test("seeded simulation is reproducible and series stops at the second win", () => {
  const repeated = simulateBestOfThree(config);
  assert.deepEqual(repeated.summary, simulated.summary);
  assert.deepEqual(repeated.frames, simulated.frames);
  const s = simulated.summary;
  assert.ok(s.games.length === 2 || s.games.length === 3);
  assert.equal(Math.max(...s.score), 2);
  assert.equal(s.games.filter((g) => g.winner === 0).length, s.score[0]);
  assert.equal(s.games.filter((g) => g.winner === 1).length, s.score[1]);
  assert.equal(s.games.at(-1)?.winner, s.winner);
  for (const frames of simulated.frames) {
    const draft = new Map(frames[0].players.map((player) => [player.heroId, player]));
    for (const frame of frames) for (const unit of frame.units) {
      if (unit.kind === "hero") {
        const player = draft.get(unit.heroId!);
        assert.ok(player, `Replay hero ${unit.id} must use this game's draft`);
        assert.equal(unit.name, player.hero);
        assert.equal(unit.team, player.team);
      } else assert.equal(unit.heroId, undefined);
    }
  }
});

test("later hero batches reach actual drafts and produce finite completed match results", () => {
  const c = createCampaign({ ...DEFAULT_SETTINGS, year: 2026 });
  const game = new LaneBattle(buildBattleConfig(c, events[0], 42));
  game.run();
  const summary = game.summary();
  assert.equal(summary.players.length, 10);
  assert.equal(new Set(summary.players.map((p) => p.heroId)).size, 10);
  assert.ok(summary.players.some((p) => heroById(p.heroId)?.releasedYear != null));
  assert.equal(summary.ancientHealth[1 - summary.winner], 0);
  for (const p of summary.players) {
    assert.ok(heroById(p.heroId));
    assert.ok([p.gold, p.xp, p.level, p.kills, p.deaths].every(Number.isFinite));
  }
  const before = { ...config, year: 2011, heroPoolThroughYear: 2010 };
  for (let seed = 1; seed <= 8; seed++) {
    const draft = new LaneBattle({ ...before, seed }).frames[0].players;
    assert.ok(draft.every((p) => heroById(p.heroId)?.releasedYear == null));
  }
});
test("each game has a destroyed Ancient, a unique ten-hero draft, and valid KDA and levels", () => {
  for (const g of simulated.summary.games) {
    assert.equal(g.ancientHealth[1 - g.winner], 0);
    assert.equal(g.players.length, 10);
    assert.equal(new Set(g.players.map((p) => p.heroId)).size, 10);
    assert.ok(g.duration > 0 && g.duration <= 10800);
    for (const p of g.players) {
      for (const n of [
        p.kills,
        p.deaths,
        p.assists,
        p.level,
        p.gold,
        p.xp,
        p.lastHits,
      ])
        assert.ok(Number.isInteger(n) && n >= 0);
      assert.ok(p.level >= 1 && p.level <= 25);
      assert.ok(getHeroPool(2011).some((h) => h.id === p.heroId));
    }
    for (const team of [0, 1] as const) {
      assert.equal(
        g.players
          .filter((p) => p.team !== team)
          .reduce((n, p) => n + p.deaths, 0),
        g.kills[team],
      );
      assert.ok(
        g.players
          .filter((p) => p.team === team)
          .reduce((n, p) => n + p.kills, 0) <= g.kills[team],
      );
      assert.ok(
        g.players
          .filter((p) => p.team === team)
          .reduce((n, p) => n + p.assists, 0) <=
          g.kills[team] * 4,
      );
    }
  }
});
test("gold and XP graphs record monotonic totals and agree exactly with final scoreboards", () => {
  for (const g of simulated.summary.games) {
    assert.equal(g.timeline[0].time, 0);
    assert.deepEqual(g.timeline[0].gold, [3000, 3000]);
    assert.deepEqual(g.timeline[0].xp, [0, 0]);
    assert.equal(g.timeline.at(-1)?.time, g.duration);
    for (let i = 1; i < g.timeline.length; i++) {
      assert.ok(g.timeline[i].time > g.timeline[i - 1].time);
      for (const team of [0, 1] as const) {
        assert.ok(g.timeline[i].gold[team] >= g.timeline[i - 1].gold[team]);
        assert.ok(g.timeline[i].xp[team] >= g.timeline[i - 1].xp[team]);
      }
    }
    for (const team of [0, 1] as const) {
      assert.equal(
        g.timeline.at(-1)!.gold[team],
        g.players
          .filter((p) => p.team === team)
          .reduce((n, p) => n + p.gold, 0),
      );
      assert.equal(
        g.timeline.at(-1)!.xp[team],
        g.players.filter((p) => p.team === team).reduce((n, p) => n + p.xp, 0),
      );
    }
  }
});
test("both team-zero and team-one victories halt the simulation", () => {
  for (const side of [0, 1] as const) {
    const game = new LaneBattle(config);
    game.winner = side;
    game.step();
    assert.equal(game.time, 0);
    assert.equal(game.winner, side);
  }
  const game = new LaneBattle(config);
  game.run();
  const endedAt = game.time;
  const stats = game.summary();
  game.step();
  assert.equal(game.time, endedAt);
  assert.deepEqual(game.summary(), stats);
});
test("watch and skip share the same result and can only settle rewards once", () => {
  const watched = settleEvent(original, events[0], simulated.summary);
  const skipped = settleEvent(
    original,
    events[0],
    structuredClone(simulated.summary),
  );
  assert.deepEqual(watched, skipped);
  assert.equal(settleEvent(watched, events[0], simulated.summary), watched);
  assert.equal(watched.results[0].score, simulated.summary.score.join(" – "));
  assert.ok(!("frames" in watched.results[0].series!));
  assert.equal(watched.week, 4);
  assert.equal(original.week, 1);
});
