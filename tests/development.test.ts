import { test } from "node:test";
import assert from "node:assert/strict";
import { advanceCalendarTo, advanceWeek, buildBattleConfig, createCampaign, DEFAULT_SETTINGS, events, hireStaff, readSave, SAVE_KEY } from "../src/game";
import { enableHistoricalCalendar } from "../src/historical-game";
import { postTiShuffle } from "../src/history";
import { startingAttributes } from "../src/development";
import { setTrainingSchedule, trainingEffect } from "../src/training";
import { weeklyPractice } from "../src/contracts";

test("starting attributes vary by exact identity within 15–40 across early/later starts and new arrivals", () => {
  for (const year of [2011, 2012, 2026, 2036]) {
    const c = createCampaign({ ...DEFAULT_SETTINGS, year });
    for (const p of c.players) {
      assert.deepEqual(p.stats, startingAttributes(p.id));
      assert.ok(Object.values(p.stats).every(value => value >= 15 && value <= 40));
    }
    const carries = c.players.filter(p => p.role === "Carry");
    assert.ok(new Set(carries.map(p => JSON.stringify(p.stats))).size > 5);
  }
  const c = createCampaign(DEFAULT_SETTINGS);
  const veteran = c.players[0];
  veteran.stats.laning = 75;
  const imported = postTiShuffle(c.world!, c.players, 2011)!;
  assert.equal(imported.players.find(p => p.id === veteran.id)!.stats.laning, 75);
  const newcomers = imported.players.filter(p => !c.players.some(old => old.id === p.id));
  assert.ok(newcomers.length > 0);
  assert.ok(newcomers.every(p => Object.values(p.stats).every(value => value >= 15 && value <= 40)));
});

test("upkeep offsets rust; too little practice and full rest decay skills while additional practice improves focus faster", () => {
  const c = createCampaign(DEFAULT_SETTINGS);
  const id = c.roster[0];
  for (const key of Object.keys(c.players[0].stats) as (keyof typeof c.players[0]["stats"])[]) c.players[0].stats[key] = 50;
  c.training[id] = "Farming";
  const result = (hoursPerDay: number) => advanceWeek(setTrainingSchedule(c, id, { hoursPerDay, daysPerWeek: 5 })).players.find(p => p.id === id)!;
  const short = result(1), upkeep = result(2), normal = result(4), extra = result(6);
  assert.equal(short.stats.vision, 49.9);
  assert.equal(upkeep.stats.vision, 50);
  assert.equal(normal.stats.vision, 50);
  assert.ok(short.stats.farming < upkeep.stats.farming);
  assert.ok(upkeep.stats.farming < normal.stats.farming);
  assert.ok(normal.stats.farming < extra.stats.farming);
  c.training[id] = "Rest";
  const rest = advanceWeek(c).players[0];
  assert.ok(Object.values(rest.stats).every(value => value === 49.8));
  assert.match(trainingEffect("Rest", weeklyPractice(c, c.players[0], "Rest"), false), /−0.2 all attributes \(decay\)/);
  c.players[0].stats.laning = 0.05;
  assert.equal(advanceWeek(c).players[0].stats.laning, 0);
});

test("Balanced improves all skills, focused practice develops faster, fatigue slows growth and previews match net decay", () => {
  const c = createCampaign(DEFAULT_SETTINGS);
  const p = c.players[0];
  const balanced = advanceWeek(c).players[0];
  for (const key of Object.keys(p.stats) as (keyof typeof p.stats)[])
    assert.equal(balanced.stats[key], p.stats[key] + 0.17);
  assert.match(trainingEffect("Balanced", weeklyPractice(c, p, "Balanced"), false), /\+0.17 all attributes/);
  c.training[p.id] = "Farming";
  const fresh = weeklyPractice(c, p, "Farming").growth;
  p.energy = 10;
  assert.equal(weeklyPractice(c, p, "Farming").growth, fresh / 4);
  const light = setTrainingSchedule(c, p.id, { intensity: "Light", hoursPerDay: 1, daysPerWeek: 1 });
  const trained = advanceWeek(light).players[0];
  assert.equal(trained.stats.farming, p.stats.farming - 0.18);
  assert.match(trainingEffect("Farming", weeklyPractice(light, p, "Farming"), false), /−0.18 farming · −0.19 other attributes/);
});

test("AI starters/reserves and free agents develop deterministically without using managed schedules or resources", () => {
  const c = createCampaign(DEFAULT_SETTINGS);
  const managed = c.world!.clubs.find(club => club.id === c.world!.managedTeamId)!;
  const rival = c.world!.clubs.find(club => club.id !== managed.id)!;
  const free = c.players.find(p => !c.world!.clubs.some(club => [...club.roster, ...club.bench].includes(p.id)))!;
  const reserve = c.players.find(p => p.id === rival.roster[4])!;
  rival.bench.push(reserve.id);
  rival.roster.pop();
  const before = structuredClone(c);
  const next = advanceWeek(c);
  for (const id of [rival.roster[0], reserve.id, free.id]) {
    const p = c.players.find(p => p.id === id)!;
    const trained = next.players.find(p => p.id === id)!;
    assert.ok(Object.values(trained.stats).reduce((a, b) => a + b) > Object.values(p.stats).reduce((a, b) => a + b));
  }
  assert.deepEqual(c, before, "immutable shared world");
  assert.deepEqual(advanceWeek(c), next, "same week always produces the same world");
  const changed = hireStaff(c, "c1");
  changed.cash = -100;
  changed.training[reserve.id] = "Rest";
  const altered = advanceWeek(changed);
  assert.deepEqual(altered.players.find(p => p.id === reserve.id), next.players.find(p => p.id === reserve.id));
  assert.deepEqual(next.training, c.training, "AI does not overwrite player training selections");
});

test("world progression survives a year, recovers tired rivals, and feeds their actual battle skills", () => {
  const start = enableHistoricalCalendar(createCampaign(DEFAULT_SETTINGS));
  start.cash = 1000000;
  for (const id of start.roster) start.training[id] = "Rest";
  const rivalIds = start.world!.clubs.filter(club => club.id !== start.world!.managedTeamId).flatMap(club => club.roster);
  start.players.find(p => p.id === rivalIds[0])!.energy = 30;
  const week = advanceWeek(start);
  assert.equal(week.players.find(p => p.id === rivalIds[0])!.energy, 54);
  const end = advanceCalendarTo(start, new Date(Date.parse(start.calendar!.origin) + 52 * 604800000).toISOString());
  for (const id of rivalIds) {
    const original = start.players.find(p => p.id === id)!;
    const developed = end.players.find(p => p.id === id)!;
    assert.ok(Object.values(developed.stats).reduce((a, b) => a + b) > Object.values(original.stats).reduce((a, b) => a + b), id);
    assert.ok(developed.energy >= 40 && developed.energy <= 100, id);
    assert.ok(Object.values(developed.stats).every(value => value >= 0 && value <= 99));
  }
  const battle = buildBattleConfig(end, events[0], 42);
  for (const row of battle.players[1]) assert.deepEqual(row.skills, end.players.find(p => p.id === row.id)!.stats);
});

test("dated jumps and individual weeks develop the same world, including after imports; sub-week time never trains twice", () => {
  const start = enableHistoricalCalendar(createCampaign(DEFAULT_SETTINGS));
  let stepped = start;
  for (let i = 0; i < 12; i++) stepped = advanceWeek(stepped);
  const jumped = advanceCalendarTo(start, stepped.calendar!.now);
  assert.deepEqual(jumped.players, stepped.players);
  assert.equal(jumped.cash, stepped.cash);
  const partial = advanceCalendarTo(start, new Date(Date.parse(start.calendar!.origin) + 6 * 86400000).toISOString());
  for (const p of start.players) assert.deepEqual(partial.players.find(other => other.id === p.id)!.stats, p.stats);
  const week = advanceWeek(start);
  assert.deepEqual(advanceCalendarTo(partial, week.calendar!.now).players, week.players);
  assert.equal(advanceCalendarTo(week, week.calendar!.now), week);
});

test("loading existing ratings preserves them without retroactive rescaling or development", () => {
  const c = advanceWeek(createCampaign(DEFAULT_SETTINGS));
  c.players[0].stats.laning = 87;
  delete c.world;
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (key: string) => key === SAVE_KEY ? JSON.stringify(c) : null } });
  try {
    const loaded = readSave()!;
    assert.deepEqual(loaded.players, c.players);
    assert.equal(loaded.cash, c.cash);
    assert.deepEqual(advanceWeek(loaded).players, advanceWeek(c).players);
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
