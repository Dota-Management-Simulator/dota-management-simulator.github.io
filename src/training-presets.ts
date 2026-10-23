import type { Campaign, Player } from "./game";
import { attributeNames, setTrainingSchedule, trainingOptions, trainingSchedule } from "./training";
import type { Training, TrainingSchedule } from "./training";

export interface TrainingPreset {
  id: string;
  name: string;
  players: { playerId: string; role: string; focus: Training; schedule: TrainingSchedule }[];
}

export const MAX_TRAINING_PRESETS = 20;
export const presetName = (name: string) => name.trim().slice(0, 60);

// Optional data must never prevent an otherwise valid campaign from loading.
export function normalizeTrainingPresets(value: unknown): TrainingPreset[] {
  if (!Array.isArray(value)) return [];
  const ids = new Set<string>();
  return value.flatMap((raw): TrainingPreset[] => {
    if (!raw || typeof raw !== "object" || typeof raw.id !== "string" || !raw.id || ids.has(raw.id)
      || typeof raw.name !== "string" || !presetName(raw.name) || !Array.isArray(raw.players)) return [];
    const playerIds = new Set<string>();
    const players = raw.players.slice(0, 5).flatMap((entry: unknown): TrainingPreset["players"] => {
      if (!entry || typeof entry !== "object") return [];
      const e = entry as Record<string, unknown>;
      if (typeof e.playerId !== "string" || !e.playerId || playerIds.has(e.playerId)
        || typeof e.role !== "string" || typeof e.focus !== "string") return [];
      const schedule = e.schedule as TrainingSchedule | undefined;
      if (!schedule || !["Light", "Normal", "Intense"].includes(schedule.intensity)
        || !Number.isFinite(schedule.hoursPerDay) || !Number.isFinite(schedule.daysPerWeek)) return [];
      const general = ["Balanced", "Rest", "Happiness", "Map awareness", ...Object.values(attributeNames)];
      if (!general.includes(e.focus) && !e.focus.startsWith("Playstyle: ")) return [];
      playerIds.add(e.playerId);
      return [{ playerId: e.playerId, role: e.role, focus: e.focus as Training, schedule: {
        intensity: schedule.intensity,
        hoursPerDay: Math.max(1, Math.min(12, schedule.hoursPerDay)),
        daysPerWeek: Math.max(1, Math.min(7, Math.round(schedule.daysPerWeek))),
      } }];
    });
    if (!players.length) return [];
    ids.add(raw.id);
    return [{ id: raw.id, name: presetName(raw.name), players }];
  }).slice(0, MAX_TRAINING_PRESETS);
}

/** Snapshot current settings; supplying an existing ID explicitly replaces it. */
export function saveTrainingPreset(c: Campaign, name: string, id: string): Campaign {
  name = presetName(name);
  const presets = c.trainingPresets ?? [];
  if (!name || !id || presets.some(p => p.id !== id && p.name.toLowerCase() === name.toLowerCase())
    || (!presets.some(p => p.id === id) && presets.length >= MAX_TRAINING_PRESETS)) return c;
  const preset: TrainingPreset = { id, name, players: c.roster.flatMap(playerId => {
    const p = c.players.find(p => p.id === playerId);
    return p ? [{ playerId, role: p.role, focus: c.training[playerId] || "Balanced", schedule: trainingSchedule(c, p) }] : [];
  }) };
  return { ...c, trainingPresets: presets.some(p => p.id === id)
    ? presets.map(p => p.id === id ? preset : p) : [...presets, preset] };
}

export function deleteTrainingPreset(c: Campaign, id: string): Campaign {
  return { ...c, trainingPresets: (c.trainingPresets ?? []).filter(p => p.id !== id) };
}

export function presetEntry(preset: TrainingPreset, player: Player, roster: string[]) {
  // A retained player's plan follows their identity; replacements inherit a vacant role.
  return preset.players.find(p => p.playerId === player.id)
    ?? preset.players.find(p => p.role === player.role && !roster.includes(p.playerId));
}

export function applyTrainingPreset(c: Campaign, id: string): Campaign {
  const preset = c.trainingPresets?.find(p => p.id === id);
  if (!preset) return c;
  let next = { ...c, training: { ...c.training } };
  for (const playerId of c.roster) {
    const player = c.players.find(p => p.id === playerId);
    if (!player) continue;
    const entry = presetEntry(preset, player, c.roster);
    if (!entry) continue;
    const allowed = trainingOptions(player).flatMap(g => g.options);
    next.training[playerId] = allowed.includes(entry.focus) ? entry.focus : "Balanced";
    next = setTrainingSchedule(next, playerId, entry.schedule);
  }
  return next;
}
