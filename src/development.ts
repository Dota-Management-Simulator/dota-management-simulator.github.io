import type { Campaign, Player, Training } from "./game";
import { campaignWeek, weeklyPractice } from "./contracts";
import { attributeNames, roundTraining, skillDeltas, trainingPlan } from "./training";

const bounded = (value: number, max: number) => Math.max(0, Math.min(max, roundTraining(value)));
const hash = (value: string) => [...value].reduce((n, ch) => Math.imul(n ^ ch.charCodeAt(0), 16777619) >>> 0, 2166136261);

/** Gameplay starting estimates, not historical assessments of real people. */
export function startingAttributes(id: string): Player["stats"] {
  const baseline = 21 + hash(id) % 14;
  return Object.fromEntries(Object.keys(attributeNames).map(key => [key,
    Math.max(15, Math.min(40, baseline + hash(`${id}:${key}`) % 17 - 8)),
  ])) as Player["stats"];
}

export function applyPlayerPractice(p: Player, focus: Training, practice: ReturnType<typeof weeklyPractice>, debt = false) {
  const deltas = skillDeltas(focus, practice);
  for (const key of Object.keys(attributeNames) as (keyof Player["stats"])[])
    p.stats[key] = bounded(p.stats[key] + deltas[key], 99);
  const style = trainingPlan(focus).playstyle;
  if (style && p.playstyles[style] != null)
    p.playstyles[style] = Math.max(1, bounded(p.playstyles[style]! + practice.playstyleGrowth, 10));
  p.energy = bounded(p.energy + practice.energy, 100);
  p.happiness = bounded(p.happiness + (debt ? -10 : practice.happiness), 100);
}

/** Updates the shared player records once per paid week, never at render/load.
 * AI uses the same practice rules without spending the manager's resources. */
export function developWorldPlayers(c: Campaign) {
  const managed = new Set(c.roster);
  const attached = new Set(c.world?.clubs.filter(club => club.active !== false)
    .flatMap(club => [...club.roster, ...club.bench]) ?? []);
  const tick = campaignWeek(c);
  const context: Campaign = { ...c, staffIds: [], sponsorIds: [],
    sponsorships: { deals: [], releasedAt: {} }, contracts: undefined, trainingSchedules: {} };
  for (const p of c.players) {
    if (managed.has(p.id)) continue;
    const offset = hash(p.id);
    const inClub = attached.has(p.id);
    // Reserves practice with their club; unattached players do lighter upkeep.
    const hours = inClub ? 20 + offset % 3 * 5 : 10;
    let focus: Training = "Balanced";
    if (p.energy < 60) focus = "Rest";
    else if (inClub && (tick + offset) % 4 === 0) {
      const keys = Object.keys(attributeNames) as (keyof Player["stats"])[];
      keys.sort((a, b) => p.stats[a] - p.stats[b] || hash(`${p.id}:${a}`) - hash(`${p.id}:${b}`));
      focus = attributeNames[keys[0]];
    }
    context.trainingSchedules![p.id] = { intensity: "Normal", hoursPerDay: hours / 5, daysPerWeek: 5 };
    applyPlayerPractice(p, focus, weeklyPractice(context, p, focus));
  }
}
