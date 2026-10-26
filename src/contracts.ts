import type { Campaign, Player, Training } from "./game";
import { roundTraining, trainingIntensities, trainingPlan, trainingSchedule } from "./training";
import { sponsorBenefits } from "./sponsors";
import { playerTournamentLock } from "./tournament-locks";
import { campPractice } from "./bootcamp";

export interface ContractOffer {
  wage: number;
  bonus: number;
  weeks: number;
  prizeShare: number;
  practiceHours: number;
  restDays: number;
}
export interface PlayerContract extends ContractOffer {
  signedAt: number;
  expiresAt: number;
  marketWage: number;
}
export const campaignWeek = (c: Campaign) => c.calendar
  ? c.calendar.contractEpoch + Math.floor((Date.parse(c.calendar.now) - Date.parse(c.calendar.origin)) / 604800000)
  : c.year * 18 + c.week - 1;
export const weeksRemaining = (c: Campaign, contract: PlayerContract) =>
  Math.max(0, contract.expiresAt - campaignWeek(c));
export const releaseCost = (c: Campaign, id: string) => {
  const contract = c.contracts?.[id];
  return contract ? Math.ceil(weeksRemaining(c, contract) * contract.wage * 0.25) : 0;
};
export function contractPreferences(p: Player) {
  return {
    practiceHours: p.stats.stamina >= 80 ? 40 : 30,
    restDays: p.stats.stamina < 70 ? 3 : 2,
    weeks: p.stats.confidence < 80 ? 36 : 18,
  };
}
export function initialOffer(c: Campaign, p: Player): ContractOffer {
  const existing = c.contracts?.[p.id];
  return {
    wage: p.wage, bonus: 0, weeks: existing?.weeks ?? 18,
    prizeShare: existing?.prizeShare ?? 0,
    practiceHours: existing?.practiceHours ?? 30,
    restDays: existing?.restDays ?? 2,
  };
}
export function validOffer(o: ContractOffer): boolean {
  return Number.isSafeInteger(o.wage) && o.wage >= 50 && o.wage <= 100000 &&
    Number.isSafeInteger(o.bonus) && o.bonus >= 0 && o.bonus <= 1000000 &&
    [6, 18, 36].includes(o.weeks) && [20, 30, 40].includes(o.practiceHours) &&
    [1, 2, 3].includes(o.restDays) && Number.isInteger(o.prizeShare) && o.prizeShare >= 0 && o.prizeShare <= 10;
}
export function assessOffer(c: Campaign, p: Player, o: ContractOffer): {
  status: "accepted" | "counter" | "invalid";
  message: string;
  counter?: ContractOffer;
} {
  if (!validOffer(o)) return { status: "invalid", message: "Use the listed term options, whole-dollar pay ($50–$100,000), a bonus up to $1,000,000, and a 0–10% prize share." };
  const preference = contractPreferences(p);
  const market = c.contracts?.[p.id]?.marketWage ?? p.wage;
  // Illustrative player preferences, never claims about real players' demands.
  const required = Math.ceil(market * (
    1 + (o.practiceHours - preference.practiceHours) * 0.008 +
    (preference.restDays - o.restDays) * 0.09 +
    (o.weeks < preference.weeks ? 0.06 : 0)
  ));
  const packageValue = o.wage + o.bonus / o.weeks + market * o.prizeShare * 0.015;
  if (packageValue >= required) return { status: "accepted", message: "I’m happy with this package. We have a deal." };
  const counter = { ...o, wage: Math.max(50, Math.ceil((required - o.bonus / o.weeks - market * o.prizeShare * 0.015) / 10) * 10) };
  return { status: "counter", counter, message: "I’d need more weekly pay for these terms. You can also reduce practice, offer more rest or security, or improve my bonus or prize share." };
}

export function weeklyPractice(c: Campaign, p: Player, plan: Training) {
  const focus = trainingPlan(plan);
  const contract = c.contracts?.[p.id];
  const schedule = trainingSchedule(c, p);
  const hours = schedule.hoursPerDay * schedule.daysPerWeek;
  const restDays = 7 - schedule.daysPerWeek;
  const intensity = trainingIntensities[schedule.intensity];
  const volume = hours / (contract?.practiceHours ?? 20);
  const baseGrowth = hours <= 20 ? hours / 20 : hours / 10 - 1;
  const sponsor = sponsorBenefits(c, plan);
  const mediaFactor = Math.max(0.5, 1 - sponsor.mediaHours * 0.05);
  const coachGrowth = c.staffIds.includes("c1") ? Math.min(1, hours / 20) : 0;
  const readiness = Math.max(0.25, Math.min(1, p.energy / 40));
  const growth = plan === "Rest" ? 0 : roundTraining(((baseGrowth + coachGrowth) * intensity + sponsor.growth * volume) * mediaFactor * readiness);
  const playstyleGrowth = plan === "Rest" ? 0 : roundTraining(volume * intensity * mediaFactor * readiness);
  // Ten effective practice hours maintain all attributes. Less practice causes
  // gradual rust, including full recovery weeks; extra practice develops focus.
  const effectiveHours = plan === "Rest" ? 0 : hours * intensity * mediaFactor;
  const maintenance = roundTraining(-0.2 * (1 - Math.min(1, effectiveHours / 10)));
  const energy = roundTraining((plan === "Rest" ? focus.energy : focus.energy - (hours - 20) * 0.6 + (restDays - 2) * 4 - hours * (intensity - 1) * 0.8) + (c.staffIds.includes("c3") ? 8 : 0) + sponsor.energy);
  const expired = contract && weeksRemaining(c, contract) === 0 && !playerTournamentLock(c, p.id);
  const payMorale = contract ? Math.max(-3, Math.min(2, Math.round((p.wage / contract.marketWage - 1) * 5))) : 0;
  const morale = plan === "Happiness" ? focus.happiness * volume * intensity : focus.happiness;
  return campPractice(c, p, plan, { growth, maintenance, playstyleGrowth, energy, happiness: roundTraining(morale + payMorale - (expired ? 2 : 0) + sponsor.happiness) });
}
