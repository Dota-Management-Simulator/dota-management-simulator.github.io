import { test } from "node:test";
import assert from "node:assert/strict";
import { advanceWeek, createCampaign, DEFAULT_SETTINGS, hireStaff, readSave, SAVE_KEY } from "../src/game";
import type { Player, Training } from "../src/game";
import { attributeNames, setTrainingSchedule, trainingEffect, trainingOptions, trainingSchedule } from "../src/training";
import { weeklyPractice } from "../src/contracts";

test("every profile attribute has a selectable focus that develops it without changing other skills", () => {
  for (const [key, focus] of Object.entries(attributeNames)) {
    const c = createCampaign(DEFAULT_SETTINGS);
    const p = c.players.find((p) => p.id === c.roster[0])!;
    for (const key of Object.keys(p.stats) as (keyof Player["stats"])[]) p.stats[key] = 40;
    p.energy = 60;
    c.training[p.id] = focus;
    assert.ok(trainingOptions(p).flatMap((g) => g.options).includes(focus));
    const next = advanceWeek(c);
    const trained = next.players.find((other) => other.id === p.id)!;
    assert.equal(trained.stats[key as keyof Player["stats"]], 41, focus);
    const legacyExtras: Partial<Record<Training, string[]>> = {
      Laning: ["skirmish"], Teamfights: ["stability"], "Hero pool": ["creativity"],
    };
    for (const [other, value] of Object.entries(trained.stats)) {
      assert.equal(value, other === key || legacyExtras[focus]?.includes(other) ? 41 : 40, `${focus}: ${other}`);
    }
    assert.deepEqual(trained.playstyles, p.playstyles);
    assert.equal(trained.energy, 55);
    assert.equal(p.stats[key as keyof Player["stats"]], 40, "input remains immutable");
    assert.notDeepEqual(next.players.find((other) => !c.roster.includes(other.id))!.stats, c.players.find((other) => !c.roster.includes(other.id))!.stats, "other rosters train as well");
  }
});

test("each displayed playstyle can train independently and stays on its 1–10 scale with staff", () => {
  const base = hireStaff(createCampaign(DEFAULT_SETTINGS), "c1");
  for (const id of base.roster) {
    const player = base.players.find((p) => p.id === id)!;
    for (const focus of trainingOptions(player).find((g) => g.label.startsWith("Playstyles"))!.options) {
      const c = structuredClone(base);
      const p = c.players.find((p) => p.id === id)!;
      const key = focus.slice("Playstyle: ".length) as keyof Player["playstyles"];
      assert.ok(Object.hasOwn(p.playstyles, key), "focus must resolve to an existing profile playstyle");
      p.playstyles[key] = 8;
      c.training[id] = focus;
      const trained = advanceWeek(c).players.find((p) => p.id === id)!;
      assert.equal(trained.playstyles[key], 9);
      assert.deepEqual(trained.stats, p.stats);
      assert.deepEqual(trained.playstyles, { ...p.playstyles, [key]: 9 });
      p.playstyles[key] = 10;
      assert.equal(advanceWeek(c).players.find((p) => p.id === id)!.playstyles[key], 10);
    }
  }
});

test("happiness and energy recovery work without skill gains and retain debt penalties", () => {
  for (const focus of ["Happiness", "Rest"] as const) {
    const c = createCampaign(DEFAULT_SETTINGS);
    const p = c.players.find((p) => p.id === c.roster[0])!;
    p.happiness = 60;
    p.energy = 60;
    c.training[p.id] = focus;
    const trained = advanceWeek(c).players.find((other) => other.id === p.id)!;
    assert.equal(trained.happiness, focus === "Happiness" ? 66 : 64);
    assert.equal(trained.energy, focus === "Happiness" ? 67 : 84);
    assert.deepEqual(trained.stats, Object.fromEntries(Object.entries(p.stats).map(([key, value]) => [key, value - (focus === "Rest" ? 0.2 : 0)])));
    assert.deepEqual(trained.playstyles, p.playstyles);
    c.cash = 0;
    assert.equal(advanceWeek(c).players.find((other) => other.id === p.id)!.happiness, 50);
    p.happiness = 99;
    p.energy = 99;
    c.cash = 100000;
    const capped = advanceWeek(c).players.find((other) => other.id === p.id)!;
    assert.equal(capped.happiness, 100);
    assert.equal(capped.energy, 100);
  }
});

test("new attribute focuses use contract workload and coach growth with the existing skill cap", () => {
  const c = hireStaff(createCampaign(DEFAULT_SETTINGS), "c1");
  const p = c.players.find((p) => p.id === c.roster[0])!;
  c.contracts = { [p.id]: { wage: p.wage, bonus: 0, weeks: 18, prizeShare: 0, practiceHours: 40, restDays: 2, signedAt: 0, expiresAt: 999999, marketWage: p.wage } };
  c.training[p.id] = "Farming";
  p.stats.farming = 40;
  p.energy = 60;
  const practice = weeklyPractice(c, p, "Farming");
  const trained = advanceWeek(c).players.find((other) => other.id === p.id)!;
  assert.equal(trained.stats.farming, 44);
  assert.equal(trained.energy, 43);
  assert.equal(trainingEffect("Farming", practice, false), "+4 farming · −17 energy · +1 happiness");
  p.stats.farming = 98;
  assert.equal(advanceWeek(c).players.find((other) => other.id === p.id)!.stats.farming, 98);
});

test("focused plans retain their paired targets; Balanced spreads growth and Rest allows decay", () => {
  const targets = {
    Balanced: Object.keys(attributeNames), Laning: ["laning", "skirmish"],
    Teamfights: ["teamfights", "stability"], "Map awareness": ["vision", "intuition", "pushing"],
    "Hero pool": ["heroPool", "creativity"], Rest: [],
  };
  for (const [focus, keys] of Object.entries(targets)) {
    const c = createCampaign(DEFAULT_SETTINGS);
    const p = c.players.find((p) => p.id === c.roster[0])!;
    c.training[p.id] = focus as Training;
    const trained = advanceWeek(c).players.find((other) => other.id === p.id)!;
    for (const key of Object.keys(p.stats) as (keyof Player["stats"])[])
      assert.equal(trained.stats[key], p.stats[key] + (focus === "Rest" ? -0.2 : keys.includes(key) ? focus === "Balanced" ? 0.17 : 1 : 0));
  }
});

test("new training selections and workloads survive loading a v1 save", () => {
  let c = createCampaign(DEFAULT_SETTINGS);
  c = setTrainingSchedule(c, c.roster[0], { intensity: "Intense", hoursPerDay: 6, daysPerWeek: 4 });
  c.training[c.roster[0]] = "Confidence";
  c.training[c.roster[1]] = "Playstyle: Aggression";
  c.training[c.roster[2]] = "Happiness";
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (key: string) => key === SAVE_KEY ? JSON.stringify(c) : null } });
  try {
    const loaded = readSave();
    assert.ok(loaded);
    assert.deepEqual(loaded.training, c.training);
    assert.deepEqual(loaded.trainingSchedules, c.trainingSchedules);
    assert.deepEqual(advanceWeek(loaded), JSON.parse(JSON.stringify(advanceWeek(c))));
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});

test("each higher intensity increases skill and playstyle growth while spending more energy", () => {
  const c = createCampaign(DEFAULT_SETTINGS);
  const id = c.roster[0];
  const p = c.players.find((p) => p.id === id)!;
  const practice = (["Light", "Normal", "Intense"] as const).map((intensity) => {
    const scheduled = setTrainingSchedule(c, id, { intensity });
    return weeklyPractice(scheduled, p, "Farming");
  });
  assert.deepEqual(practice.map((p) => p.growth), [0.75, 1, 1.5]);
  assert.deepEqual(practice.map((p) => p.playstyleGrowth), [0.75, 1, 1.5]);
  assert.deepEqual(practice.map((p) => p.energy), [-1, -5, -13]);
  for (const focus of ["Farming", "Playstyle: Aggression", "Happiness"] as const) {
    const scheduled = setTrainingSchedule(c, id, { intensity: "Intense" });
    scheduled.training[id] = focus;
    const effect = weeklyPractice(scheduled, p, focus);
    const trained = advanceWeek(scheduled).players.find((p) => p.id === id)!;
    if (focus === "Farming") assert.equal(trained.stats.farming, p.stats.farming + 1.5);
    if (focus === "Playstyle: Aggression") assert.equal(trained.playstyles.Aggression, p.playstyles.Aggression + 1.5);
    if (focus === "Happiness") assert.equal(trained.happiness, p.happiness + 9);
    assert.equal(trained.energy, p.energy + effect.energy);
  }
  assert.equal(c.trainingSchedules, undefined, "setting a schedule does not mutate the original save");
});

test("longer daily sessions and more training days trade energy for development at every intensity", () => {
  const c = createCampaign(DEFAULT_SETTINGS);
  const p = c.players.find((p) => p.id === c.roster[0])!;
  for (const intensity of ["Light", "Normal", "Intense"] as const) {
    const workload = (hoursPerDay: number, daysPerWeek: number) =>
      weeklyPractice(setTrainingSchedule(c, p.id, { intensity, hoursPerDay, daysPerWeek }), p, "Laning");
    const light = workload(2, 4);
    const longer = workload(4, 4);
    const moreDays = workload(4, 6);
    assert.ok(light.growth > 0, "short practice still develops skills");
    assert.ok(longer.growth > light.growth);
    assert.ok(moreDays.growth > longer.growth);
    assert.ok(longer.energy < light.energy);
    assert.ok(moreDays.energy < longer.energy);
  }
});

test("weekly schedules honor contract limits and follow new terms without overwriting contracts", () => {
  const c = createCampaign(DEFAULT_SETTINGS);
  const p = c.players.find((p) => p.id === c.roster[0])!;
  c.contracts = { [p.id]: { wage: p.wage, bonus: 0, weeks: 18, prizeShare: 0, practiceHours: 40, restDays: 1, signedAt: 0, expiresAt: 999999, marketWage: p.wage } };
  const originalContract = structuredClone(c.contracts);
  const scheduled = setTrainingSchedule(c, p.id, { intensity: "Intense", hoursPerDay: 12, daysPerWeek: 7 });
  let schedule = trainingSchedule(scheduled, p);
  assert.equal(schedule.daysPerWeek, 6);
  assert.equal(schedule.hoursPerDay * schedule.daysPerWeek, 40);
  assert.deepEqual(scheduled.contracts, originalContract);
  scheduled.contracts = { [p.id]: { ...scheduled.contracts![p.id], practiceHours: 20, restDays: 3 } };
  schedule = trainingSchedule(scheduled, p);
  assert.equal(schedule.daysPerWeek, 4);
  assert.equal(schedule.hoursPerDay, 5);
  assert.equal(c.trainingSchedules, undefined);
  const unknown = setTrainingSchedule(c, "unknown", { intensity: "Light" });
  assert.equal(unknown, c);
  const reserve = c.players.find((p) => !c.roster.includes(p.id))!;
  assert.equal(setTrainingSchedule(c, reserve.id, { intensity: "Light" }), c);
});

test("full rest ignores the saved workload and fractional gains stay capped and rounded", () => {
  let c = createCampaign(DEFAULT_SETTINGS);
  const id = c.roster[0];
  c = setTrainingSchedule(c, id, { intensity: "Intense", hoursPerDay: 12, daysPerWeek: 7 });
  const p = c.players.find((p) => p.id === id)!;
  c.training[id] = "Rest";
  p.energy = 40;
  const rest = advanceWeek(c).players.find((p) => p.id === id)!;
  assert.equal(rest.energy, 64);
  assert.deepEqual(rest.stats, Object.fromEntries(Object.entries(p.stats).map(([key, value]) => [key, value - 0.2])));
  assert.deepEqual(rest.playstyles, p.playstyles);
  c.training[id] = "Farming";
  p.stats.farming = 98;
  assert.equal(advanceWeek(c).players.find((p) => p.id === id)!.stats.farming, 98, 'saved ratings above personal ceilings are preserved without additional growth');
  assert.equal(advanceWeek(c).players.find((p) => p.id === id)!.energy, 0);
  c = setTrainingSchedule(c, id, { intensity: "Light", hoursPerDay: 1, daysPerWeek: 1 });
  const practice = weeklyPractice(c, p, "Farming");
  assert.equal(practice.growth, 0.04);
  c.training[id] = "Playstyle: Aggression";
  c.players.find((p) => p.id === id)!.playstyles.Aggression = 9.99;
  assert.equal(advanceWeek(c).players.find((p) => p.id === id)!.playstyles.Aggression, 10);
});

test("malformed saved workloads normalize to finite bounded schedules", () => {
  const c = createCampaign(DEFAULT_SETTINGS);
  const p = c.players.find((p) => p.id === c.roster[0])!;
  c.trainingSchedules = { [p.id]: { intensity: "invalid" as "Normal", hoursPerDay: NaN, daysPerWeek: Infinity } };
  assert.deepEqual(trainingSchedule(c, p), { intensity: "Normal", hoursPerDay: 4, daysPerWeek: 5 });
  c.trainingSchedules[p.id] = { intensity: "Light", hoursPerDay: -5, daysPerWeek: 99 };
  assert.deepEqual(trainingSchedule(c, p), { intensity: "Light", hoursPerDay: 1, daysPerWeek: 7 });
  const {attributeBonus,innateSources,...scalars}=weeklyPractice(c,p,"Farming");
  assert.ok(Object.values(scalars).every(Number.isFinite));
  assert.ok(Object.values(attributeBonus??{}).every(Number.isFinite));
  assert.ok((innateSources??[]).every(source=>typeof source==='string'));
});
