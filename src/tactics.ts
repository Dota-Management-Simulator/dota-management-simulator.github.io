import type { BattlePlayer, Side } from "./battle";
import { buildStyles } from "./items";
import type { BuildStyle } from "./items";

export type GamePhase = "early" | "mid" | "late";
export const gamePhases: GamePhase[] = ["early", "mid", "late"];
export const phaseLabels = { early: "Early · 0–15 min", mid: "Mid · 15–40 min", late: "Late · 40+ min" };
export const phaseAt = (seconds: number): GamePhase => seconds < 900 ? "early" : seconds < 2400 ? "mid" : "late";
export interface Strategy {
  id: string; name: string; phases: GamePhase[]; kind: "gank" | "push" | "roshan" | "protect" | "item" | "defend" | "farm" | "disengage";
  description: string; roles: number[]; lane?: number; item?: "bkb" | "rapier";
  staff?: string; skill?: string; threshold?: number;
  /** Match-earned access is permanent; specialist access lasts while employed. */
  victory?: { teams: number; opponent?: string; opponentName?: string };
}
export const strategies: Strategy[] = [
  { id: "mid-top", name: "Mid ganks top", phases: ["early"], kind: "gank", roles: [1], lane: 0, description: "Mid leaves farm to look for a top-lane pickoff with the lane partners." },
  { id: "mid-bottom", name: "Mid ganks bottom", phases: ["early"], kind: "gank", roles: [1], lane: 2, description: "Mid rotates bottom. Travel and a failed opening cost lane time." },
  { id: "help-losing", name: "Mid helps the losing sidelane", phases: ["early"], kind: "gank", roles: [1], staff: "c1", skill: "intuition", threshold: 50, description: "Choose the sidelane under most pressure from your deaths and lost towers." },
  { id: "supports-mid", name: "Supports gank mid", phases: ["early"], kind: "gank", roles: [3, 4], lane: 1, description: "Both supports leave their lanes and seek a visible mid target." },
  ...([0, 1, 2] as const).map(lane => ({ id: `push-${lane}`, name: `Push ${["top", "mid", "bottom"][lane]}`, phases: ["mid", "late"] as GamePhase[], kind: "push" as const, roles: [1, 2, 3, 4], lane, description: "Group behind your wave and attack the next legal building, continuing through barracks and base defenses. Carry keeps farming." })),
  { id: "protect-carry", name: "Protect the carry", phases: ["mid", "late"], kind: "protect", roles: [3, 4], description: "Supports escort the carry for 90 seconds, sacrificing their own farm." },
  { id: "roshan", name: "Attempt Roshan", phases: ["mid", "late"], kind: "roshan", roles: [0, 1, 2, 3, 4], staff: "c4", skill: "intuition", threshold: 50, description: "Gather at the pit. Fight Roshan for gold and one expiring Aegis; enemies can contest." },
  { id: "high-ground", name: "Group for high ground", phases: ["late"], kind: "push", roles: [0, 1, 2, 3, 4], description: "Commit all five to an exposed lane and then the Ancient. Retreat rules still apply." },
  { id: "split-push", name: "Offlaner split pushes", phases: ["mid", "late"], kind: "push", roles: [2], staff: "c5", skill: "pushing", threshold: 50, description: "Offlaner pressures the least defended visible lane. Avoids a detected numerical disadvantage." },
  { id: "buy-bkb", name: "Prioritize Black King Bar", phases: ["mid", "late"], kind: "item", roles: [0], item: "bkb", description: "Selected player or all eligible teammates save match gold for BKB next, delaying the normal build." },
  { id: "buy-rapier", name: "Save for Divine Rapier", phases: ["late"], kind: "item", roles: [0], item: "rapier", staff: "c6", skill: "creativity", threshold: 55, description: "Selected player or all eligible teammates save for Rapier. It drops on death and opponents can pick it up." },
  ...([0, 1, 2] as const).map(lane => ({ id: `defend-${lane}`, name: `Defend ${["top", "mid", "bottom"][lane]}`, phases: ["early", "mid", "late"] as GamePhase[], kind: "defend" as const, roles: [1, 2, 3, 4], lane, description: "Mid, offlane and supports fall back to the next allied building in this lane. The carry keeps farming; defending costs their own farm time." })),
  ...([0, 1, 2] as const).map(lane => ({ id: `farm-${lane}`, name: `Secure ${["top", "mid", "bottom"][lane]} farm`, phases: ["early", "mid", "late"] as GamePhase[], kind: "farm" as const, roles: [0, 3, 4], lane, description: "The carry farms this lane while both supports escort. Avoid visible superior numbers and sacrifice support farm for safety." })),
  { id: "disengage", name: "Disengage & regroup", phases: ["early", "mid", "late"], kind: "disengage", roles: [0, 1, 2, 3, 4], description: "Cancel the current movement and pull living teammates toward your surviving defenses. Existing disables and travel still matter." },
  { id: "follow-up", name: "Five-player tower conversion", phases: ["mid", "late"], kind: "push", roles: [0, 1, 2, 3, 4], staff: "c1", victory: { teams: 1 }, description: "Commit all five to the next mid-lane building behind your wave. More siege pressure costs the carry's farming time.", lane: 1 },
  { id: "countergank-top", name: "Countergank top", phases: ["early", "mid"], kind: "gank", roles: [2, 3, 4], lane: 0, staff: "c1", victory: { teams: 2 }, description: "Offlaner and supports rotate top to punish a visible enemy commitment. Failed rotations sacrifice their lane resources." },
  { id: "countergank-bottom", name: "Countergank bottom", phases: ["early", "mid"], kind: "gank", roles: [2, 3, 4], lane: 2, staff: "c1", victory: { teams: 2 }, description: "Offlaner and supports rotate bottom to punish a visible enemy commitment. Failed rotations sacrifice their lane resources." },
  { id: "pincer-mid", name: "Collapse on mid", phases: ["mid", "late"], kind: "gank", roles: [1, 2, 3, 4], lane: 1, staff: "c5", victory: { teams: 3 }, description: "Four players converge on a visible mid-lane target while the carry farms. Gathering makes the attack slower and exposes other lanes." },
  { id: "split-support", name: "Support the split push", phases: ["mid", "late"], kind: "push", roles: [2, 3], lane: 2, staff: "c5", victory: { teams: 1, opponent: "alliance", opponentName: "Alliance" }, description: "Offlaner and soft support pressure bottom together. Their tower pressure draws two players away from the main group." },
  { id: "counter-initiate", name: "Hold behind the carry", phases: ["mid", "late"], kind: "protect", roles: [2, 3, 4], staff: "c1", victory: { teams: 5 }, description: "Offlaner and both supports escort the carry and fight nearby threats. Holding three players nearby sacrifices map coverage." },
  { id: "defend-together", name: "Five-player base defense", phases: ["mid", "late"], kind: "defend", roles: [0, 1, 2, 3, 4], staff: "c1", victory: { teams: 2 }, description: "All five regroup around the most threatened allied lane. The team gives up outside farm to defend together." },
];
export const strategyById = (id: string) => strategies.find(s => s.id === id);
/** Coaches set a style and a timing before the map; players choose the calls. */
export type TeamStyle = "split-push" | "teamfight" | "protect-one" | "three-cores";
export type TimingPreference = "early" | "mid" | "late";
export const teamStyles: TeamStyle[] = ["teamfight", "split-push", "protect-one", "three-cores"];
export const timingPreferences: TimingPreference[] = ["early", "mid", "late"];
export const teamStyleInfo: Record<TeamStyle, { name: string; description: string }> = {
  "teamfight": { name: "Teamfight", description: "Group as five. Players favour five-player pushes, collapses, Roshan and defending together." },
  "split-push": { name: "Split push", description: "Spread the map. The offlaner pressures an empty lane while the rest hold or push elsewhere." },
  "protect-one": { name: "4 protect 1", description: "Everything goes to the carry. Supports escort, secure farm and hold behind the carry in fights." },
  "three-cores": { name: "3 semi cores", description: "Share farm across carry, mid and offlane. Mid rotates to help, and lanes are farmed rather than escorted." },
};
export const timingInfo: Record<TimingPreference, { name: string; description: string }> = {
  early: { name: "Prefer aggressive, end quickly", description: "Early rotations, early pushes and high ground as soon as it opens." },
  mid: { name: "Prefer a mid-game timing", description: "Take towers and Roshan between 15 and 40 minutes." },
  late: { name: "Prefer the late game", description: "Farm, defend and stall. Commit when the carry has items." },
};
const lanes = (prefix: string, n: number) => Object.fromEntries([0, 1, 2].map(l => [`${prefix}-${l}`, n]));
/** Multipliers on each call's situational weight. Missing calls use 1. */
const styleWeights: Record<TeamStyle, Record<string, number>> = {
  "teamfight": { "follow-up": 2.5, "pincer-mid": 2, "defend-together": 2, "high-ground": 1.6, roshan: 1.5, "countergank-top": 1.5, "countergank-bottom": 1.5, ...lanes("push", 1.2), ...lanes("farm", .6), "split-push": .3, "split-support": .3 },
  "split-push": { "split-push": 3, "split-support": 3, ...lanes("push", 1.3), ...lanes("farm", 1.3), "high-ground": .7, "follow-up": .6, "pincer-mid": .7, "defend-together": .6, "protect-carry": .5, "counter-initiate": .5 },
  "protect-one": { "protect-carry": 3, "counter-initiate": 3, "buy-bkb": 2, "buy-rapier": 1.5, ...lanes("farm", 1.3), ...lanes("defend", 1.3), disengage: 1.3, "mid-top": .7, "mid-bottom": .7, "split-push": .5 },
  "three-cores": { ...lanes("farm", 2), "help-losing": 1.5, "split-push": 1.4, "supports-mid": 1.2, ...lanes("push", 1.2), "protect-carry": .4, "counter-initiate": .6 },
};
export function styleWeight(style: TeamStyle, timing: TimingPreference, strategy: Strategy, phase: GamePhase) {
  let n = styleWeights[style][strategy.id] ?? 1;
  const push = strategy.kind === "push", fight = strategy.kind === "gank";
  if (timing === "early") {
    if (fight && phase === "early") n *= 1.6;
    if (push) n *= phase === "late" ? 1.3 : 1.5;
    if (strategy.id === "high-ground") n *= 1.8;
    if (strategy.kind === "roshan") n *= 1.3;
    if (strategy.kind === "farm") n *= .6;
    if (strategy.kind === "defend") n *= .8;
    if (strategy.id === "buy-rapier") n *= .5;
  } else if (timing === "mid") {
    if (phase === "mid" && (push || strategy.kind === "roshan")) n *= 1.3;
    if (phase === "late" && strategy.kind === "farm") n *= .8;
  } else {
    if (strategy.kind === "farm") n *= 1.6;
    if (strategy.kind === "defend") n *= 1.4;
    if (strategy.kind === "disengage" || strategy.kind === "protect") n *= 1.3;
    if (fight && phase === "early") n *= .7;
    if (push && phase === "mid") n *= .7;
    if (push && phase === "late") n *= 1.2;
    if (strategy.id === "buy-rapier") n *= 1.3;
  }
  return n;
}
export interface TacticalPreparation { style: TeamStyle; timing: TimingPreference; builds: BuildStyle[]; autoGlyph?: boolean }
export const defaultTactics = (): TacticalPreparation => ({ style: "teamfight", timing: "mid", builds: Array(5).fill("automatic") });
/** Pre-styles saves stored three calls per phase; read the plan they described. */
function legacyStyle(slots: unknown): Pick<TacticalPreparation, "style" | "timing"> | undefined {
  if (!slots || typeof slots !== "object") return undefined;
  const ids = gamePhases.flatMap(p => { const list = (slots as Record<string, unknown>)[p]; return Array.isArray(list) ? list.filter((id): id is string => typeof id === "string") : []; });
  if (!ids.length) return undefined;
  const count = (test: (id: string) => boolean) => ids.filter(test).length;
  const scores: [TeamStyle, number][] = [
    ["split-push", count(id => id === "split-push" || id === "split-support") * 2],
    ["protect-one", count(id => id === "protect-carry" || id === "counter-initiate" || id === "buy-rapier") * 1.5],
    ["three-cores", count(id => id.startsWith("farm-") || id === "help-losing")],
    ["teamfight", count(id => ["follow-up", "pincer-mid", "defend-together", "high-ground", "roshan"].includes(id)) + .5],
  ];
  const style = scores.sort((a, b) => b[1] - a[1])[0][0];
  const early = count(id => strategyById(id)?.kind === "gank"), late = count(id => id.startsWith("farm-") || id.startsWith("defend-") || id === "buy-rapier");
  return { style, timing: early >= late + 2 ? "early" : late >= early + 2 ? "late" : "mid" };
}
export function normalizeTactics(input: unknown): TacticalPreparation {
  const result = defaultTactics();
  if (!input || typeof input !== "object" || Array.isArray(input)) return result;
  const raw = input as Partial<TacticalPreparation> & { slots?: unknown };
  if (typeof raw.autoGlyph === 'boolean') result.autoGlyph = raw.autoGlyph;
  Object.assign(result, legacyStyle(raw.slots));
  if (teamStyles.includes(raw.style as TeamStyle)) result.style = raw.style!;
  if (timingPreferences.includes(raw.timing as TimingPreference)) result.timing = raw.timing!;
  if (Array.isArray(raw.builds)) result.builds = Array.from({ length: 5 }, (_, r) => buildStyles.includes(raw.builds![r]) ? raw.builds![r] : "automatic");
  return result;
}
/** Calls a style leans on in a phase, strongest first, for display. */
export function styleHighlights(prep: Pick<TacticalPreparation, "style" | "timing">, phase: GamePhase, count = 3) {
  return strategies.filter(s => s.phases.includes(phase)).map(s => ({ s, n: styleWeight(prep.style, prep.timing, s, phase) }))
    .sort((a, b) => b.n - a.n).slice(0, count).map(x => x.s);
}
export function strategyUnlocked(strategy: Strategy, players: BattlePlayer[], staffIds: string[] = [], earnedIds: readonly string[] | null = []) {
  return (!strategy.staff && !strategy.victory) || (earnedIds ?? []).includes(strategy.id) || !!strategy.staff && staffIds.includes(strategy.staff) || !!strategy.skill && players.some(p => (p.skills[strategy.skill!] ?? 0) >= (strategy.threshold ?? 50));
}
export const staffTacticNames: Record<string,string> = {c1:"Head coach",c4:"Economy coach",c5:"Strategy scout",c6:"Hero specialist"};
export function unlockDescription(s: Strategy) {
  const routes = [s.staff ? `Employ a ${staffTacticNames[s.staff] ?? "specialist coach"}` : "", s.skill ? `a player with ${s.skill} ${s.threshold}+` : "", s.victory ? s.victory.opponent ? `defeat ${s.victory.opponentName} in a competitive series` : `defeat ${s.victory.teams} distinct ${s.victory.teams === 1 ? "team" : "teams"} in competitive series` : ""].filter(Boolean);
  return routes.length ? routes.join(" OR ") : "Available to every club";
}
const average = (players: BattlePlayer[], skill: string, roles = [0, 1, 2, 3, 4]) => {
  const list = players.filter(p => roles.includes(p.role));
  return list.length ? list.reduce((n, p) => n + (p.skills[skill] ?? 50), 0) / list.length : 50;
};
/** AI clubs play to their roster's strengths. Deterministic for a given lineup. */
export function automaticTactics(players: BattlePlayer[]): TacticalPreparation {
  const carry = average(players, "farming", [0]), cores = average(players, "farming", [0, 1, 2]);
  const scores: [TeamStyle, number][] = [
    ["teamfight", average(players, "teamfights") + 2],
    ["split-push", average(players, "pushing", [2]) * .6 + average(players, "pushing") * .4],
    ["protect-one", carry * .7 + average(players, "farming", [3, 4]) * -.2 + average(players, "vision", [3, 4]) * .5],
    ["three-cores", cores - Math.max(0, carry - cores) * .5],
  ];
  const style = scores.sort((a, b) => b[1] - a[1])[0][0];
  const aggression = average(players, "skirmish") * .5 + average(players, "laning") * .5;
  const timing: TimingPreference = aggression >= carry + 6 ? "early" : carry >= aggression + 6 ? "late" : "mid";
  return { ...defaultTactics(), style, timing };
}
/** targetPlayerId="all" applies purchase calls to eligible teammates; movement calls keep their roles. */
export interface TacticalOrder { strategyId: string; targetPlayerId?: string }
export interface ActivePlay {
  id: number; strategyId: string; side: Side; source: "manager" | "bot";
  participants: number[]; targetLane: number; targetUnit?: number;
  stage: "assembling" | "moving" | "engaging"; startedAt: number; expiresAt: number;
  baselineInvolvement: number; rally: {x:number;y:number};
}
export interface TacticalEvent { time: number; side: Side; strategyId: string; source: "manager" | "bot"; status: "called" | "moving" | "engaging" | "completed" | "abandoned" | "cancelled"; message: string }
export interface StrategyStatus { strategyId: string; reason: string | null }
export interface TacticalSnapshot { phase: GamePhase; style: TeamStyle; timing: TimingPreference; slots: StrategyStatus[]; active?: ActivePlay; events: TacticalEvent[]; itemTargets: { playerId: string; item: string }[] }
export interface RoshanState { x: number; y: number; hp: number; max: number; respawnAt: number; kills: [number,number] }
export interface DroppedItem { id: number; x: number; y: number; item: "rapier" }
/** Included in calibration signatures and source fingerprints. */
export const TACTICAL_ENGINE_VERSION = "team-styles-v1";
