import { useEffect, useRef, useState } from 'react';
import type { PlayerScore, ReplayFrame } from './battle';
import { matchClock } from './battle';
import { HeroToken } from './MatchExperience';
import { eventCalls, heroLife, visibleMatchEvents } from './match-events';
import type { MatchEvent } from './match-events';
import './match-announcer.css';

function audioCalls(event: MatchEvent): string[] {
  if (event.kind === 'roshan') return [event.team === 0 ? 'radiant-roshan' : 'dire-roshan'];
  if (event.kind === 'tower') return [event.team === 0 ? 'dire-tower' : 'radiant-tower'];
  if (event.kind === 'victory') return [event.team === 0 ? 'radiant-victory' : 'dire-victory'];
  return eventCalls(event).filter(call => call !== 'Killing streak ended' && call !== 'Aegis Reincarnation')
    .map(call => call.toLowerCase().replaceAll(' ', '-'));
}

export function RespawnStatus({ frame, player, time = frame.time, nextFrame }: { frame: ReplayFrame; player: PlayerScore; time?: number; nextFrame?: ReplayFrame }) {
  const {dead, remaining} = heroLife(frame, player, time, nextFrame);
  if (!dead) return null;
  return <small className="hero-death-timer">{remaining === undefined ? 'Respawning' : remaining > 0 ? `Respawn in ${remaining}s` : 'Returning…'}</small>;
}

export default function MatchAnnouncer({ frame, nextFrame, time = frame.time, playing = true }: {
  frame: ReplayFrame; nextFrame?: ReplayFrame; time?: number; playing?: boolean;
}) {
  const events = visibleMatchEvents(frame, nextFrame, time);
  const latestId = events.at(-1)?.id ?? 0;
  const [sound, setSound] = useState(false), [audioError, setAudioError] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const queue = useRef<string[]>([]), seen = useRef(latestId), lastTime = useRef(time);
  const playNext = () => {
    const clip = queue.current.shift();
    if (!clip || !audio.current) return;
    audio.current.src = `${import.meta.env.BASE_URL}dota-audio/${clip}.mp3`;
    audio.current.play().catch((error: DOMException) => {
      if (error.name === 'AbortError') return;
      queue.current = []; setAudioError(true); setSound(false);
    });
  };
  useEffect(() => {
    const element = new Audio();
    element.volume = .7;
    element.onended = () => playNext();
    audio.current = element;
    const hidden = () => { if (document.hidden) { element.pause(); queue.current = []; } };
    document.addEventListener('visibilitychange', hidden);
    return () => { element.pause(); element.onended = null; audio.current = null; queue.current = []; document.removeEventListener('visibilitychange', hidden); };
  }, []);
  useEffect(() => {
    const rewound = time < lastTime.current;
    lastTime.current = time;
    if (rewound) { audio.current?.pause(); queue.current = []; seen.current = latestId; return; }
    const fresh = events.filter(e => e.id > seen.current && audioCalls(e).length);
    seen.current = Math.max(seen.current, latestId);
    if (!sound || !playing || document.hidden) { audio.current?.pause(); queue.current = []; return; }
    if (!fresh.length) return;
    // Keep the newest call at high speeds; never build a stale voice backlog.
    queue.current = audioCalls(fresh.at(-1)!).slice(-2);
    if (audio.current?.paused) playNext();
  }, [latestId, time, sound, playing]);

  const player = (id?: string) => frame.players.find(p => p.id === id);
  const describe = (event: MatchEvent) => {
    const killer = player(event.killerId), victim = player(event.victimId);
    if (event.kind === 'kill') return `${killer ? `${killer.player} (${killer.hero})` : event.target ?? `${event.team === 0 ? 'Radiant' : 'Dire'} forces`} killed ${victim ? `${victim.player} (${victim.hero})` : 'a hero'}`;
    if (event.kind === 'reincarnation') return `${victim?.player ?? 'Hero'} will rise again with Aegis`;
    return event.target ?? `${event.team === 0 ? 'Radiant' : 'Dire'} ${event.kind === 'roshan' ? 'slays Roshan' : 'wins the map'}`;
  };
  const headline = events.filter(e => eventCalls(e).length).at(-1);
  const actor = headline && player(headline.killerId ?? headline.victimId);
  return <div className="match-announcer" aria-label="Match announcements and death timers">
    <div className="announcer-controls"><span>MATCH ACTIVITY</span><button type="button" aria-pressed={sound} onClick={() => {
      seen.current = latestId; setAudioError(false); setSound(!sound);
      if (!sound) { queue.current = ['mega-kill']; playNext(); } else { audio.current?.pause(); queue.current = []; }
    }}>{sound ? 'Announcer: on' : 'Enable announcer'}</button></div>
    {audioError && <small className="announcer-audio-error">Audio unavailable. Enable announcer to retry.</small>}
    <div className="match-life-strip">{([0, 1] as const).map(side => <div key={side} className={`match-life-team ann-side-${side}`} aria-label={side === 0 ? 'Radiant heroes' : 'Dire heroes'}>{frame.players.filter(p => p.team === side).map(p => {
      const {dead, remaining} = heroLife(frame, p, time, nextFrame);
      const status = dead ? remaining === undefined ? 'Respawning' : remaining > 0 ? `Respawn in ${remaining} seconds` : 'Returning' : 'Alive';
      return <div key={p.id} className={`match-life-hero ${dead ? 'dead' : ''}`} title={`${p.player} · ${p.hero} · ${status}`} aria-label={`${p.player}, ${p.hero}, ${status}`}>
        <div className="match-life-portrait"><HeroToken score={p}/>{dead && <b>{remaining === undefined ? '†' : remaining > 0 ? remaining : '↻'}</b>}</div><small>{p.hero}</small>
      </div>;
    })}</div>)}</div>
    <div className={`announcer-banner ${headline ? `ann-side-${headline.team}` : 'quiet'}`} role="status" aria-atomic="true">
      {headline ? <><small>{actor ? `${actor.player} · ${actor.hero}` : headline.team === 0 ? 'RADIANT' : 'DIRE'}</small><strong>{eventCalls(headline).join(' · ')}!</strong></> : <><small>THE BATTLE IS ON</small><strong>Every kill counts</strong></>}
    </div>
    <ol className="match-kill-feed" aria-label="Recent match events">{events.slice(-4).reverse().map(event => <li key={event.id} className={`ann-side-${event.team}`}><time>{matchClock(event.time)}</time><span>{describe(event)}{event.kind === 'kill' && eventCalls(event).length > 0 && <em>{eventCalls(event).join(' · ')}</em>}</span></li>)}</ol>
    {frame.matchEvents === undefined && <small className="announcer-legacy">Event details are unavailable in this older replay.</small>}
  </div>;
}
