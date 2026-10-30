import type { Campaign, Player } from "./game";
import { ROLES } from "./game";
import type { BattleConfig, BattlePlayer, SeriesSummary, Side } from "./battle";
import { campaignHeroPoolThrough, campaignPatch } from "./patches";
import { automaticTalents, normalizeTalentPlan } from "./talents";
import { battlePlayerIdentity } from './player-identity';
import { managedPatchObserver } from "./patch-knowledge";
import { withDraftKnowledge } from "./draft";
import { synergyBonus } from "./player-market";
import { historicalTournaments } from "./tournaments";
import type { HistoricalTournament } from "./tournament-types";

/** TIs that held an All-Star match. AFK Gaming reported TI 2023 as the first
 * without one in 11 years; 2024 onward is unchecked, so it is left out. */
export const allStarYears = [2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2021, 2022];
export const ALL_STAR_SOURCE = "https://afkgaming.com/dota2/news/the-international-ti-skips-an-all-star-match-for-the-first-time-in-11-years";
const DAY = 86400000;
const AFTER_FINAL_DAYS = 14;

export interface AllStarTeam { name: string; players: string[] }
export interface AllStarMatch { eventId: string; year: number; teams: [AllStarTeam, AllStarTeam]; managedSide: Side | null }
export interface AllStarResult { at: string; teams: [string, string]; score: [number, number]; coached: boolean }

const hash = (text: string) => [...text].reduce((n, ch) => Math.imul(n ^ ch.charCodeAt(0), 16777619) >>> 0, 2166136261);
const rating = (p: Player) => (p.stats.laning + p.stats.teamfights + p.stats.skirmish + p.stats.stability + p.stats.farming) / 5;

/** The match is open from the TI's first day until two weeks after its final. */
export function allStarEvent(c: Campaign): HistoricalTournament | undefined {
  const now = c.calendar ? Date.parse(c.calendar.now) : NaN;
  if (!Number.isFinite(now)) return undefined;
  return historicalTournaments.find(e => e.kind === "ti" && allStarYears.includes(e.year)
    && Date.parse(e.start) <= now && now < Date.parse(e.end) + (AFTER_FINAL_DAYS + 1) * DAY);
}

/** The TI field: registered lineups when the campaign ran the event, else world rosters. */
function fieldPlayers(c: Campaign, event: HistoricalTournament): Player[] {
  const run = c.calendar?.runs.find(r => r.eventId === event.id);
  const ids = run ? run.teams.flatMap(t => t.id === run.managed ? c.roster : t.roster)
    : event.teams.flatMap(id => id === c.world?.managedTeamId ? c.roster : c.world?.clubs.find(club => club.id === id)?.roster ?? []);
  return [...new Set(ids)].flatMap(id => c.players.find(p => p.id === id) ?? []);
}

/** Two fan-voted fives: the best two players at each position, split alternately.
 * The fan vote is a fixed per-event nudge, so reloads never reroll the teams. */
export function allStarMatch(c: Campaign, event = allStarEvent(c)): AllStarMatch | undefined {
  if (!event) return undefined;
  const field = fieldPlayers(c, event);
  if (field.length < 10) return undefined;
  const vote = (p: Player) => rating(p) + hash(`${event.id}:${p.id}`) % 6;
  const taken = new Set<string>(), sides: [string[], string[]] = [[], []];
  for (let role = 0; role < 5; role++) {
    const pair = [...field].filter(p => !taken.has(p.id))
      .sort((a, b) => Number(ROLES.indexOf(b.role as never) === role) - Number(ROLES.indexOf(a.role as never) === role) || vote(b) - vote(a) || a.id.localeCompare(b.id)).slice(0, 2);
    pair.forEach(p => taken.add(p.id));
    const [first, second] = role % 2 ? [pair[1], pair[0]] : pair;
    sides[0].push(first.id); sides[1].push(second.id);
  }
  const captain = (ids: string[]) => ids.map(id => c.players.find(p => p.id === id)!).sort((a, b) => vote(b) - vote(a))[0].name;
  let teams: [AllStarTeam, AllStarTeam] = [{ name: `Team ${captain(sides[0])}`, players: sides[0] }, { name: `Team ${captain(sides[1])}`, players: sides[1] }];
  const ours = teams.map(t => t.players.filter(id => c.roster.includes(id)).length);
  const managedSide: Side | null = ours[0] || ours[1] ? 0 : null;
  // DraftSeries manages side 0, so the coached team always goes first.
  if (ours[1] > ours[0]) teams = [teams[1], teams[0]];
  return { eventId: event.id, year: event.year, teams, managedSide };
}

export function allStarBlocker(c: Campaign): string | null {
  if (!c.calendar) return "All-Star matches follow the dated calendar.";
  const event = allStarEvent(c);
  if (!event) return "No All-Star match right now. One is held at each International from its first day until two weeks after the final.";
  if (c.allStars?.[event.id]) return `The ${event.year} All-Star match has been played.`;
  if (!allStarMatch(c, event)) return "The International field is not set yet.";
  return null;
}

export function prepareAllStar(c: Campaign): { match: AllStarMatch; config: BattleConfig } {
  const reason = allStarBlocker(c);
  if (reason) throw Error(reason);
  const match = allStarMatch(c)!;
  const coached = match.managedSide === 0;
  const row = (id: string, role: number): BattlePlayer => {
    const p = c.players.find(p => p.id === id)!;
    return { id: p.id, name: p.name, role, identity: battlePlayerIdentity(p, role), skills: { ...p.stats }, energy: p.energy, happiness: p.happiness,
      talents: coached && c.roster.includes(id) ? normalizeTalentPlan(c.talentPlans?.[id]) : automaticTalents(role,p.identity) };
  };
  const config = withDraftKnowledge(c, {
    seed: hash(`all-star:${match.eventId}`), year: c.year, heroPoolThroughYear: campaignHeroPoolThrough(c), patchId: campaignPatch(c).id,
    teams: [match.teams[0].name, match.teams[1].name], players: [match.teams[0].players.map(row), match.teams[1].players.map(row)],
    bonuses: [synergyBonus(c, match.teams[0].players), synergyBonus(c, match.teams[1].players)], seriesFormat: { bestOf: 1 },
    patchObservers: [coached ? managedPatchObserver(c) : { teamKey: `${match.eventId}:all-star-0`, staffIds: [] }, { teamKey: `${match.eventId}:all-star-1`, staffIds: [] }],
  }, coached ? 0 : null);
  return { match, config };
}

/** An exhibition: no clock, energy, money, research or career statistics change. */
export function settleAllStar(c: Campaign, config: BattleConfig, series: SeriesSummary): Campaign {
  const event = allStarEvent(c);
  const reason = allStarBlocker(c);
  const score: [number, number] = [0, 0];
  for (const game of series.games) if (game.winner === 0 || game.winner === 1) score[game.winner]++;
  if (reason || !event || series.seed !== config.seed || series.engine !== "lane-siege-v1" || series.games.length !== 1
    || series.teams.some((t, i) => t !== config.teams[i]) || series.score.some((n, i) => n !== score[i]) || series.patch?.id !== config.patchId
    || series.games.some(g => g.players.length !== 10 || g.players.some(p => !config.players[p.team]?.some(row => row.id === p.id) || !p.heroId)))
    throw Error(reason ?? "This result does not match the All-Star match.");
  const coached = !!config.draftPreparations?.[0];
  const won = score[0] > score[1] ? config.teams[0] : config.teams[1];
  return { ...c, allStars: { ...c.allStars, [event.id]: { at: c.calendar!.now, teams: config.teams, score, coached } },
    log: [`${event.year} All-Star match: ${won} won ${Math.max(...score)}–${Math.min(...score)}${coached ? " with you coaching" : ""}. No time passed.`, ...c.log].slice(0, 100) };
}

export function normalizeAllStars(value: unknown): Record<string, AllStarResult> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const rows = Object.entries(value as Record<string, Partial<AllStarResult>>).filter(([id, r]) => historicalTournaments.some(e => e.id === id)
    && !!r && typeof r.at === "string" && Number.isFinite(Date.parse(r.at)) && Array.isArray(r.teams) && r.teams.length === 2 && r.teams.every(t => typeof t === "string")
    && Array.isArray(r.score) && r.score.length === 2 && r.score.every(n => n === 0 || n === 1) && typeof r.coached === "boolean");
  return Object.fromEntries(rows.map(([id, r]) => [id, { at: r.at!, teams: [r.teams![0], r.teams![1]] as [string, string], score: [r.score![0], r.score![1]] as [number, number], coached: r.coached! }]));
}
