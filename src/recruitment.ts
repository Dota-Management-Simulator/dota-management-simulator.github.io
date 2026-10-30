import type { Campaign, Player } from './game';
import { rating } from './game';
import { askingWage, candidateFit, signingFee } from './player-market';
import { releaseCost } from './contracts';
import { financeForecast } from './finance-forecast';

export function recruitmentComparison(c: Campaign, p: Player) {
  const outgoing = c.players.find(row => c.roster.includes(row.id) && row.role === p.role);
  const wage = askingWage(c, p), fee = signingFee(c, p), release = outgoing ? releaseCost(c, outgoing.id) : 0;
  const upfront = fee + release, wageDelta = wage - (outgoing?.wage ?? 0), fit = candidateFit(c, p);
  const proposed: Campaign = { ...c, cash: c.cash - upfront,
    roster: [...c.roster.filter(id => id !== outgoing?.id), p.id], players: c.players.map(row => row.id === p.id ? { ...row, wage } : row) };
  const forecast = financeForecast(proposed, 8);
  return { outgoing, wage, fee, release, upfront, wageDelta, fit, overallDelta: rating(p) - (outgoing ? rating(outgoing) : 0),
    eightWeekCost: upfront + wage * 8, additionalEightWeekCost: upfront + wageDelta * 8,
    closingCash: forecast.at(-1)!.balance, firstDebt: proposed.cash < 0 ? 'Immediately after signing' : forecast.find(row => row.balance < 0)?.label };
}
export function toggleShortlist(c: Campaign, id: string): Campaign {
  if (!c.players.some(p => p.id === id)) return c;
  const ids = c.shortlist ?? [];
  return { ...c, shortlist: ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id].slice(-100) };
}
