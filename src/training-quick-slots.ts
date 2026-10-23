import type { Campaign } from "./game";
import { MAX_TRAINING_PRESETS, presetName, saveTrainingPreset } from "./training-presets";
import type { TrainingPreset } from "./training-presets";

// Three one-click shortcuts beside "Rest the squad". Each slot pins a saved
// training preset by ID; the plan itself lives in Campaign.trainingPresets.
export const QUICK_SLOTS = 3;

/** Pinned presets per slot; a missing, deleted or repeated ID reads as empty. */
export function quickSlots(c: Campaign): (TrainingPreset | null)[] {
  const seen = new Set<string>();
  return Array.from({ length: QUICK_SLOTS }, (_, slot) => {
    const id = c.trainingQuickSlots?.[slot];
    const preset = typeof id === "string" && !seen.has(id) ? c.trainingPresets?.find(p => p.id === id) : undefined;
    if (!preset) return null;
    seen.add(preset.id);
    return preset;
  });
}

const validSlot = (slot: number) => Number.isInteger(slot) && slot >= 0 && slot < QUICK_SLOTS;

export function pinQuickSlot(c: Campaign, slot: number, presetId: string | null): Campaign {
  if (!validSlot(slot) || (presetId && !c.trainingPresets?.some(p => p.id === presetId))) return c;
  const slots = quickSlots(c).map((p, i) => i === slot ? presetId : p?.id === presetId ? null : p?.id ?? null);
  return { ...c, trainingQuickSlots: slots };
}

/** Save the current weekly plan into a slot: overwrite its pinned preset, or create and pin a new one. */
export function saveQuickSlot(c: Campaign, slot: number, newId: string): Campaign {
  if (!validSlot(slot)) return c;
  const pinned = quickSlots(c)[slot];
  if (pinned) return saveTrainingPreset(c, pinned.name, pinned.id);
  const presets = c.trainingPresets ?? [];
  if (presets.length >= MAX_TRAINING_PRESETS) return c;
  let n = slot + 1;
  const taken = (name: string) => presets.some(p => p.name.toLowerCase() === name.toLowerCase());
  while (taken(`Quick plan ${n}`)) n++;
  const saved = saveTrainingPreset(c, `Quick plan ${n}`, newId);
  return saved === c ? c : pinQuickSlot(saved, slot, newId);
}

/** Rename the pinned preset without changing its saved settings. */
export function renameQuickSlot(c: Campaign, slot: number, name: string): Campaign {
  const pinned = quickSlots(c)[slot];
  name = presetName(name);
  if (!pinned || !name || c.trainingPresets!.some(p => p.id !== pinned.id && p.name.toLowerCase() === name.toLowerCase())) return c;
  return { ...c, trainingPresets: c.trainingPresets!.map(p => p.id === pinned.id ? { ...p, name } : p) };
}
