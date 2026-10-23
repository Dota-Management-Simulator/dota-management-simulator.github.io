import { test } from "node:test";
import assert from "node:assert/strict";
import { advanceWeek, createCampaign, DEFAULT_SETTINGS, readSave, SAVE_KEY } from "../src/game";
import type { Campaign } from "../src/game";
import { applyTrainingPreset, deleteTrainingPreset, normalizeTrainingPresets, saveTrainingPreset } from "../src/training-presets";
import { setTrainingSchedule, trainingSchedule } from "../src/training";

function practicePlan() {
  let c = createCampaign(DEFAULT_SETTINGS);
  c = setTrainingSchedule(c, c.roster[0], { intensity: "Intense", hoursPerDay: 6, daysPerWeek: 4 });
  c.training[c.roster[0]] = "Farming";
  c.training[c.roster[1]] = "Playstyle: Aggression";
  c.training[c.roster[2]] = "Rest";
  return c;
}

function load(value: unknown) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true,
    value: { getItem: (key: string) => key === SAVE_KEY ? JSON.stringify(value) : null } });
  try { return readSave(); }
  finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
}

test("squad snapshots restore all focuses and workloads without advancing or altering the campaign", () => {
  const c = practicePlan();
  const before = structuredClone(c);
  const saved = saveTrainingPreset(c, "  Bootcamp  ", "practice");
  assert.deepEqual(c, before);
  assert.equal(saved.trainingPresets![0].name, "Bootcamp");
  assert.equal(saved.trainingPresets![0].players.length, 5);
  let resting = { ...saved, training: Object.fromEntries(c.roster.map(id => [id, "Rest" as const])) };
  resting = setTrainingSchedule(resting, c.roster[0], { intensity: "Light", hoursPerDay: 1, daysPerWeek: 1 });
  const restored = applyTrainingPreset(resting, "practice");
  for (const id of c.roster) {
    assert.equal(restored.training[id], c.training[id]);
    const p = c.players.find(p => p.id === id)!;
    assert.deepEqual(trainingSchedule(restored, p), trainingSchedule(c, p));
  }
  const { training: _focus, trainingSchedules: _schedule, trainingPresets: _presets, ...untouched } = restored;
  const { training: _oldFocus, trainingSchedules: _oldSchedule, ...old } = c;
  assert.deepEqual(untouched, old, "dates, finances, players, results, contracts and other state stay intact");
  assert.equal(resting.training[c.roster[0]], "Rest");
  assert.deepEqual(advanceWeek(restored).players, advanceWeek(c).players, "restored settings drive real weekly development");
});

test("variants remain independent and explicit updates/deletes preserve the active weekly plan", () => {
  let c = saveTrainingPreset(practicePlan(), "Practice", "one");
  const original = structuredClone(c.trainingPresets![0]);
  c = { ...c, training: { ...c.training, [c.roster[0]]: "Rest" } };
  c = saveTrainingPreset(c, "Recovery variant", "two");
  assert.deepEqual(c.trainingPresets![0], original);
  assert.equal(c.trainingPresets![1].players[0].focus, "Rest");
  assert.equal(saveTrainingPreset(c, "practice", "three"), c, "duplicate names are rejected");
  assert.equal(saveTrainingPreset(c, "  ", "three"), c);
  const updated = saveTrainingPreset(c, "Revised practice", "one");
  assert.equal(updated.trainingPresets!.length, 2);
  assert.equal(updated.trainingPresets![0].players[0].focus, "Rest");
  const deleted = deleteTrainingPreset(updated, "two");
  assert.equal(deleted.trainingPresets!.length, 1);
  assert.deepEqual(deleted.training, c.training);
  assert.equal(applyTrainingPreset(c, "missing"), c);
});

test("applying a preset honors current contracts without reducing the stored variant", () => {
  const saved = saveTrainingPreset(practicePlan(), "Practice", "one");
  const p = saved.players.find(p => p.id === saved.roster[0])!;
  const c: Campaign = { ...saved, contracts: { ...saved.contracts, [p.id]: {
    wage: p.wage, bonus: 0, weeks: 18, prizeShare: 0, practiceHours: 10, restDays: 4,
    signedAt: 0, expiresAt: 999999, marketWage: p.wage,
  } } };
  const applied = applyTrainingPreset(c, "one");
  const schedule = trainingSchedule(applied, p);
  assert.equal(schedule.daysPerWeek, 3);
  assert.equal(schedule.hoursPerDay * schedule.daysPerWeek, 10);
  assert.equal(schedule.intensity, "Intense");
  assert.deepEqual(applied.contracts, c.contracts);
  assert.deepEqual(applied.trainingPresets, saved.trainingPresets);
});

test("plans follow retained identities and replacements inherit only a departed player's role", () => {
  const saved = saveTrainingPreset(practicePlan(), "Practice", "one");
  const departedId = saved.roster[0];
  const departed = saved.players.find(p => p.id === departedId)!;
  const replacement = saved.players.find(p => !saved.roster.includes(p.id) && p.role === departed.role)!;
  assert.ok(replacement);
  const c = { ...saved, roster: [replacement.id, ...saved.roster.slice(1)], training: { ...saved.training, [replacement.id]: "Balanced" as const } };
  const applied = applyTrainingPreset(c, "one");
  assert.equal(applied.training[replacement.id], "Farming");
  assert.deepEqual(trainingSchedule(applied, replacement), saved.trainingPresets![0].players[0].schedule);
  assert.equal(applied.training[c.roster[1]], "Playstyle: Aggression");
  assert.equal(applied.training[departedId], c.training[departedId], "non-squad players are untouched");
  const swapped = { ...saved, players: saved.players.map(p => p.id === departedId ? { ...p, role: "Mid" } : p),
    training: { ...saved.training, [departedId]: "Rest" as const } };
  assert.equal(applyTrainingPreset(swapped, "one").training[departedId], "Farming");
});

test("presets survive real save loading while legacy/malformed optional data preserves the campaign", () => {
  const c = saveTrainingPreset(practicePlan(), "Practice", "one");
  assert.deepEqual(load(c)!.trainingPresets, c.trainingPresets);
  const legacy = createCampaign(DEFAULT_SETTINGS);
  assert.equal(load(legacy)!.trainingPresets, undefined);
  for (const bad of [null, {}, "bad", [null, { id: "bad", name: "Bad", players: [null] }]]) {
    const loaded = load({ ...c, trainingPresets: bad })!;
    assert.ok(loaded);
    assert.deepEqual(loaded.trainingPresets, []);
    assert.equal(loaded.cash, c.cash);
    assert.deepEqual(loaded.players, c.players);
    assert.deepEqual(loaded.training, c.training);
  }
  const broken = structuredClone(c.trainingPresets!);
  broken[0].players[0].schedule.hoursPerDay = Infinity;
  assert.equal(normalizeTrainingPresets(broken)[0].players.length, 4);
  const unavailable = structuredClone(c);
  unavailable.trainingPresets![0].players[0].focus = "Playstyle: missing" as "Balanced";
  assert.equal(applyTrainingPreset(unavailable, "one").training[c.roster[0]], "Balanced");
});
