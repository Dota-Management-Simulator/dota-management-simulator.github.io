import type { Campaign } from './game';
import { strategies } from './tactics';

export interface TacticalVictory { id: string; opponent: string; opponentId?: string }
export interface TacticalProgress { victories: TacticalVictory[]; unlocked: string[] }
const clean = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= 240;
export function normalizeTacticalProgress(value: unknown): TacticalProgress {
  const raw = value && typeof value === 'object' && !Array.isArray(value) ? value as Partial<TacticalProgress> : {};
  const victories = new Map<string, TacticalVictory>();
  for (const row of Array.isArray(raw.victories) ? raw.victories : []) {
    if (!row || !clean(row.id) || !clean(row.opponent)) continue;
    victories.set(row.id, { id: row.id, opponent: row.opponent, ...(clean(row.opponentId) ? { opponentId: row.opponentId } : {}) });
  }
  return { victories: [...victories.values()], unlocked: [...new Set((Array.isArray(raw.unlocked) ? raw.unlocked : []).filter(id => strategies.some(s => s.victory && s.id === id)))] };
}
function opponentKey(v: TacticalVictory) { return (v.opponentId ?? v.opponent).toLowerCase().replace(/[^a-z0-9]/g, ''); }
function unlockFromVictories(progress: TacticalProgress): TacticalProgress {
  const opponents = new Set(progress.victories.map(opponentKey));
  for (const strategy of strategies) {
    const rule = strategy.victory;
    if (!rule || progress.unlocked.includes(strategy.id)) continue;
    if (rule.opponent ? progress.victories.some(v => opponentKey(v) === rule.opponent || v.opponent.toLowerCase() === rule.opponentName?.toLowerCase()) : opponents.size >= rule.teams)
      progress.unlocked.push(strategy.id);
  }
  return progress;
}
/** Read actual campaign history, never exhibitions, practice wins, draws or future reference results. */
export function tacticalProgressForCampaign(c: Campaign): TacticalProgress {
  const progress = normalizeTacticalProgress(c.tacticalProgress);
  const known = new Set(progress.victories.map(v => v.id));
  const add = (v: TacticalVictory) => { if (!known.has(v.id)) { progress.victories.push(v); known.add(v.id); } };
  const clubId = (name: string) => c.world?.clubs.find(club => club.name === name)?.id;
  for (const result of c.results) {
    if (result.tournamentId || result.skipped || !result.won || !clean(result.opponent) || result.opponent === 'Full tournament') continue;
    add({ id: `event:${result.year}:${result.eventId}`, opponent: result.opponent, opponentId: clubId(result.opponent) });
  }
  for (const run of c.calendar?.runs ?? []) for (const match of run.matches) {
    if (match.winner === null || match.teams[match.winner] !== run.managed) continue;
    const otherId = match.teams[1 - match.winner];
    const other = run.teams.find(team => team.id === otherId);
    if (other) add({ id: `tournament:${run.eventId}:${match.id}`, opponent: other.name, opponentId: other.clubId ?? other.id });
  }
  return unlockFromVictories(progress);
}
export const earnedTacticalCalls = (c: Campaign): string[] => tacticalProgressForCampaign(c).unlocked;
/** Called only after a validated result is committed. Safe to repeat on load/duplicate settlement. */
export function refreshTacticalProgress(c: Campaign): string[] {
  const previous = new Set(c.tacticalProgress?.unlocked ?? []);
  const next = tacticalProgressForCampaign(c);
  if (c.tacticalProgress === undefined && !next.victories.length && !next.unlocked.length) return [];
  c.tacticalProgress = next;
  return c.tacticalProgress.unlocked.filter(id => !previous.has(id));
}
