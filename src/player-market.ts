import type { Campaign, Player } from "./game";
import { economyScale } from "./economy-scale";
import { campaignPatch } from "./patches";
import { normalizePlayerIdentity, playerIdentityEra } from "./player-identity";
import { innateById, playerSkillLabels } from "./player-innates";
import type { PlayerInnate, PlayerSkill } from "./player-innates";
import { effectivePlayerAttributes } from "./player-innate-skills";
import { activeClubs } from "./history";
import { compatibilityClash, welfarePreferences } from "./player-welfare";
import { developmentProfile } from './player-career';

/** Player prices, self-image and team chemistry. Every number is a gameplay
 * estimate built from simulated attributes and actual campaign maps, never a
 * claim about a real player's salary, personality or relationships. */

const hash = (s: string) => [...s].reduce((n, ch) => Math.imul(n ^ ch.charCodeAt(0), 16777619) >>> 0, 2166136261);
const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n));
const mean = (n: number[]) => n.length ? n.reduce((a, b) => a + b, 0) / n.length : 0;
const round10 = (n: number) => Math.max(50, Math.round(n / 10) * 10);
const LANES = [["Carry", "Hard support"], ["Offlane", "Soft support"]] as const;
const STYLE_AXES: Record<string, string[]> = {
  Fight: ["Teamfight", "Initiation", "Aggression"],
  Tempo: ["Tempo carry", "Roaming", "Aggression"],
  Late: ["Farming carry", "Split pushing", "Save support", "Vision control"],
};

interface MarketContext {
  skills: number[];
  form: Map<string, { played: number; winRate: number | null }>;
  heroes: Map<string, number>;
  lineups: string[][];
}
const contexts = new WeakMap<Campaign, MarketContext>();

/** One pass over the same competitive maps that drive welfare form and draft
 * familiarity: tournament runs and legacy event series, never scrims. */
function context(c: Campaign): MarketContext {
  const cached = contexts.get(c);
  if (cached) return cached;
  const maps = new Map<string, { at: number; won: boolean }[]>();
  const heroes = new Map<string, Set<string>>();
  const lineups: string[][] = [];
  // Lineups count only finished events, so a team's synergy can't shift between
  // fixtures of a running tournament or across a reload mid-run.
  const add = (games: { winner?: number | null; players: { id: string; team: number; heroId: string }[] }[], at: number, finished: boolean) => {
    for (const game of games) {
      if (finished) for (const team of [0, 1]) lineups.push(game.players.filter(p => p.team === team).map(p => p.id));
      for (const p of game.players) {
        heroes.set(p.id, (heroes.get(p.id) ?? new Set()).add(p.heroId));
        if (game.winner === 0 || game.winner === 1) maps.set(p.id, [...(maps.get(p.id) ?? []), { at, won: game.winner === p.team }]);
      }
    }
  };
  for (const run of c.calendar?.runs ?? []) for (const match of run.matches) add(match.series?.games ?? match.performance?.games ?? [], Date.parse(match.at), !!run.settled);
  for (const result of c.results) if (!result.tournamentId && !result.skipped && result.series) add(result.series.games, result.year * 100 + result.week, true);
  const form = new Map([...maps].map(([id, rows]) => {
    const recent = rows.sort((a, b) => b.at - a.at).slice(0, 20);
    return [id, { played: recent.length, winRate: Math.round(recent.filter(m => m.won).length / recent.length * 100) }];
  }));
  const value = { skills: c.players.map(p => skill(c, p)).sort((a, b) => a - b), form, heroes: new Map([...heroes].map(([id, set]) => [id, set.size])), lineups };
  contexts.set(c, value);
  return value;
}

const skill = (c: Campaign, p: Player) => mean(Object.values(effectivePlayerAttributes(c, p)));
function percentile(c: Campaign, p: Player) {
  const all = context(c).skills, own = skill(c, p);
  if (all.length < 2) return 0.5;
  const below = all.filter(n => n < own).length, equal = all.filter(n => n === own).length;
  return clamp((below + Math.max(0, equal - 1) / 2) / (all.length - 1));
}
export const playerForm = (c: Campaign, id: string) => context(c).form.get(id) ?? { played: 0, winRate: null };
function activeInnate(c: Campaign, p: Player): PlayerInnate | undefined {
  const identity = normalizePlayerIdentity(p.identity, p.id);
  if (identity?.innateRules !== 2 || !playerIdentityEra(campaignPatch(c)).innates) return undefined;
  return innateById.get(identity.innateId);
}
const helpsTeammates = (i?: PlayerInnate) => !!i && (i.match ? i.match.target !== "self" : i.weekly?.target === "teammates");
/** The club that currently holds a player's registration, excluding yours. */
function otherClub(c: Campaign, id: string) {
  return c.world ? activeClubs(c.world).find(t => t.id !== c.world!.managedTeamId && (t.roster.includes(id) || t.bench.includes(id))) : undefined;
}

export interface ValueFactor { label: string; effect: number }
export interface MarketValue { wage: number; fee: number; percentile: number; factors: ValueFactor[] }

/** What a neutral club would pay: skill relative to the whole player pool
 * (attributes grow every year, so price follows rank, not raw numbers), then
 * innate, hero-pool and recent-form adjustments. */
export function marketValue(c: Campaign, p: Player): MarketValue {
  const pct = percentile(c, p);
  const factors: ValueFactor[] = [];
  const innate = activeInnate(c, p);
  if (innate) factors.push({ label: `Innate: ${innate.name}`, effect: helpsTeammates(innate) ? 0.08 : innate.attributes ? 0.05 : 0.03 });
  const stats = effectivePlayerAttributes(c, p);
  const pool = clamp((stats.heroPool - skill(c, p)) / 100, -0.06, 0.06) + clamp(((context(c).heroes.get(p.id) ?? 0) - 6) * 0.01, 0, 0.05);
  if (Math.abs(pool) >= 0.01) factors.push({ label: pool > 0 ? "Deep hero pool" : "Narrow hero pool", effect: pool });
  const form = playerForm(c, p.id);
  if (form.played >= 6 && form.winRate != null && form.winRate !== 50) factors.push({ label: `Form: ${form.winRate}% of last ${form.played} maps`, effect: clamp((form.winRate - 50) / 100 * 0.6, -0.15, 0.15) });
  const multiplier = factors.reduce((n, f) => n * (1 + f.effect), 1);
  const wage = round10(600 * 6 ** pct * multiplier * economyScale(c.year));
  const club = otherClub(c, p.id);
  if (club) factors.push({ label: `Buyout from ${club.name}`, effect: 0.5 });
  return { wage, fee: Math.round(wage * 6 * (club ? 1.5 : 1) / 100) * 100, percentile: pct, factors };
}

export interface Persona { ego: number; egoLabel: string; awareness: number; selfImage: string }
export function playerPersona(c: Campaign, p: Player): Persona & { askMultiplier: number; leverage: number } {
  const seed = hash(`ego:${p.id}`);
  const stats = effectivePlayerAttributes(c, p), own = skill(c, p);
  const ego = clamp(1 + seed % 8 + (welfarePreferences(c, p).demanding ? 2 : 0) + (stats.confidence - own >= 8 ? 1 : 0), 1, 10);
  const awareness = clamp(0.55 + (stats.intuition - own) / 40 + ((seed >>> 4) % 5 - 2) * 0.08, 0.25, 0.95);
  const pct = percentile(c, p), form = playerForm(c, p.id);
  // Leverage is what the player has actually earned: an elite rank or a winning
  // run. Only players who read it correctly push for all of it.
  const leverage = Math.max(0, pct - 0.75) * 0.8 + (form.played >= 6 && form.winRate! >= 60 ? (form.winRate! - 55) / 100 : 0);
  const belief = (ego - 5) * 0.05;
  const askMultiplier = (1 + belief * (1 - awareness)) * (1 + awareness * leverage);
  const selfImage = leverage >= 0.05 && awareness >= 0.6 ? "Knows their worth"
    : askMultiplier >= 1.08 ? "Overrates themselves" : askMultiplier <= 0.93 ? "Sells themselves short" : "Realistic";
  const egoLabel = ego <= 3 ? "Modest" : ego <= 6 ? "Grounded" : ego <= 8 ? "Proud" : "Big ego";
  return { ego, egoLabel, awareness, selfImage, askMultiplier, leverage };
}

/** Weekly pay the player asks of your club, before contract terms. */
export function askingWage(c: Campaign, p: Player) {
  const market = marketValue(c, p).wage;
  const fit = c.roster.includes(p.id) ? 0 : candidateFit(c, p).synergy;
  return round10(market * playerPersona(c, p).askMultiplier * (fit >= 4 ? 0.95 : 1));
}
export const signingFee = (c: Campaign, p: Player) => marketValue(c, p).fee;

/** Average competitive win rate of your current starters with at least six maps. */
export function teamForm(c: Campaign): number | null {
  const rows = c.roster.map(id => playerForm(c, id)).filter(f => f.played >= 6);
  return rows.length >= 3 ? Math.round(mean(rows.map(f => f.winRate!))) : null;
}
/** Stars and big egos want a cut once the club is winning. */
export function prizeShareDemand(c: Campaign, p: Player): number {
  const form = teamForm(c);
  if (!((form != null && form >= 55) || c.reputation >= 60)) return 0;
  const persona = playerPersona(c, p), pct = percentile(c, p);
  if (pct < 0.7 && persona.ego < 7) return 0;
  const want = persona.ego / 2 + Math.max(0, pct - 0.7) * 20 + (form != null && form >= 65 ? 1 : 0);
  return Math.round(clamp(want * (0.6 + 0.4 * persona.awareness), 1, 10));
}

export interface ChemistryPart { key: string; label: string; score: number; max: number; detail: string }
export interface Chemistry { overall: number; synergy: number; teamRating: number; parts: ChemistryPart[] }
const styleVector = (p: Player) => Object.values(STYLE_AXES).map(keys => keys.reduce((n, k) => n + ((p.playstyles as Record<string, number | undefined>)[k] ?? 0), 0));
const cosine = (a: number[], b: number[]) => {
  const dot = a.reduce((n, v, i) => n + v * b[i], 0), size = Math.hypot(...a) * Math.hypot(...b);
  return size ? dot / size : 1;
};

/** Match effect: synergy 0–100 maps to a combat bonus of ±SYNERGY_BONUS, the same
 * additive term as difficulty and tournament form. Battle power is
 * `0.4 + skill × 0.008 + bonus`, so ±0.04 is worth ±5 OVR. */
export const SYNERGY_BONUS = 0.04;
const BONUS_PER_OVR = 0.008;
const bonusFor = (synergy: number) => Math.round((synergy - 50) / 50 * SYNERGY_BONUS * 1e4) / 1e4;

/** Synergy is 0–100 across the parts that apply in this era. Team rating is the
 * average OVR plus the synergy bonus expressed in OVR points. */
export function teamChemistry(c: Campaign, players = c.roster.map(id => c.players.find(p => p.id === id)!).filter(Boolean)): Chemistry {
  // Round per player first, matching the OVR shown everywhere else.
  const skills = players.map(p => Math.round(skill(c, p)));
  const overall = Math.round(mean(skills));
  const parts: ChemistryPart[] = [];
  if (players.length >= 2) {
    const vectors = players.map(styleVector), team = vectors[0].map((_, i) => mean(vectors.map(v => v[i])));
    const fit = mean(vectors.map(v => cosine(v, team)));
    const lean = Object.keys(STYLE_AXES)[team.indexOf(Math.max(...team))];
    const outlier = players[vectors.map(v => cosine(v, team)).reduce((low, n, i, all) => n < all[low] ? i : low, 0)];
    const adaptability = mean(players.map(p => developmentProfile(p).adaptability)) / 10;
    parts.push({ key: "style", label: "Playstyle cohesion", score: Math.round(25 * clamp((fit - 0.8) / 0.18 + (1 - fit) * adaptability)), max: 25,
      detail: `The team leans ${lean}.${fit < 0.94 ? ` ${outlier.name} pulls in a different direction.` : " Everyone wants the same game."}` });
    const lanes = LANES.map(([core, support]) => [players.find(p => p.role === core), players.find(p => p.role === support)] as const)
      .filter((pair): pair is readonly [Player, Player] => !!pair[0] && !!pair[1]);
    if (lanes.length) {
      const scores = lanes.map(pair => {
        const laning = mean(pair.map(p => effectivePlayerAttributes(c, p).laning));
        const tutor = pair.find(p => activeInnate(c, p)?.match?.target === "lane-partners");
        return { pair, score: 6 * clamp(0.5 + (laning - overall) / 16) + (tutor ? 4 : 0), tutor };
      });
      parts.push({ key: "lanes", label: "Lane partnerships", score: Math.round(scores.reduce((n, s) => n + s.score, 0)), max: 10 * lanes.length,
        detail: scores.map(s => `${s.pair[0].name} + ${s.pair[1].name}${s.tutor ? ` (${s.tutor.name} coaches the lane)` : ""}`).join(" · ") });
    }
  }
  if (players.length) {
    const pool = mean(players.map(p => effectivePlayerAttributes(c, p).heroPool));
    const narrow = players.filter(p => effectivePlayerAttributes(c, p).heroPool < overall - 6).map(p => p.name);
    parts.push({ key: "pool", label: "Hero pool depth", score: Math.round(15 * clamp(0.5 + (pool - overall) / 16)), max: 15,
      detail: narrow.length ? `Thin pools: ${narrow.join(", ")}. Opponents can ban them out.` : "Every starter can flex across drafts." });
  }
  if (players.length && playerIdentityEra(campaignPatch(c)).innates) {
    const weakest = (Object.keys(playerSkillLabels) as PlayerSkill[]).filter(k => mean(players.map(p => effectivePlayerAttributes(c, p)[k])) < overall - 4);
    const helpers = players.map(p => ({ p, innate: activeInnate(c, p) })).filter(({ innate }) => helpsTeammates(innate));
    const gaps = helpers.filter(({ innate }) => innate?.weekly?.kind === "training" && Object.keys(innate.weekly.stats ?? {}).some(k => weakest.includes(k as PlayerSkill)));
    parts.push({ key: "innates", label: "Innate support", score: Math.min(15, helpers.length * 4 + gaps.length * 3), max: 15,
      detail: helpers.length ? `${helpers.map(h => `${h.p.name}: ${h.innate!.name}`).join(" · ")}${gaps.length ? `. ${gaps.map(g => g.p.name).join(", ")} mentor${gaps.length === 1 ? "s" : ""} a team weakness.` : ""}` : "No starter's innate helps teammates." });
  }
  if (players.length >= 2) {
    const leadership = mean(players.map(p => developmentProfile(p).leadership));
    const adaptation = mean(players.map(p => developmentProfile(p).adaptability));
    parts.push({ key: 'communication', label: 'Communication & adaptation', score: Math.round((leadership + adaptation) / 2), max: 10,
      detail: `Leadership ${leadership.toFixed(1)}/10 · adaptability ${adaptation.toFixed(1)}/10. Simulated team coordination.` });
    const personas = new Map(players.map(p => [p.id, playerPersona(c, p)]));
    const notes: string[] = [];
    let score = 15;
    for (let i = 0; i < players.length; i++) for (let j = i + 1; j < players.length; j++) {
      const a = players[i], b = players[j];
      if (personas.get(a.id)!.ego >= 8 && personas.get(b.id)!.ego >= 8) { score -= 5; notes.push(`${a.name} and ${b.name} both want to be the star`); }
      else if (compatibilityClash(a.id, b.id)) { score -= 3; notes.push(`${a.name} and ${b.name} rub each other the wrong way`); }
      const tension = Math.max(c.welfare?.players[a.id]?.conflicts[b.id] ?? 0, c.welfare?.players[b.id]?.conflicts[a.id] ?? 0);
      if (tension >= 45) { score -= 3; notes.push(`${a.name}–${b.name} friction ${Math.round(tension)}/100`); }
    }
    parts.push({ key: "personality", label: "Personalities", score: Math.max(0, score), max: 15, detail: notes.length ? `${notes.join(". ")}.` : "No clashing egos." });
    const ids = players.map(p => p.id);
    const together = context(c).lineups.filter(lineup => ids.every(id => lineup.includes(id))).length;
    parts.push({ key: "together", label: "Time together", score: Math.round(10 * Math.min(1, together / 20)), max: 10,
      detail: together ? `${together} competitive map${together === 1 ? "" : "s"} as this lineup. Peaks at 20.` : "This lineup has not played a competitive map together." });
  }
  const max = parts.reduce((n, p) => n + p.max, 0);
  const synergy = max ? Math.round(100 * parts.reduce((n, p) => n + p.score, 0) / max) : 50;
  return { overall, synergy, teamRating: Math.round(overall + bonusFor(synergy) / BONUS_PER_OVR), parts };
}

/** How the team changes if this player replaces the starter in their role. */
export function candidateFit(c: Campaign, p: Player) {
  const current = c.roster.map(id => c.players.find(v => v.id === id)!).filter(Boolean);
  if (current.some(v => v.id === p.id)) return { synergy: 0, teamRating: 0 };
  const before = teamChemistry(c, current);
  const after = teamChemistry(c, [...current.filter(v => v.role !== p.role), p]);
  return { synergy: after.synergy - before.synergy, teamRating: after.teamRating - before.teamRating };
}

/** Combat bonus for a lineup. Lineups with unscouted or missing players get none. */
export function synergyBonus(c: Campaign, ids: string[]) {
  const players = ids.map(id => c.players.find(p => p.id === id));
  if (players.length !== 5 || players.some(p => !p)) return 0;
  return bonusFor(teamChemistry(c, players as Player[]).synergy);
}
