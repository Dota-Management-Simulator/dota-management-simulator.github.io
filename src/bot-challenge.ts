import type { Campaign, Player } from "./game";
import { teamPlayers } from "./game";
import type { BattleConfig, BattlePlayer, SeriesSummary } from "./battle";
import { campaignHeroPoolThrough, campaignPatch } from "./patches";
import { automaticTalents, normalizeTalentPlan } from "./talents";
import { battlePlayerIdentity, fallbackPlayerIdentity } from './player-identity';
import { managedPatchObserver } from "./patch-knowledge";
import { withDraftKnowledge } from "./draft";
import type { TacticalPreparation } from "./tactics";
import { fullRosterBlocker } from "./player-welfare";
import { synergyBonus } from "./player-market";

/** OpenAI Five's public matches. Dates checked against OpenAI's posts and press
 * coverage on 2026-10-24; `checked: false` marks a day that is inferred. */
export const openAiShowmatches = [
  { date: "2017-08-11", checked: false, title: "TI7 1v1 bot beats Dendi", detail: "Shadow Fiend mid, best of three, on the TI7 main stage in Seattle. The day is inferred from coverage dated August 12.", source: "https://www.shacknews.com/article/100948/openais-dota-2-ai-beats-professional-player-on-stage-at-ti7-remains-undefeated" },
  { date: "2018-08-05", checked: true, title: "OpenAI Five Benchmark", detail: "Beat a team including Blitz, Cap, Fogged and Merlini in a best of three, with an 18-hero pool.", source: "https://openai.com/index/openai-five-benchmark-results" },
  { date: "2018-08-22", checked: true, title: "TI8 vs paiN Gaming", detail: "Lost after about 51 minutes in Vancouver.", source: "https://openai.com/index/the-international-2018-results" },
  { date: "2018-08-23", checked: true, title: "TI8 vs Chinese all-stars", detail: "Lost after 45 minutes of back-and-forth teamfights.", source: "https://openai.com/index/the-international-2018-results" },
  { date: "2019-04-13", checked: true, title: "OpenAI Five Finals vs OG", detail: "Beat the TI8 champions 2–0 in San Francisco.", source: "https://www.dexerto.com/dota2/ai-program-beats-dota-2-world-champions-542957" },
  { date: "2019-04-18", checked: true, title: "OpenAI Five Arena", detail: "Open to everyone through April 21: 7,215 wins and 42 losses (99.4%).", source: "https://www.engadget.com/2019-04-23-openai-five-dota-2-arena-results.html" },
] as const;

/** One year of access, opened by the real Arena. */
export const BOT_WINDOW = { from: "2019-04-18", to: "2020-04-17" };
export const BOT_TEAM = "OpenAI Five";
export const BOT_TEAM_KEY = "openai-five";
const BOT_ROLES = ["Carry", "Mid", "Offlane", "Soft support", "Hard support"];

export interface BotAttempt { id: string; at: string; patchId: string; bestOf: 1 | 3; score: [number, number]; won: boolean; series?: SeriesSummary }
export interface BotChallengeState { attempts: BotAttempt[]; firstWinAt?: string }
/** Series bodies are large. Keep every score, but only the latest few replays. */
const KEEP_SERIES = 5, KEEP_ATTEMPTS = 200;

const hash = (text: string) => [...text].reduce((n, ch) => Math.imul(n ^ ch.charCodeAt(0), 16777619) >>> 0, 2166136261);
const day = (c: Campaign) => c.calendar?.now.slice(0, 10);

export function botChallengeOpen(c: Campaign): boolean {
  const today = day(c);
  return !!today && BOT_WINDOW.from <= today && today <= BOT_WINDOW.to;
}
export function botChallengeBlocker(c: Campaign): string | null {
  if (fullRosterBlocker(c)) return fullRosterBlocker(c);
  const today = day(c);
  if (!today) return "The bots follow the dated calendar. Switch this campaign to dated scheduling first.";
  if (today < BOT_WINDOW.from) return `OpenAI Five opens to challengers on ${BOT_WINDOW.from}, the day the real Arena opened.`;
  if (today > BOT_WINDOW.to) return `The OpenAI Five challenge closed on ${BOT_WINDOW.to}.`;
  return null;
}

/** Mechanically a step above the challenger's own five (BOT_EDGE per stat), so
 * the fight is decided by what the bots know: the true meta, drafted almost
 * greedily. No creativity, a fixed aggressive script, and they never read your
 * preparation. Stats scale with the challenger because ratings grow over a campaign. */
export const BOT_EDGE = 1;
const MECHANICS = ["laning", "teamfights", "skirmish", "stability", "farming", "pushing"] as const;
export function botPlayers(challengers: Pick<Player, "stats">[]): BattlePlayer[] {
  const level = (key: keyof Player["stats"], edge = BOT_EDGE) =>
    Math.min(99, Math.round(challengers.reduce((n, p) => n + (p.stats[key] ?? 0), 0) / Math.max(1, challengers.length)) + edge);
  return BOT_ROLES.map((role, r) => ({ id: `${BOT_TEAM_KEY}-${r + 1}`, name: `${BOT_TEAM} · ${role}`, role: r,
    skills: { ...Object.fromEntries(MECHANICS.map(k => [k, level(k)])), vision: level("vision", 0), intuition: level("intuition", 0), creativity: 0,
      confidence: level("confidence"), stamina: level("stamina"), heroPool: level("heroPool") },
    energy: 100, happiness: 100, talents: automaticTalents(r,fallbackPlayerIdentity(`${BOT_TEAM_KEY}-${r + 1}`)), identity: fallbackPlayerIdentity(`${BOT_TEAM_KEY}-${r + 1}`) }));
}
/** The record shows early aggression and deathball pushes; TI8's losses came after leading for 20–35 minutes. */
export const botTactics = (): TacticalPreparation => ({ slots: { early: ["mid-top", "mid-bottom", "supports-mid"], mid: ["push-1", "push-2", "push-0"], late: ["high-ground", "push-1", "push-2"] }, builds: Array(5).fill("automatic") });

export function prepareBotChallenge(c: Campaign, bestOf: 1 | 3): BattleConfig {
  const reason = botChallengeBlocker(c);
  if (reason) throw Error(reason);
  if (bestOf !== 1 && bestOf !== 3) throw Error("Choose BO1 or BO3.");
  const attempt = c.botChallenges?.attempts.length ?? 0;
  const row = (p: Player, role: number): BattlePlayer => ({ id: p.id, name: p.name, role, identity: battlePlayerIdentity(p, role), skills: { ...p.stats }, energy: p.energy, happiness: p.happiness, talents: normalizeTalentPlan(c.talentPlans?.[p.id]) });
  const config = withDraftKnowledge(c, {
    seed: hash(`${BOT_TEAM_KEY}:${c.calendar!.now}:${attempt}`), year: c.year, heroPoolThroughYear: campaignHeroPoolThrough(c), patchId: campaignPatch(c).id,
    teams: [c.settings.team, BOT_TEAM], players: [teamPlayers(c).map(row), botPlayers(teamPlayers(c))],
    bonuses: [(c.settings.difficulty === "Club" ? 0.14 : c.settings.difficulty === "Legend" ? -0.12 : 0) + synergyBonus(c, c.roster), 0],
    patchObservers: [managedPatchObserver(c), { teamKey: BOT_TEAM_KEY, staffIds: [], omniscient: true }], seriesFormat: { bestOf },
  });
  return { ...config, tacticalPreparations: [config.tacticalPreparations?.[0], botTactics()] };
}

/** Exhibition only: no clock, energy, training, research, money or career stats change. */
export function settleBotChallenge(c: Campaign, config: BattleConfig, series: SeriesSummary): Campaign {
  const score: [number, number] = [0, 0];
  for (const game of series.games) if (game.winner === 0 || game.winner === 1) score[game.winner]++;
  const bestOf = config.seriesFormat?.bestOf;
  const need = bestOf === 3 ? 2 : 1;
  if (botChallengeBlocker(c) || (bestOf !== 1 && bestOf !== 3) || !config.patchObservers?.[1]?.omniscient || series.seed !== config.seed || series.engine !== "lane-siege-v1"
    || series.bestOf !== bestOf || series.patch?.id !== config.patchId || series.teams.some((t, i) => t !== config.teams[i])
    || series.score.some((n, i) => n !== score[i]) || Math.max(...score) !== need || series.games.length > bestOf
    || series.winner !== (score[0] > score[1] ? 0 : 1)
    || series.games.some(g => !Number.isFinite(g.duration) || g.duration <= 0 || g.players.length !== 10 || new Set(g.players.map(p => p.id)).size !== 10 || g.players.some(p => !config.players[p.team]?.some(row => row.id === p.id) || !p.heroId)))
    throw Error("This result does not match the OpenAI Five challenge.");
  const state = c.botChallenges ?? { attempts: [] };
  const won = series.winner === 0;
  const attempt: BotAttempt = { id: `bot-${state.attempts.length + 1}-${series.seed}`, at: c.calendar!.now, patchId: config.patchId!, bestOf, score, won, series: structuredClone(series) };
  const attempts = [...state.attempts, attempt].slice(-KEEP_ATTEMPTS)
    .map((a, i, all) => i < all.length - KEEP_SERIES ? { ...a, series: undefined } : a);
  return { ...c, botChallenges: { attempts, ...(state.firstWinAt || won ? { firstWinAt: state.firstWinAt ?? c.calendar!.now } : {}) },
    log: [`${won ? "Beat" : "Lost to"} OpenAI Five ${score.join("–")} in a BO${bestOf} exhibition. No time passed.`, ...c.log].slice(0, 100) };
}

/** Optional metadata: never invalidate an otherwise valid save. */
export function normalizeBotChallenges(value: unknown): BotChallengeState | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const v = value as Partial<BotChallengeState>;
  const attempts = (Array.isArray(v.attempts) ? v.attempts : []).filter((a): a is BotAttempt => !!a && typeof a === "object"
    && typeof a.id === "string" && Number.isFinite(Date.parse(a.at)) && typeof a.patchId === "string" && (a.bestOf === 1 || a.bestOf === 3)
    && Array.isArray(a.score) && a.score.length === 2 && a.score.every(n => Number.isInteger(n) && n >= 0 && n <= 2) && typeof a.won === "boolean")
    .slice(-KEEP_ATTEMPTS).map(a => ({ id: a.id, at: a.at, patchId: a.patchId, bestOf: a.bestOf, score: [a.score[0], a.score[1]] as [number, number], won: a.won,
      ...(a.series && typeof a.series === "object" && Array.isArray(a.series.games) ? { series: a.series } : {}) }));
  const firstWinAt = typeof v.firstWinAt === "string" && Number.isFinite(Date.parse(v.firstWinAt)) ? v.firstWinAt : attempts.find(a => a.won)?.at;
  return { attempts, ...(firstWinAt ? { firstWinAt } : {}) };
}
