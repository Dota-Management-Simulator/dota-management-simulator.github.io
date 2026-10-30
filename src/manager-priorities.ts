import type { Campaign } from './game';
import type { OfficeAction } from './office';
import { money, teamPlayers } from './game';
import { campaignWeek, weeksRemaining } from './contracts';
import { financeForecast } from './finance-forecast';
import { managerCompetition } from './manager-view';
export interface ManagerPriority { id: string; title: string; detail: string; urgency: number; action: OfficeAction }
export function managerPriorities(c: Campaign): ManagerPriority[] {
  const rows: ManagerPriority[] = [], players = teamPlayers(c);
  for (const p of players) {
    const welfare = c.welfare?.players[p.id];
    if (welfare?.noticeAt != null) rows.push({ id: `notice:${p.id}`, urgency: 100, title: `${p.name} has given notice`, detail: `${Math.max(0, welfare.noticeAt + 2 - campaignWeek(c))} weekly reviews remain to address concerns.`, action: { kind: 'player', playerId: p.id } });
    const contract = c.contracts?.[p.id];
    if (contract && weeksRemaining(c, contract) <= 2) rows.push({ id: `contract:${p.id}`, urgency: 65 - weeksRemaining(c, contract), title: `${p.name}: renewal ${weeksRemaining(c, contract) ? 'approaching' : 'due'}`, detail: `${weeksRemaining(c, contract)} weeks left. Review pay and practice terms.`, action: { kind: 'player', playerId: p.id } });
  }
  if (players.length < 5) rows.push({ id: 'vacancy', urgency: 95, title: 'Rebuild the starting five', detail: `${5 - players.length} vacant positions block competitive play.`, action: { kind: 'page', page: 'scouting' } });
  const forecast = financeForecast(c, 8), debt = forecast.find(r => r.balance < 0);
  if (c.cash < 0 || debt) rows.push({ id: 'cash', urgency: c.cash < 0 ? 92 : debt!.offset <= 2 ? 88 : 55, title: c.cash < 0 ? 'Payroll is in debt' : `Cash runs short within ${debt!.offset} weeks`, detail: `${money(c.cash)} available. Projection excludes uncertain prizes and future deals.`, action: { kind: 'page', page: 'finances' } });
  const next = managerCompetition(c);
  if (next) {
    const days = next.at && c.calendar ? Math.ceil((Date.parse(next.at) - Date.parse(c.calendar.now)) / 86400000) : null;
    rows.push({ id: 'competition', urgency: days != null && days <= 7 ? 80 : 40, title: next.name, detail: `${next.stage}${days != null ? ` · ${Math.max(0, days)} days away` : ''}`, action: { kind: 'tournament', eventId: next.eventId } });
  }
  const tired = players.filter(p => p.energy < 60);
  if (tired.length) rows.push({ id: 'fatigue', urgency: tired.some(p => p.energy < 40) ? 75 : 50, title: 'Adjust recovery before playing', detail: `${tired.map(p => `${p.name} ${p.energy}%`).join(' · ')}`, action: { kind: 'page', page: 'training' } });
  if (!rows.length) rows.push({ id: 'plan', urgency: 0, title: 'Choose the next event', detail: 'Review the calendar, arrange practice and prepare your five.', action: { kind: 'page', page: 'calendar' } });
  return rows.sort((a, b) => b.urgency - a.urgency || a.id.localeCompare(b.id)).slice(0, 3);
}
