import type { Campaign, Player, Training } from "./game";
import { weeklyPractice } from "./contracts";
import { roundTraining, skillDeltas, trainingPlan, trainingSchedule } from "./training";

export const CAMP_FEE = 500;
export interface Bootcamp {
  remaining: number;
  playerIds: string[];
}
export interface CampReport {
  year: number; week: number; attended: number; refunded: number;
  players: { id: string; name: string; outcome: string }[];
}

export function normalizeCampReport(value: unknown): CampReport | undefined {
  if (!value || typeof value !== "object") return;
  const r = value as CampReport;
  if (![r.year, r.week, r.attended, r.refunded].every(Number.isFinite) || !Array.isArray(r.players)) return;
  return { year: r.year, week: r.week, attended: Math.max(0, Math.min(5, r.attended)), refunded: Math.max(0, Math.min(2500, r.refunded)),
    players: r.players.filter(p => p && typeof p.id === "string" && typeof p.name === "string" && typeof p.outcome === "string")
      .slice(0, 5).map(p => ({ id: p.id, name: p.name.slice(0, 80), outcome: p.outcome.slice(0, 300) })) };
}

export function normalizeBootcamp(value: unknown): Bootcamp | undefined {
  if (!value || typeof value !== "object") return;
  const row = value as Bootcamp;
  if (!Number.isInteger(row.remaining) || row.remaining < 1 || row.remaining > 3 || !Array.isArray(row.playerIds)) return;
  const playerIds = [...new Set(row.playerIds.filter((id): id is string => typeof id === "string" && !!id))].slice(0, 5);
  if (playerIds.length) return { remaining: row.remaining, playerIds };
}

export function campReason(c: Campaign, p: Player, plan: Training, energyDelta: number): string | null {
  if (!c.roster.includes(p.id)) return "No longer in the squad";
  if (plan === "Rest") return "Rest protected";
  const focus = trainingPlan(plan);
  if (!focus.stats.length && (!focus.playstyle || p.playstyles[focus.playstyle] == null)) return "No development focus";
  const schedule = trainingSchedule(c, p);
  if (schedule.hoursPerDay * schedule.daysPerWeek < 10) return "Needs at least 10h of contracted practice";
  if (p.energy < 50 || p.energy + energyDelta - 6 < 40) return "Fatigue safeguard: needs 50 energy now and 40 after camp";
  return null;
}

export function campPractice(c: Campaign, p: Player, plan: Training, practice: {
  growth: number; maintenance: number; playstyleGrowth: number; energy: number; happiness: number;
}) {
  if (!c.bootcamp?.playerIds.includes(p.id) || campReason(c, p, plan, practice.energy)) return practice;
  return { ...practice, growth: roundTraining(practice.growth * 1.35),
    playstyleGrowth: roundTraining(practice.playstyleGrowth * 1.35), energy: roundTraining(practice.energy - 6) };
}

export function campAttendance(c: Campaign) {
  const base = { ...c, bootcamp: undefined };
  return (c.bootcamp?.playerIds ?? c.roster).map(id => {
    const player = c.players.find(p => p.id === id);
    if (!player) return { id, name: "Departed player", reason: "No longer in the squad" };
    const plan = c.training[id] ?? "Balanced";
    const practice = weeklyPractice(base, player, plan);
    const reason = campReason(c, player, plan, practice.energy);
    const boosted = campPractice({ ...c, bootcamp: { remaining: 1, playerIds: [id] } }, player, plan, practice);
    const normalDeltas = skillDeltas(plan, practice), campDeltas = skillDeltas(plan, boosted);
    const bonus = roundTraining(Object.keys(player.stats).reduce((sum, key) => {
      const k = key as keyof Player["stats"];
      const bound = (n: number) => Math.max(0, Math.min(99, n));
      return sum + bound(player.stats[k] + campDeltas[k]) - bound(player.stats[k] + normalDeltas[k]);
    }, 0));
    const style = trainingPlan(plan).playstyle;
    const styleBonus = style && player.playstyles[style] != null ? roundTraining(Math.min(10, player.playstyles[style]! + boosted.playstyleGrowth) - Math.min(10, player.playstyles[style]! + practice.playstyleGrowth)) : 0;
    const energy = roundTraining(Math.max(0, Math.min(100, player.energy + boosted.energy)));
    return { id, name: player.name, reason, preview: reason ? undefined : `+${bonus} total attribute points${styleBonus ? ` · +${styleBonus} playstyle` : ""} beyond normal practice · ${energy} energy after training` };
  });
}

export function campBlocker(c: Campaign, weeks: number): string | null {
  if (c.bootcamp) return "Finish or cancel the current camp first.";
  if (!Number.isInteger(weeks) || weeks < 1 || weeks > 3) return "Choose one to three weeks.";
  if (!c.roster.length) return "Recruit players before booking a camp.";
  if (!campAttendance(c).some(row => !row.reason)) return "No players can attend with the current training and energy.";
  if (c.cash < c.roster.length * CAMP_FEE * weeks) return "Insufficient cash for the prepaid camp.";
  return null;
}

function payment(c: Campaign, label: string, amount: number): Campaign {
  return { ...c, cash: c.cash + amount, transactions: [{ year: c.year, week: c.week, label, amount }, ...c.transactions].slice(0, 80) };
}

export function bookCamp(c: Campaign, weeks: number): Campaign {
  if (campBlocker(c, weeks)) return c;
  return { ...payment(c, "Bootcamp reservation", -c.roster.length * CAMP_FEE * weeks),
    bootcamp: { remaining: weeks, playerIds: [...c.roster] } };
}

export function cancelCamp(c: Campaign): Campaign {
  if (!c.bootcamp) return c;
  return { ...payment(c, "Unused bootcamp weeks refunded", c.bootcamp.remaining * c.bootcamp.playerIds.length * CAMP_FEE), bootcamp: undefined };
}

/** Called once after each paid management week, using attendance from before practice. */
export function finishCampWeek(c: Campaign, attendance: ReturnType<typeof campAttendance>): void {
  if (!c.bootcamp) return;
  const skipped = attendance.filter(row => row.reason);
  if (skipped.length) Object.assign(c, payment(c, "Skipped bootcamp places refunded", skipped.length * CAMP_FEE));
  const attended = attendance.length - skipped.length;
  c.lastCampReport = { year: c.year, week: c.week, attended, refunded: skipped.length * CAMP_FEE,
    players: attendance.map(row => ({ id: row.id, name: row.name, outcome: row.reason ? `Skipped: ${row.reason}` : row.preview ?? "Attended" })) };
  c.log = [`Bootcamp: ${attended} attended; ${skipped.length} skipped. ${c.bootcamp.remaining === 1 ? "Camp complete." : `${c.bootcamp.remaining - 1} weeks remain.`}`, ...c.log].slice(0, 30);
  c.bootcamp = c.bootcamp.remaining > 1 ? { ...c.bootcamp, remaining: c.bootcamp.remaining - 1 } : undefined;
}
