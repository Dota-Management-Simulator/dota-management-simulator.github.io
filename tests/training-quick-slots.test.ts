import { test } from "node:test";
import assert from "node:assert/strict";
import { createCampaign, DEFAULT_SETTINGS, readSave, SAVE_KEY } from "../src/game";
import type { Campaign } from "../src/game";
import { applyTrainingPreset, deleteTrainingPreset, MAX_TRAINING_PRESETS, saveTrainingPreset } from "../src/training-presets";
import { setTrainingSchedule, trainingSchedule } from "../src/training";
import { pinQuickSlot, quickSlots, renameQuickSlot, saveQuickSlot } from "../src/training-quick-slots";

const withFarming = (c: Campaign) => ({ ...setTrainingSchedule(c, c.roster[0], { intensity: "Intense", daysPerWeek: 4 }), training: { ...c.training, [c.roster[0]]: "Farming" as const } });

test("an empty quick slot saves a new shared preset and pins it", () => {
  const c = withFarming(createCampaign(DEFAULT_SETTINGS));
  assert.deepEqual(quickSlots(c), [null, null, null], "saves without quick slots read as empty");
  const saved = saveQuickSlot(c, 1, "quick-a");
  assert.equal(c.trainingPresets, undefined, "saving does not mutate the original campaign");
  assert.deepEqual(saved.trainingQuickSlots, [null, "quick-a", null]);
  assert.equal(saved.trainingPresets?.[0].name, "Quick plan 2", "the plan also appears in the full saved-plans list");
  const second = saveQuickSlot(saveTrainingPreset(saved, "Quick plan 1", "manual"), 0, "quick-b");
  assert.equal(second.trainingPresets?.find(p => p.id === "quick-b")?.name, "Quick plan 3", "generated names never duplicate");
});

test("quick slots apply, overwrite and rename the same preset the full panel uses", () => {
  let c = saveQuickSlot(withFarming(createCampaign(DEFAULT_SETTINGS)), 0, "quick");
  const id = c.roster[0];
  const rested = { ...c, training: Object.fromEntries(c.roster.map(p => [p, "Rest" as const])) };
  assert.deepEqual(applyTrainingPreset(rested, quickSlots(c)[0]!.id).training[id], "Farming");

  c = renameQuickSlot(c, 0, "  Grind week ");
  assert.equal(c.trainingPresets?.[0].name, "Grind week");
  assert.deepEqual(c.trainingPresets?.[0].players, saveQuickSlot(withFarming(createCampaign(DEFAULT_SETTINGS)), 0, "x").trainingPresets?.[0].players, "renaming keeps saved settings");
  const other = saveTrainingPreset(c, "Match week", "match");
  assert.equal(renameQuickSlot(other, 0, "match WEEK"), other, "duplicate names are rejected");
  assert.equal(renameQuickSlot(c, 2, "Nope"), c, "empty slots cannot be renamed");

  const changed = { ...setTrainingSchedule(c, id, { intensity: "Light" }), training: { ...c.training, [id]: "Laning" as const } };
  const updated = saveQuickSlot(changed, 0, "ignored");
  assert.equal(updated.trainingPresets?.length, 1, "overwriting a pinned slot replaces it in place");
  assert.equal(updated.trainingPresets?.[0].name, "Grind week");
  assert.equal(updated.trainingPresets?.[0].players.find(p => p.playerId === id)?.focus, "Laning");
  assert.equal(updated.trainingPresets?.[0].players.find(p => p.playerId === id)?.schedule.intensity, trainingSchedule(changed, changed.players.find(p => p.id === id)!).intensity);
});

test("pinning moves presets between slots, and deleted or missing presets read as empty", () => {
  let c = saveTrainingPreset(saveTrainingPreset(createCampaign(DEFAULT_SETTINGS), "A", "a"), "B", "b");
  c = pinQuickSlot(pinQuickSlot(c, 0, "a"), 2, "b");
  assert.deepEqual(quickSlots(c).map(p => p?.id ?? null), ["a", null, "b"]);
  c = pinQuickSlot(c, 1, "a");
  assert.deepEqual(c.trainingQuickSlots, [null, "a", "b"], "a preset occupies only one slot");
  assert.equal(pinQuickSlot(c, 0, "missing"), c);
  assert.equal(pinQuickSlot(c, 5, "a"), c);
  assert.deepEqual(quickSlots(deleteTrainingPreset(c, "b")).map(p => p?.id ?? null), [null, "a", null]);
  assert.deepEqual(quickSlots({ ...c, trainingQuickSlots: ["b", 7, "b"] as never }).map(p => p?.id ?? null), ["b", null, null], "malformed and repeated IDs read as empty");
  assert.deepEqual(pinQuickSlot(c, 1, null).trainingQuickSlots, [null, null, "b"]);
});

test("a full saved-plans list blocks new quick plans, and pins survive loading", () => {
  let c = createCampaign(DEFAULT_SETTINGS);
  for (let i = 0; i < MAX_TRAINING_PRESETS; i++) c = saveTrainingPreset(c, `Plan ${i}`, `p${i}`);
  assert.equal(saveQuickSlot(c, 0, "extra"), c);
  c = pinQuickSlot(c, 2, "p4");
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (key: string) => key === SAVE_KEY ? JSON.stringify(c) : null } });
  try {
    assert.equal(quickSlots(readSave()!)[2]?.name, "Plan 4");
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
