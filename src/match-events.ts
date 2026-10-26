import type { PlayerScore, ReplayFrame, ReplayUnit, Side } from './battle';

export const streakNames = ['Killing Spree', 'Dominating', 'Mega Kill', 'Unstoppable', 'Wicked Sick', 'Monster Kill', 'Godlike', 'Beyond Godlike'];
export const multiKillNames = ['Double Kill', 'Triple Kill', 'Ultra Kill', 'Rampage'];
export interface MatchEvent {
  id: number;
  time: number;
  kind: 'kill' | 'reincarnation' | 'tower' | 'roshan' | 'victory';
  team: Side;
  killerId?: string;
  victimId?: string;
  target?: string;
  firstBlood?: boolean;
  streak?: number;
  multiKill?: number;
  endedStreak?: number;
  respawnAt?: number;
}

/** Presentation telemetry only: no RNG, rewards, or combat changes. */
export class MatchEventLog {
  private serial = 0;
  private firstBlood = false;
  private streaks = new Map<string, number>();
  private chains = new Map<string, { time: number; count: number }>();
  private events: MatchEvent[] = [];

  add(event: Omit<MatchEvent, 'id'>) {
    this.events.push({ ...event, id: ++this.serial });
    this.events = this.events.filter(e => e.time >= event.time - 90);
  }

  death(time: number, team: Side, victimId: string, killerId?: string, neutral = false, respawnAt?: number) {
    const endedStreak = this.streaks.get(victimId) ?? 0;
    this.streaks.delete(victimId);
    this.chains.delete(victimId);
    let streak = 0, multiKill = 0;
    if (killerId && !neutral) {
      streak = (this.streaks.get(killerId) ?? 0) + 1;
      this.streaks.set(killerId, streak);
      const chain = this.chains.get(killerId);
      multiKill = chain && time - chain.time <= 18 ? chain.count + 1 : 1;
      this.chains.set(killerId, { time, count: multiKill });
    }
    const firstBlood = !neutral && !this.firstBlood;
    if (!neutral) this.firstBlood = true;
    this.add({ time, kind: 'kill', team, victimId, killerId: neutral ? undefined : killerId,
      target: neutral ? 'Neutral creatures' : undefined, firstBlood, streak, multiKill, endedStreak, respawnAt });
  }

  recent(time: number) {
    return this.events.filter(e => e.time >= time - 90).map(e => ({ ...e }));
  }
}

export function eventCalls(event: MatchEvent): string[] {
  const calls: string[] = [];
  if (event.firstBlood) calls.push('First Blood');
  if ((event.streak ?? 0) >= 3) calls.push(streakNames[Math.min(event.streak! - 3, streakNames.length - 1)]);
  if ((event.multiKill ?? 0) >= 2) calls.push(multiKillNames[Math.min(event.multiKill! - 2, multiKillNames.length - 1)]);
  if ((event.endedStreak ?? 0) >= 3) calls.push('Killing streak ended');
  if (event.kind === 'reincarnation') calls.push('Aegis Reincarnation');
  if (event.kind === 'tower') calls.push('Tower destroyed');
  if (event.kind === 'roshan') calls.push('Roshan has fallen');
  if (event.kind === 'victory') calls.push('Ancient destroyed');
  return calls;
}

export function visibleMatchEvents(frame: ReplayFrame, next: ReplayFrame | undefined, time: number) {
  return [...new Map([...(frame.matchEvents ?? []), ...(next?.matchEvents ?? [])].map(e => [e.id, e])).values()]
    .filter(e => e.time <= time && e.time > time - 90).sort((a, b) => a.time - b.time || a.id - b.id);
}

export function heroUnit(frame: ReplayFrame, player: PlayerScore): ReplayUnit | undefined {
  return frame.units.find(u => u.kind === 'hero' && u.team === player.team &&
    (u.playerId ? u.playerId === player.id : u.heroId === player.heroId));
}

export function heroLife(frame: ReplayFrame, player: PlayerScore, time = frame.time, next?: ReplayFrame): {dead: boolean; remaining?: number} {
  const unit = heroUnit(frame, player);
  const death = visibleMatchEvents(frame, next, time).filter(e => e.victimId === player.id && (e.kind === 'kill' || e.kind === 'reincarnation')).at(-1);
  // A death (including a five-second Aegis revival) can happen between recorded frames.
  const respawnAt = death && death.time > frame.time ? death.respawnAt : unit?.respawnAt;
  const remaining = respawnAt === undefined ? undefined : Math.max(0, Math.ceil(respawnAt - time));
  const dead = respawnAt !== undefined ? time < respawnAt : !!unit && unit.hp <= 0;
  return {dead, remaining};
}

export function deathTimer(frame: ReplayFrame, player: PlayerScore, time = frame.time): number | undefined {
  return heroLife(frame, player, time).remaining;
}
