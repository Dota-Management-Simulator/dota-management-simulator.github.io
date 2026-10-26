import type { Campaign, Player } from "./game";
import { campaignWeek } from "./contracts";
import { allRosterReferences, historicalPlayerId } from "./history";
import { trainingSchedule } from "./training";
import { scrimHours } from "./scrim-state";
import { sponsorBenefits } from "./sponsors";
import { playerTournamentLock } from "./tournament-locks";

const WEEK = 604800000;
const bound = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));
const hash = (s: string) => [...s].reduce((n, ch) => Math.imul(n ^ ch.charCodeAt(0), 16777619) >>> 0, 2166136261);
export interface WelfareRecord {
  joinedAt: number;
  satisfaction: number;
  unhappyWeeks: number;
  noticeAt?: number;
  concernAt?: number;
  lastTalkAt?: number;
  lastReview?: number;
  conflicts: Record<string, number>;
  concerns: string[];
}
export interface Departure {
  id: string; playerId: string; name: string; week: number; at: string;
  kind: "quit" | "kicked"; reason: string; severance: number;
}
export interface PlayerWelfare {
  players: Record<string, WelfareRecord>;
  departures: Departure[];
}
export const freshWelfare = (c: Campaign): WelfareRecord => ({ joinedAt: campaignWeek(c), satisfaction: 75, unhappyWeeks: 0, conflicts: {}, concerns: [] });

// Annual source observations describe organizations, never personal conduct.
// Exclude future batches; ignore simultaneous/ambiguous observations and moves
// where at least three of the same teammates changed organization together.
const observations = new Map<string, { year: number; club: string; roster: string[]; source: string }[]>();
for (const ref of allRosterReferences) {
  const year = Number(ref.date.slice(0, 4));
  const roster = ref.roster.map((name, i) => ref.playerIds?.[i] ?? historicalPlayerId(name));
  for (const id of roster) {
    const rows = observations.get(id) ?? [];
    if (!rows.some(r => r.year === year && r.club === ref.id)) rows.push({ year, club: ref.id, roster, source: ref.source });
    observations.set(id, rows);
  }
}
export function rosterMovement(c: Campaign, p: Player) {
  const through = Math.min(c.year - 1, c.world?.dataThroughYear ?? c.year - 1);
  const rows = (observations.get(p.id) ?? []).filter(r => r.year <= through);
  const years = [...new Set(rows.map(r => r.year))].sort((a, b) => a - b);
  const clear = years.flatMap(year => { const matches = rows.filter(r => r.year === year); return matches.length === 1 ? matches : []; });
  let changes = 0;
  for (let i = 1; i < clear.length; i++) {
    const before = clear[i - 1], after = clear[i];
    if (after.year === before.year + 1 && after.club !== before.club && before.roster.filter(id => after.roster.includes(id)).length < 3) changes++;
  }
  return { changes, observations: clear.length, through, sources: [...new Set(clear.map(r => r.source))] };
}

export function welfarePreferences(c: Campaign, p: Player) {
  const seed = hash(`expectations:${p.id}`);
  const movement = rosterMovement(c, p);
  const demanding = seed % 5 === 0;
  return {
    winRate: [40, 45, 50, 55, 60, 65][seed % 6],
    maxHours: [28, 32, 36, 40][(seed >>> 3) % 4],
    restDays: (seed >>> 6) % 3 === 0 ? 3 : 2,
    practice: (["balanced", "scrims", "training"] as const)[(seed >>> 8) % 3],
    scrimHours: [2, 4, 6][(seed >>> 10) % 3],
    patience: Math.max(2, (demanding ? 3 : 5) - Math.min(2, Math.floor(movement.changes / 3))),
    sensitivity: demanding ? 1.35 : 1,
    demanding,
    movement,
  };
}

export function welfareRecord(c: Campaign, id: string): WelfareRecord {
  return c.welfare?.players[id] ?? freshWelfare(c);
}
export function fullRosterBlocker(c: Campaign): string | null {
  const roles = ["Carry", "Mid", "Offlane", "Soft support", "Hard support"];
  const missing = roles.filter(role => !c.roster.some(id => c.players.find(p => p.id === id)?.role === role));
  return c.roster.length === 5 && new Set(c.roster).size === 5 && !missing.length ? null : `Recruit a full starting five before playing. Vacant positions: ${missing.join(", ") || "check duplicate positions"}.`;
}

/** Completed competitive maps only, attributed to participants; scrims and
 * Arcade never inflate the ambition sample. Unknown old lineups stay unknown. */
export function competitiveForm(c: Campaign, id: string) {
  const maps: { at: number; won: boolean }[] = [];
  const start = c.welfare?.players[id]?.joinedAt ?? -Infinity;
  for (const run of c.calendar?.runs ?? []) for (const match of run.matches) {
    const games = match.series?.games ?? match.performance?.games ?? [];
    const at = Date.parse(match.at);
    const week = c.calendar!.contractEpoch + Math.floor((at - Date.parse(c.calendar!.origin)) / WEEK);
    if (week < start) continue;
    for (const game of games) {
      const player = game.players.find(p => p.id === id);
      if (player && (game.winner === 0 || game.winner === 1)) maps.push({ at, won: game.winner === player.team });
    }
  }
  for (const result of c.results) {
    if (result.tournamentId || result.skipped || !result.series || result.year * 18 + result.week - 1 < start) continue;
    for (const game of result.series.games) {
      const player = game.players.find(p => p.id === id);
      if (player && (game.winner === 0 || game.winner === 1)) maps.push({ at: result.year * 100 + result.week, won: game.winner === player.team });
    }
  }
  const recent = maps.sort((a, b) => b.at - a.at).slice(0, 20);
  return { played: recent.length, winRate: recent.length ? Math.round(recent.filter(m => m.won).length / recent.length * 100) : null };
}

/** The interval ends at the weekly payroll boundary, independent of how often
 * the UI stopped between ticks. Only sessions actually attended count. */
export function welfareWorkload(c: Campaign, p: Player, end = c.calendar ? Date.parse(c.calendar.now) : NaN) {
  const schedule = trainingSchedule(c, p);
  const resting = c.training[p.id] === "Rest";
  const trainingHours = resting ? 0 : schedule.hoursPerDay * schedule.daysPerWeek;
  const days = new Set<number>();
  let scrims = 0;
  for (const s of c.scrims?.sessions ?? []) {
    const at = Date.parse(s.at);
    if (s.status !== "complete" || !Number.isFinite(end) || at < end - WEEK || at >= end || !s.review?.players.some(row => row.id === p.id)) continue;
    scrims += scrimHours(s.bestOf);
    days.add(Math.floor((at - (end - WEEK)) / 86400000));
  }
  // Training days have no weekday assignments: count distinct scrim days
  // conservatively inside training days before using additional days off.
  const busyDays = Math.max(resting ? 0 : schedule.daysPerWeek, days.size);
  const media = sponsorBenefits(c).mediaHours;
  return { trainingHours, scrimHours: scrims, totalHours: trainingHours + scrims + media, restDays: 7 - busyDays, mediaHours: media };
}

export function welfareAssessment(c: Campaign, p: Player, end?: number) {
  const preferences = welfarePreferences(c, p), record = welfareRecord(c, p.id);
  const workload = welfareWorkload(c, p, end), form = competitiveForm(c, p.id);
  const concerns: { text: string; weight: number }[] = [];
  if (form.played >= 6 && form.winRate! < preferences.winRate) concerns.push({ text: `Wants ${preferences.winRate}% competitive wins; last ${form.played} maps: ${form.winRate}%.`, weight: 1 + (preferences.winRate - form.winRate!) / 15 });
  if (workload.totalHours > preferences.maxHours) concerns.push({ text: `Wants at most ${preferences.maxHours}h of weekly training, scrims and media; current total ${workload.totalHours.toFixed(1)}h.`, weight: 1 + (workload.totalHours - preferences.maxHours) / 8 });
  if (workload.restDays < preferences.restDays) concerns.push({ text: `Wants ${preferences.restDays} days off; current schedule allows ${workload.restDays}.`, weight: 1.5 });
  if (c.calendar && preferences.practice === "scrims" && workload.scrimHours < preferences.scrimHours && workload.trainingHours >= 10) concerns.push({ text: `Prefers scrims: wants ${preferences.scrimHours}h/week; attended ${workload.scrimHours.toFixed(1)}h alongside ${workload.trainingHours.toFixed(1)}h training.`, weight: 1.5 });
  if (preferences.practice === "training" && workload.scrimHours > workload.trainingHours && workload.scrimHours >= 4) concerns.push({ text: "Wants at least as much individual training as scrim time.", weight: 1.5 });
  if (p.happiness < 40) concerns.push({ text: `Low happiness (${p.happiness.toFixed(0)}%): improve recovery, pay or morale.`, weight: 2 });
  if (p.energy < 30) concerns.push({ text: `Exhausted (${p.energy.toFixed(0)}% energy): needs recovery.`, weight: 1.5 });
  const relations = c.roster.filter(id => id !== p.id).map(id => {
    const names = [p.id, id].sort();
    const clash = hash(`compatibility:${names.join(":")}`) % 5 === 0;
    return { id, name: c.players.find(p => p.id === id)?.name ?? id, clash, tension: record.conflicts[id] ?? 0 };
  });
  for (const other of relations) if (other.tension >= 45) concerns.push({ text: `Friction with ${other.name} (${Math.round(other.tension)}/100): arrange mediation and reduce shared workload.`, weight: other.tension >= 70 ? 2.5 : 1.5 });
  return { preferences, record, workload, form, concerns, relations };
}

export function welfareStatus(c: Campaign, id: string) {
  const record = welfareRecord(c, id);
  return record.noticeAt !== undefined ? "Wants to leave" : record.unhappyWeeks >= 2 ? "Unsettled" : record.satisfaction < 55 ? "Concerned" : "Settled";
}

/** Mutates only an already cloned management transition. Returns due resignations
 * for game.ts to remove through the same roster/contract departure path. */
export function reviewPlayerWelfare(c: Campaign, reviewWeek: number, end?: number): string[] {
  c.welfare ??= { players: {}, departures: [] };
  const quitting: string[] = [];
  const assessments = c.roster.map(id => {
    const p = c.players.find(p => p.id === id)!;
    const record = c.welfare!.players[id] ??= freshWelfare(c);
    return { p, record, assessment: welfareAssessment(c, p, end) };
  });
  for (const { p, record, assessment } of assessments) {
    if (record.lastReview !== undefined && reviewWeek <= record.lastReview) continue;
    record.lastReview = reviewWeek;
    if (reviewWeek - record.joinedAt < 2) continue; // visible two-week settling-in period
    const { preferences, workload, form } = assessment;
    const strain = workload.totalHours > preferences.maxHours || p.energy < 40 || (form.played >= 6 && form.winRate! < preferences.winRate);
    const mediation = record.lastTalkAt !== undefined && reviewWeek - record.lastTalkAt <= 2;
    for (const other of assessment.relations) record.conflicts[other.id] = bound(other.tension + (mediation ? -18 : other.clash && strain ? 14 : -7));
    const current = welfareAssessment(c, p, end);
    record.concerns = current.concerns.map(v => v.text);
    const pressure = current.concerns.reduce((n, issue) => n + issue.weight, 0);
    const improving = pressure === 0;
    record.satisfaction = Math.round(bound(record.satisfaction + (improving ? 12 : -Math.min(22, pressure * 3 * preferences.sensitivity))));
    record.unhappyWeeks = improving ? Math.max(0, record.unhappyWeeks - 2) : record.unhappyWeeks + 1;
    if (record.unhappyWeeks >= 2) record.concernAt ??= reviewWeek;
    else delete record.concernAt;
    if (record.noticeAt !== undefined && (improving || record.satisfaction >= 55)) delete record.noticeAt;
    if (pressure && record.satisfaction <= 30 && record.unhappyWeeks >= preferences.patience && record.noticeAt === undefined) record.noticeAt = reviewWeek;
    if (record.noticeAt !== undefined && reviewWeek >= record.noticeAt + 2 && record.satisfaction <= 30 && !playerTournamentLock(c, p.id)) quitting.push(p.id);
    // General morale helps performance but cannot erase concrete unmet demands.
    if (pressure) p.happiness = Math.round(bound(p.happiness - Math.min(4, pressure)) * 100) / 100;
  }
  return quitting;
}

export function playerTalkBlocker(c: Campaign, id: string) {
  if (!c.roster.includes(id)) return "Only your own starters can have a team meeting.";
  const last = welfareRecord(c, id).lastTalkAt;
  return last !== undefined && campaignWeek(c) - last < 4 ? `Next meeting in ${4 - (campaignWeek(c) - last)} weeks.` : null;
}
export function talkToPlayer(current: Campaign, id: string): Campaign {
  if (playerTalkBlocker(current, id)) return current;
  const c = structuredClone(current);
  c.welfare ??= { players: {}, departures: [] };
  const record = c.welfare.players[id] ??= freshWelfare(c);
  record.lastTalkAt = campaignWeek(c);
  // A meeting buys breathing room, never withdraws an ultimatum on its own.
  record.satisfaction = Math.min(100, record.satisfaction + 8);
  for (const [other, tension] of Object.entries(record.conflicts)) {
    record.conflicts[other] = Math.max(0, tension - 25);
    const counterpart = c.welfare.players[other];
    if (counterpart?.conflicts[id]) counterpart.conflicts[id] = Math.max(0, counterpart.conflicts[id] - 25);
  }
  const name = c.players.find(p => p.id === id)!.name;
  c.log = [`Met with ${name}. Tension eased; expectations still need to be met.`, ...c.log].slice(0, 30);
  return c;
}

export function normalizeWelfare(value: unknown): PlayerWelfare | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const state = value as Partial<PlayerWelfare>;
  const players: PlayerWelfare["players"] = {};
  if (state.players && typeof state.players === "object" && !Array.isArray(state.players)) for (const [id, r] of Object.entries(state.players)) {
    if (!r || !Number.isSafeInteger(r.joinedAt) || !Number.isFinite(r.satisfaction) || !Number.isSafeInteger(r.unhappyWeeks)) continue;
    players[id] = { joinedAt: r.joinedAt, satisfaction: bound(r.satisfaction), unhappyWeeks: bound(r.unhappyWeeks, 0, 1000),
      conflicts: r.conflicts && typeof r.conflicts === "object" ? Object.fromEntries(Object.entries(r.conflicts).filter(([, n]) => Number.isFinite(n)).map(([other, n]) => [other, bound(n)])) : {},
      concerns: Array.isArray(r.concerns) ? r.concerns.filter(s => typeof s === "string").slice(0, 20) : [],
      ...(Number.isSafeInteger(r.noticeAt) ? { noticeAt: r.noticeAt } : {}),
      ...(Number.isSafeInteger(r.concernAt) ? { concernAt: r.concernAt } : {}),
      ...(Number.isSafeInteger(r.lastTalkAt) ? { lastTalkAt: r.lastTalkAt } : {}),
      ...(Number.isSafeInteger(r.lastReview) ? { lastReview: r.lastReview } : {}),
    };
  }
  const departures = Array.isArray(state.departures) ? state.departures.filter(d => d && typeof d.id === "string" && typeof d.playerId === "string" && typeof d.name === "string" && Number.isSafeInteger(d.week) && typeof d.at === "string" && ["quit", "kicked"].includes(d.kind) && typeof d.reason === "string" && Number.isFinite(d.severance) && d.severance >= 0).slice(-80) : [];
  return { players, departures };
}
