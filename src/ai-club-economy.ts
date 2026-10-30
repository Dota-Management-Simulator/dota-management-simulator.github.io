import type { Campaign, Player } from './game';
import type { Club } from './history';
import { marketValue } from './player-market';
import { careerHash } from './player-career';
export interface AiClubBudget { cash: number; weeklyIncome: number; payroll: number; lastWeek: number }
export interface AiTransfer { clubId: string; playerId: string; outgoingId: string; week: number; fee: number; wage: number }
export interface AiEconomy { clubs: Record<string, AiClubBudget>; transfers: AiTransfer[]; lastMarketWeek?: number }
const ovr = (p: Player) => Object.values(p.stats).reduce((n, v) => n + v, 0) / 12;
const bounded = (n: number) => Math.max(-1e9, Math.min(1e9, Math.round(n)));
export function normalizeAiEconomy(value: unknown): AiEconomy | undefined {
  if (!value || typeof value !== 'object') return;
  const row = value as AiEconomy;
  if (!row.clubs || typeof row.clubs !== 'object' || Array.isArray(row.clubs)) return;
  const clubs = Object.fromEntries(Object.entries(row.clubs).filter(([id, v]) => id.length < 150 && v && [v.cash, v.weeklyIncome, v.payroll, v.lastWeek].every(Number.isFinite)).slice(0, 1000)
    .map(([id, v]) => [id, { cash: bounded(v.cash), weeklyIncome: Math.max(0, bounded(v.weeklyIncome)), payroll: Math.max(0, bounded(v.payroll)), lastWeek: Math.round(v.lastWeek) }]));
  const transfers = Array.isArray(row.transfers) ? row.transfers.filter(t => t && typeof t.clubId === 'string' && typeof t.playerId === 'string' && typeof t.outgoingId === 'string' && [t.week, t.fee, t.wage].every(Number.isFinite)).slice(-12) : [];
  return { clubs, transfers, ...(Number.isSafeInteger(row.lastMarketWeek) ? { lastMarketWeek: row.lastMarketWeek } : {}) };
}
function payroll(c: Campaign, club: Club) { return club.roster.reduce((sum, id) => { const p = c.players.find(p => p.id === id); return sum + (p ? marketValue(c, p).wage : 0); }, 0); }
export function clubBudget(c: Campaign, club: Club, week = 0): AiClubBudget {
  const stored = c.aiEconomy?.clubs[club.id]; if (stored) return stored;
  const pay = payroll(c, club), seed = careerHash(`club-finance:${club.id}`);
  return { cash: pay * (8 + seed % 7), weeklyIncome: Math.round(pay * (.94 + (seed >>> 5) % 23 / 100)), payroll: pay, lastWeek: week - 1 };
}
/** Paid clocks only. No unplayed results, historical wages or manager funds. */
export function advanceAiEconomy(c: Campaign, week: number) {
  if (!c.world) return;
  c.aiEconomy ??= { clubs: {}, transfers: [] };
  const snapshot = { ...c };
  for (const club of c.world.clubs.filter(t => t.active !== false && t.id !== c.world!.managedTeamId)) {
    const before = clubBudget(snapshot, club, week); if (before.lastWeek >= week) continue;
    const pay = payroll(snapshot, club);
    c.aiEconomy.clubs[club.id] = { ...before, cash: bounded(before.cash + before.weeklyIncome - pay), payroll: pay, lastWeek: week };
  }
  // Registered lineups and prepared practice are fixed; business resumes later.
  if (week % 4 || c.calendar?.runs.some(r => r.state === 'playing') || c.scrims?.sessions.some(s => s.status === 'scheduled')) return;
  if (c.aiEconomy.lastMarketWeek === week) return;
  c.aiEconomy.lastMarketWeek = week;
  const clubs = c.world.clubs.filter(t => t.active !== false && t.id !== c.world!.managedTeamId && t.roster.length === 5)
    .sort((a, b) => careerHash(`${week}:${a.id}`) - careerHash(`${week}:${b.id}`));
  const owned = new Set(c.world.clubs.filter(t => t.active !== false).flatMap(t => [...t.roster, ...t.bench]));
  const protectedIds = new Set([...c.roster, ...c.world.protectedPlayerIds]);
  let moved = 0;
  for (const club of clubs) {
    if (moved >= 2) break;
    const budget = c.aiEconomy.clubs[club.id]; if (!budget || budget.cash < budget.payroll * 6) continue;
    const roster = club.roster.map(id => c.players.find(p => p.id === id)!).filter(Boolean);
    const offers = c.players.filter(p => !owned.has(p.id) && !protectedIds.has(p.id)).flatMap(p => {
      const outgoing = roster.find(old => old.role === p.role); if (!outgoing || ovr(p) < ovr(outgoing) + 3) return [];
      const value = marketValue(snapshot, p), newPayroll = budget.payroll - marketValue(snapshot, outgoing).wage + value.wage;
      if (budget.cash - value.fee < newPayroll * 4 || newPayroll > budget.weeklyIncome * 1.15) return [];
      return [{ p, outgoing, value, newPayroll, improvement: ovr(p) - ovr(outgoing) }];
    }).sort((a, b) => b.improvement - a.improvement || a.value.fee - b.value.fee || a.p.id.localeCompare(b.p.id));
    const offer = offers[0]; if (!offer) continue;
    club.roster = club.roster.map(id => id === offer.outgoing.id ? offer.p.id : id);
    owned.delete(offer.outgoing.id); owned.add(offer.p.id);
    budget.cash -= offer.value.fee; budget.payroll = offer.newPayroll;
    c.aiEconomy.transfers.push({ clubId: club.id, playerId: offer.p.id, outgoingId: offer.outgoing.id, week, fee: offer.value.fee, wage: offer.value.wage });
    c.aiEconomy.transfers = c.aiEconomy.transfers.slice(-12); moved++;
  }
}
export function creditAiClub(c: Campaign, clubId: string | undefined, amount: number) {
  const club = c.world?.clubs.find(t => t.id === clubId); if (!club || club.id === c.world?.managedTeamId || amount <= 0) return;
  c.aiEconomy ??= { clubs: {}, transfers: [] };
  const budget = clubBudget({ ...c }, club); c.aiEconomy.clubs[club.id] = { ...budget, cash: bounded(budget.cash + amount) };
}
/** Cash-backed alternative offers under the same rules used by AI recruitment.
 * No reservation or wage is charged until a club actually signs the player. */
export function competingOffers(c: Campaign, p: Player) {
  if (!c.world || c.roster.includes(p.id) || c.world.clubs.some(t => t.active !== false && [...t.roster, ...t.bench].includes(p.id))) return [];
  const value = marketValue(c, p);
  return c.world.clubs.filter(t => t.active !== false && t.id !== c.world!.managedTeamId).flatMap(club => {
    const old = c.players.find(row => club.roster.includes(row.id) && row.role === p.role);
    if (!old || ovr(p) < ovr(old) + 3) return [];
    const budget = clubBudget(c, club), wage = Math.round(value.wage * 1.08 / 10) * 10;
    const pay = budget.payroll - marketValue(c, old).wage + wage;
    return budget.cash - value.fee >= pay * 4 && pay <= budget.weeklyIncome * 1.15 ? [{ clubId: club.id, club: club.name, wage }] : [];
  }).sort((a, b) => b.wage - a.wage || a.club.localeCompare(b.club)).slice(0, 3);
}
