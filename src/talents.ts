import type { Campaign } from "./game";
import { campaignPatch } from "./patches";
import { talentsEnabled } from "./patch-milestones";
import { playerIdentityLock } from './player-identity';
import type { PlayerIdentity } from './player-identity';
import { sharedTalentById } from './player-identity-data';

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
export function automaticTalents(role: number,identity?:PlayerIdentity): TalentPlan {
  if(identity){
    const weights=role===0?{attack:1.2,resources:1.1,spells:.5,health:.6,speed:.7,buildings:.8}:role===1?{attack:.8,resources:.8,spells:1.2,health:.6,speed:1,buildings:.5}:role===2?{attack:.7,resources:.6,spells:1,health:1.2,speed:.8,buildings:1}:{attack:.4,resources:.7,spells:1.4,health:1,speed:1.2,buildings:.5};
    return Object.fromEntries(identity.tree.map(t=>{
      const score=t.choices.map(c=>Object.entries(sharedTalentById.get(c.id)!.effects).reduce((n,[key,value])=>n+value*weights[key as keyof typeof weights],0)*(c.rank===2?1.25:1));
      return [t.level,score[1]>score[0]?1:0];
    })) as TalentPlan;
  }
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
  if (!talentsEnabled(campaignPatch(c)) || !c.roster.includes(id) || playerIdentityLock(c, id)
    || !talentTiers.some(t => t.level === level) || (choice !== 0 && choice !== 1)) return c;
  return { ...c, talentPlans: { ...c.talentPlans, [id]: { ...normalizeTalentPlan(c.talentPlans?.[id]), [level]: choice } } };
}
