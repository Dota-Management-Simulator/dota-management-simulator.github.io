import type { Campaign, Player } from "./game";
import { advanceCalendarTo, clamp, teamPlayers } from "./game";
import type { BattleConfig, SeriesSummary } from "./battle";
import { activeClubs } from "./history";
import { campaignHeroPoolThrough, campaignPatch } from "./patches";
import { automaticTalents, normalizeTalentPlan } from "./talents";
import { battlePlayerIdentity } from './player-identity';
import { managedPatchObserver } from "./patch-knowledge";
import { oppositionStaff } from "./staff";
import { withDraftKnowledge } from "./draft";
import { tournamentForRun, tournamentById } from "./tournaments";
import { roundTraining } from "./training";
import { nextScrim, scrimFocuses, scrimHours } from "./scrim-state";
import type { Scrim, ScrimFocus } from "./scrim-state";
import { fullRosterBlocker } from "./player-welfare";
import { synergyBonus } from "./player-market";

const DAY = 86400000;
const hash = (text: string) => [...text].reduce((n, ch) => Math.imul(n ^ ch.charCodeAt(0), 16777619) >>> 0, 2166136261);
export const scrimOpponents = (c: Campaign) => c.world ? activeClubs(c.world).filter(t => t.id !== c.world!.managedTeamId && t.roster.length === 5 && new Set(t.roster).size === 5 && t.roster.every(id => !c.roster.includes(id) && c.players.some(p => p.id === id))) : [];

export function scrimSlotBlocker(c: Campaign, opponentId: string, at: string, bestOf: number, ignoreId?: string): string | null {
  if (fullRosterBlocker(c)) return fullRosterBlocker(c);
  if (!c.calendar) return "Use the dated calendar to schedule team scrims.";
  if (!scrimOpponents(c).some(t => t.id === opponentId)) return "This team no longer has an available starting five.";
  if (![1, 2, 3].includes(bestOf)) return "Choose BO1, BO2 or BO3.";
  const start = Date.parse(at), now = Date.parse(c.calendar.now), end = start + scrimHours(bestOf) * 3600000;
  if (!Number.isFinite(start) || start < now || start > now + 28 * DAY) return "Choose a time within the next 28 days.";
  if (c.scrims?.sessions.some(s => s.id !== ignoreId && ["scheduled", "complete"].includes(s.status) && Math.abs(Date.parse(s.at) - start) < DAY)) return "Leave at least 24 hours between scrim starts for recovery.";
  for (const run of c.calendar.runs.filter(r => r.state === "playing")) {
    const event = tournamentForRun(run);
    if (event && start < Date.parse(event.end) + DAY && end > Date.parse(event.start) && (run.managed || run.teams.some(t => t.id === opponentId))) return `Registered tournament dates at ${event.name} are reserved for competition.`;
  }
  for (const [id, reservation] of Object.entries(c.office?.registrations ?? {})) {
    const event = tournamentById(id);
    if (reservation.status === "reserved" && !c.calendar.runs.some(r => r.eventId === id) && event && start < Date.parse(event.end) + DAY && end > Date.parse(event.start)) return `Your reserved dates at ${event.name} overlap this scrim.`;
  }
  return null;
}

/** Deterministic, fictional requests: one opportunity per calendar week, no rerolls on reload. */
export function syncScrims(c: Campaign): Campaign {
  if (!c.calendar) return c;
  const now = Date.parse(c.calendar.now), week = Math.floor(now / (7 * DAY));
  const state = c.scrims ?? { sessions: [], research: {} };
  let changed = false;
  const sessions = state.sessions.map(s => {
    if (s.status === "requested" && Date.parse(s.at) <= now) { changed = true; return { ...s, status: "expired" as const }; }
    return s;
  });
  if (state.requestWeek !== week) {
    changed = true;
    const candidates = scrimOpponents(c).sort((a, b) => (a.region !== c.settings.region ? 1 : 0) - (b.region !== c.settings.region ? 1 : 0) || hash(`${week}:${a.id}`) - hash(`${week}:${b.id}`));
    for (let offset = 2; offset <= 6; offset++) {
      const at = new Date(Math.floor(now / DAY) * DAY + offset * DAY + 12 * 3600000).toISOString();
      const bestOf = (1 + hash(`${week}:${c.settings.team}`) % 3) as 1 | 2 | 3;
      const club = candidates.find(t => !scrimSlotBlocker(c, t.id, at, bestOf));
      if (!club) continue;
      const id = `request-${week}-${club.id}`;
      sessions.push({ id, opponentId: club.id, opponent: club.name, at, bestOf, focus: "balanced", status: "requested", source: "request", seed: hash(id) });
      break;
    }
  }
  return changed ? { ...c, scrims: { ...state, sessions, requestWeek: week } } : c;
}

export function scheduleScrim(c: Campaign, opponentId: string, at: string, bestOf: 1 | 2 | 3, focus: ScrimFocus): Campaign {
  const reason = scrimSlotBlocker(c, opponentId, at, bestOf);
  if (reason) throw Error(reason);
  if (!Object.hasOwn(scrimFocuses, focus)) throw Error("Choose a practice focus.");
  const opponent = scrimOpponents(c).find(t => t.id === opponentId)!;
  const id = `scrim-${(c.scrims?.sessions.length ?? 0) + 1}-${hash(`${opponentId}:${at}`)}`;
  return { ...c, scrims: { research: {}, ...c.scrims, sessions: [...(c.scrims?.sessions ?? []), { id, opponentId, opponent: opponent.name, at: new Date(at).toISOString(), bestOf, focus, source: "manager", status: "scheduled", seed: hash(id) }] } };
}

export function respondToScrim(c: Campaign, id: string, accept: boolean, focus: ScrimFocus = "balanced"): Campaign {
  const session = c.scrims?.sessions.find(s => s.id === id);
  if (!session || session.status !== "requested") return c;
  if (accept) {
    const reason = scrimSlotBlocker(c, session.opponentId, session.at, session.bestOf, id);
    if (reason) throw Error(reason);
    if (!Object.hasOwn(scrimFocuses, focus)) throw Error("Choose a practice focus.");
  }
  return { ...c, scrims: { ...c.scrims!, sessions: c.scrims!.sessions.map(s => s.id === id ? { ...s, focus, status: accept ? "scheduled" : "declined" } : s) } };
}

export function cancelScrim(c: Campaign, id: string): Campaign {
  return !c.scrims ? c : { ...c, scrims: { ...c.scrims, sessions: c.scrims.sessions.map(s => s.id === id && s.status === "scheduled" ? { ...s, status: "cancelled", config: undefined } : s) } };
}

export function scrimPlayBlocker(c: Campaign, s: Scrim): string | null {
  if (s.status !== "scheduled") return "This scrim is not scheduled.";
  const reason = scrimSlotBlocker(c, s.opponentId, s.at, s.bestOf, s.id);
  // Playing is allowed at its scheduled instant only; Continue stops there.
  if (reason) return reason;
  if (Date.parse(c.calendar!.now) < Date.parse(s.at)) return "Use Continue to reach the scheduled scrim time.";
  if (nextScrim(c)?.id !== s.id) return "Play or cancel the earlier scrim first.";
  const club = scrimOpponents(c).find(t => t.id === s.opponentId)!;
  if ([...teamPlayers(c), ...club.roster.map(id => c.players.find(p => p.id === id)!)].some(p => p.energy < 20)) return "A starter has less than 20 energy. Cancel this session and allow recovery.";
  return null;
}

/** Pin the participants/patch once. An unfinished series restarts on reload, with no rewards. */
export function prepareScrim(c: Campaign, id: string): Campaign {
  const s = c.scrims?.sessions.find(s => s.id === id);
  if (!s) throw Error("Unknown scrim.");
  const reason = scrimPlayBlocker(c, s);
  if (reason) throw Error(reason);
  if (s.config) return c;
  const club = scrimOpponents(c).find(t => t.id === s.opponentId)!;
  const row = (p: Player, role: number, managed: boolean) => ({ id: p.id, name: p.name, role, identity: battlePlayerIdentity(p, role), skills: { ...p.stats }, energy: p.energy, happiness: p.happiness, talents: managed ? normalizeTalentPlan(c.talentPlans?.[p.id]) : automaticTalents(role,p.identity) });
  const config: BattleConfig = withDraftKnowledge(c, {
    seed: s.seed, year: c.year, heroPoolThroughYear: campaignHeroPoolThrough(c), patchId: campaignPatch(c).id,
    teams: [c.settings.team, club.name], players: [teamPlayers(c).map((p, r) => row(p, r, true)), club.roster.map((id, r) => row(c.players.find(p => p.id === id)!, r, false))],
    bonuses: [(c.settings.difficulty === "Club" ? 0.14 : c.settings.difficulty === "Legend" ? -0.12 : 0) + synergyBonus(c, c.roster), synergyBonus(c, club.roster)],
    patchObservers: [managedPatchObserver(c), { teamKey: club.id, staffIds: oppositionStaff(club.id) }], seriesFormat: { bestOf: s.bestOf },
  });
  return { ...c, scrims: { ...c.scrims!, sessions: c.scrims!.sessions.map(s => s.id === id ? { ...s, config } : s) } };
}

export function settleScrim(current: Campaign, id: string, series: SeriesSummary): Campaign {
  const s = current.scrims?.sessions.find(s => s.id === id);
  if (!s || s.status === "complete") return current;
  const config = s.config;
  const score: [number, number] = [0, 0];
  for (const game of series.games) if (game.winner === 0 || game.winner === 1) score[game.winner]++;
  const countValid = s.bestOf === 2 ? series.games.length === 2 : Math.max(...score) === Math.floor(s.bestOf / 2) + 1 && series.games.length <= s.bestOf && series.games.slice(0, -1).filter(g => g.winner === series.winner).length < Math.floor(s.bestOf / 2) + 1;
  if (s.status !== "scheduled" || !config || !current.calendar || Date.parse(current.calendar.now) !== Date.parse(s.at) || series.seed !== config.seed || series.engine !== "lane-siege-v1" || series.bestOf !== s.bestOf || series.patch?.id !== config.patchId || series.teams.some((t, i) => t !== config.teams[i]) || series.score.some((n, i) => n !== score[i]) || series.winner !== (score[0] === score[1] ? null : score[0] > score[1] ? 0 : 1) || !countValid || series.games.some(g => !Number.isFinite(g.duration) || g.duration <= 0 || g.players.length !== 10 || new Set(g.players.map(p => p.id)).size !== 10 || g.players.some(p => !config.players[p.team]?.some(row => row.id === p.id) || !p.heroId))) throw Error("This result does not match the scheduled scrim.");
  let c = structuredClone(current);
  const finished = c.scrims!.sessions.find(row => row.id === id)!;
  finished.status = "complete";
  finished.series = structuredClone(series);
  delete finished.config;
  const patchId = config.patchId!;
  const research = c.scrims!.research[patchId] ??= {};
  const heroes = new Set<string>();
  for (const game of series.games) for (const hero of new Set(game.players.map(p => p.heroId))) {
    research[hero] = Math.min(200, (research[hero] ?? 0) + 1);
    heroes.add(hero);
  }
  const review: NonNullable<Scrim["review"]> = { players: [], heroes: [...heroes] };
  const n = series.games.length;
  for (const side of config.players) for (const starter of side) {
    const p = c.players.find(p => p.id === starter.id);
    if (!p) continue;
    const readiness = Math.max(0.25, Math.min(1, p.energy / 60));
    const energy = p.energy, confidence = p.stats.confidence;
    p.energy = roundTraining(clamp(p.energy - n * 5));
    p.stats.confidence = roundTraining(clamp(confidence + n * 0.04 * readiness, 0, 99));
    let training = 0;
    for (const key of scrimFocuses[s.focus].stats) {
      const before = p.stats[key];
      p.stats[key] = roundTraining(clamp(before + n * 0.08 * readiness / scrimFocuses[s.focus].stats.length, 0, 99));
      training += p.stats[key] - before;
    }
    if (config.players[0].some(row => row.id === p.id)) review.players.push({ id: p.id, name: p.name, confidence: roundTraining(p.stats.confidence - confidence), training: roundTraining(training), energy: roundTraining(p.energy - energy) });
  }
  finished.review = review;
  // Reserve the maximum session slot; no weekly payroll/training is bypassed.
  c = advanceCalendarTo(c, new Date(Date.parse(s.at) + scrimHours(s.bestOf) * 3600000).toISOString());
  c.log = [`Scrim vs ${s.opponent} · ${series.score.join("–")} · ${n} practice maps, private patch ${patchId} observations.`, ...c.log].slice(0, 100);
  return c;
}
