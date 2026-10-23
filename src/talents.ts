import type { Campaign } from "./game";
import { campaignPatch } from "./patches";
import { talentsEnabled } from "./patch-milestones";
import { playerTournamentLock } from "./tournament-locks";

export type TalentLevel = 10 | 15 | 20 | 25;
export type TalentPlan = Partial<Record<TalentLevel, 0 | 1>>;
export const talentTiers = [
  { level: 10, choices: [{ name: "Striking power", detail: "+5% attack damage" }, { name: "Resilience", detail: "+8% maximum health" }] },
  { level: 15, choices: [{ name: "Resourceful", detail: "+10% earned gold and experience" }, { name: "Spellcraft", detail: "+8% spell damage and healing" }] },
  { level: 20, choices: [{ name: "Fleet footed", detail: "+6% movement speed" }, { name: "Siege specialist", detail: "+8% building damage" }] },
  { level: 25, choices: [{ name: "Finisher", detail: "+8% attack damage" }, { name: "Unbreakable", detail: "+12% maximum health" }] },
] as const;
export function normalizeTalentPlan(value: unknown): TalentPlan {
  if (!value || typeof value !== "object") return {};
  const plan: TalentPlan = {};
  for (const { level } of talentTiers) {
    const choice = (value as Record<number, unknown>)[level];
    if (choice === 0 || choice === 1) plan[level] = choice;
  }
  return plan;
}
export function automaticTalents(role: number): TalentPlan {
  return { 10: role < 2 ? 0 : 1, 15: role === 0 ? 0 : 1, 20: role === 2 ? 1 : 0, 25: role < 2 ? 0 : 1 };
}
export function talentBonuses(plan: TalentPlan | undefined, level: number) {
  return {
    attack: (level >= 10 && plan?.[10] === 0 ? 1.05 : 1) * (level >= 25 && plan?.[25] === 0 ? 1.08 : 1),
    health: (level >= 10 && plan?.[10] === 1 ? 1.08 : 1) * (level >= 25 && plan?.[25] === 1 ? 1.12 : 1),
    resources: level >= 15 && plan?.[15] === 0 ? 1.1 : 1,
    spells: level >= 15 && plan?.[15] === 1 ? 1.08 : 1,
    speed: level >= 20 && plan?.[20] === 0 ? 1.06 : 1,
    buildings: level >= 20 && plan?.[20] === 1 ? 1.08 : 1,
  };
}
export function choosePlayerTalent(c: Campaign, id: string, level: TalentLevel, choice: 0 | 1): Campaign {
  if (!talentsEnabled(campaignPatch(c)) || !c.roster.includes(id) || playerTournamentLock(c, id)
    || !talentTiers.some(t => t.level === level) || (choice !== 0 && choice !== 1)) return c;
  return { ...c, talentPlans: { ...c.talentPlans, [id]: { ...normalizeTalentPlan(c.talentPlans?.[id]), [level]: choice } } };
}
