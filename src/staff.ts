import type { PatchAxis } from "./patches";

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  weekly: number;
  specialty: string;
  benefit: string;
  color: string;
  coverage: Partial<Record<PatchAxis, number>>;
  extraHeroes: number;
}

/** Fictional staff and gameplay costs. Widths are total points, not ± values. */
export const staffCatalog: StaffMember[] = [
  { id: "c1", name: "Morgan Hale", role: "Head coach", weekly: 650, color: "sand",
    specialty: "Lanes & game tempo", benefit: "Training growth up to +1 at 20h/week",
    coverage: { tempo: 5, laning: 5 }, extraHeroes: 0 },
  { id: "c2", name: "Ari Quinn", role: "Analyst", weekly: 450, color: "lilac",
    specialty: "Teamfights & map information", benefit: "Discovers 1 additional favored hero",
    coverage: { teamfight: 4, vision: 4 }, extraHeroes: 1 },
  { id: "c3", name: "Sam Ellis", role: "Physical therapist", weekly: 400, color: "moss",
    specialty: "Recovery & wellbeing", benefit: "Weekly energy recovery +8",
    coverage: {}, extraHeroes: 0 },
  { id: "c4", name: "Reese Park", role: "Economy coach", weekly: 500, color: "sand",
    specialty: "Farming & objective timings", benefit: "Reads the resource and building meta",
    coverage: { economy: 4, objectives: 4 }, extraHeroes: 0 },
  { id: "c5", name: "Jamie Vale", role: "Strategy scout", weekly: 425, color: "moss",
    specialty: "Split pushing & vision", benefit: "Discovers 1 additional favored hero",
    coverage: { splitpush: 5, vision: 5 }, extraHeroes: 1 },
  { id: "c6", name: "Alex Rowan", role: "Hero specialist", weekly: 550, color: "lilac",
    specialty: "Hero research", benefit: "Discovers 2 additional favored heroes",
    coverage: {}, extraHeroes: 2 },
];

/** AI clubs receive a stable, modest research staff; no omniscient draft. */
export function oppositionStaff(teamKey: string): string[] {
  const n = [...teamKey].reduce((sum, char) => Math.imul(sum ^ char.charCodeAt(0), 16777619) >>> 0, 2166136261);
  return [["c1", "c5"], ["c2", "c4"], ["c4", "c6"], ["c1", "c2"]][n % 4];
}
