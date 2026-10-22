import type { Campaign, Player } from "./game";

export const trainingIntensities = { Light: 0.75, Normal: 1, Intense: 1.5 } as const;
export interface TrainingSchedule {
  intensity: keyof typeof trainingIntensities;
  hoursPerDay: number;
  daysPerWeek: number;
}

export const roundTraining = (value: number) => Math.round(value * 100) / 100;

export function trainingLimits(c: Campaign, p: Player) {
  const contract = c.contracts?.[p.id];
  return {
    maxDays: contract ? 7 - contract.restDays : 7,
    maxHours: contract?.practiceHours ?? 84,
  };
}

// Optional schedules preserve the exact old workload until the manager edits it.
// Reconcile against current terms on every read, including after renegotiation.
export function trainingSchedule(c: Campaign, p: Player): TrainingSchedule {
  const contract = c.contracts?.[p.id];
  const limits = trainingLimits(c, p);
  const saved = c.trainingSchedules?.[p.id];
  const defaultDays = contract ? limits.maxDays : 5;
  const days = Number.isFinite(saved?.daysPerWeek) ? Math.round(saved!.daysPerWeek) : defaultDays;
  const daysPerWeek = Math.max(1, Math.min(limits.maxDays, days));
  const hours = Number.isFinite(saved?.hoursPerDay) ? saved!.hoursPerDay : (contract?.practiceHours ?? 20) / defaultDays;
  return {
    intensity: saved && Object.hasOwn(trainingIntensities, saved.intensity) ? saved.intensity : "Normal",
    daysPerWeek,
    hoursPerDay: Math.max(1, Math.min(12, limits.maxHours / daysPerWeek, hours)),
  };
}

export function setTrainingSchedule(c: Campaign, id: string, change: Partial<TrainingSchedule>): Campaign {
  const p = c.players.find((p) => p.id === id);
  if (!p || !c.roster.includes(id)) return c;
  const schedules = { ...c.trainingSchedules, [id]: { ...trainingSchedule(c, p), ...change } };
  return { ...c, trainingSchedules: { ...schedules, [id]: trainingSchedule({ ...c, trainingSchedules: schedules }, p) } };
}

export const attributeNames = {
  creativity: "Creativity",
  stability: "Stability",
  confidence: "Confidence",
  stamina: "Stamina",
  heroPool: "Hero pool",
  laning: "Laning",
  teamfights: "Teamfights",
  farming: "Farming",
  skirmish: "Skirmish",
  vision: "Vision",
  intuition: "Intuition",
  pushing: "Pushing",
} as const satisfies Record<keyof Player["stats"], string>;

type Playstyle = keyof Player["playstyles"];
export type Training =
  | (typeof attributeNames)[keyof typeof attributeNames]
  | "Balanced"
  | "Map awareness"
  | "Rest"
  | "Happiness"
  | `Playstyle: ${Playstyle}`;

// Original multi-attribute plans retain their effects for existing saves.
export function trainingPlan(focus: Training) {
  let stats: (keyof Player["stats"])[] = [];
  let playstyle: Playstyle | undefined;
  if (focus === "Balanced") stats = ["stability", "stamina"];
  else if (focus === "Laning") stats = ["laning", "skirmish"];
  else if (focus === "Teamfights") stats = ["teamfights", "stability"];
  else if (focus === "Map awareness") stats = ["vision", "intuition", "pushing"];
  else if (focus === "Hero pool") stats = ["heroPool", "creativity"];
  else if (focus.startsWith("Playstyle: ")) playstyle = focus.slice("Playstyle: ".length) as Playstyle;
  else stats = (Object.keys(attributeNames) as (keyof Player["stats"])[])
    .filter((key) => attributeNames[key] === focus);
  return {
    stats,
    playstyle,
    energy: focus === "Rest" ? 24 : focus === "Balanced" || focus === "Happiness" ? 7 : -5,
    happiness: focus === "Rest" ? 4 : focus === "Happiness" ? 6 : 1,
  };
}

export function trainingOptions(player: Player): { label: string; options: Training[] }[] {
  return [
    { label: "General & recovery", options: ["Balanced", "Rest", "Happiness", "Map awareness"] },
    { label: "Player attributes", options: Object.values(attributeNames) },
    {
      label: "Playstyles · 1–10",
      options: (Object.keys(player.playstyles) as Playstyle[])
        .filter((key) => player.playstyles[key] != null)
        .map((key) => `Playstyle: ${key}` as const),
    },
  ];
}

export function trainingEffect(focus: Training, practice: { growth: number; playstyleGrowth: number; energy: number; happiness: number }, debt: boolean) {
  const plan = trainingPlan(focus);
  const effects: string[] = [];
  if (plan.stats.length) effects.push(`+${practice.growth} ${plan.stats.map((key) => attributeNames[key].toLowerCase()).join(" & ")}`);
  if (plan.playstyle) effects.push(`+${practice.playstyleGrowth} ${plan.playstyle.toLowerCase()} (max 10)`);
  effects.push(`${practice.energy < 0 ? "−" : "+"}${Math.abs(practice.energy)} energy`);
  effects.push(debt ? "−10 happiness (debt)" : `${practice.happiness < 0 ? "−" : "+"}${Math.abs(practice.happiness)} happiness`);
  return effects.join(" · ");
}
