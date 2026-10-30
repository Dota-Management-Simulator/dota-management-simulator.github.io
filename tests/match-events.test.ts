import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { LaneBattle } from '../src/battle';
import { buildBattleConfig, createCampaign, DEFAULT_SETTINGS, events, prepareEvent } from '../src/game';
import { deathTimer, eventCalls, heroLife, heroUnit, MatchEventLog, visibleMatchEvents } from '../src/match-events';

const config = buildBattleConfig(prepareEvent(createCampaign(DEFAULT_SETTINGS), events[0]), events[0], 9);
const battle = () => new LaneBattle({ ...config, captureReplay: false });

test('announcer distinguishes lifetime streaks from 18-second multi-kills and resets on death', () => {
  const log = new MatchEventLog();
  for (let i = 0; i < 10; i++) log.death(i * 18, 0, `victim-${i}`, 'carry');
  const events = log.recent(162);
  assert.deepEqual(eventCalls(events.find(e => e.streak === 5)!), ['Mega Kill', 'Rampage']);
  assert.deepEqual(eventCalls(events.at(-1)!), ['Beyond Godlike', 'Rampage']);
  log.death(170, 1, 'carry', 'enemy');
  assert.equal(log.recent(170).at(-1)!.endedStreak, 10);
  assert.deepEqual(eventCalls(log.recent(170).at(-1)!), ['Killing streak ended']);
  log.death(172, 0, 'fresh-victim', 'carry');
  assert.equal(log.recent(172).at(-1)!.streak, 1);
  assert.equal(log.recent(172).at(-1)!.multiKill, 1);
  log.death(191, 0, 'another-victim', 'carry');
  assert.equal(log.recent(191).at(-1)!.multiKill, 1, '19 seconds breaks the multi-kill window');
});

test('neutral deaths break streaks without first blood or kills; first blood is once per map', () => {
  const log = new MatchEventLog();
  log.death(10, 0, 'carry', undefined, true);
  assert.equal(log.recent(10)[0].firstBlood, false);
  log.death(20, 0, 'victim', 'carry');
  assert.deepEqual(eventCalls(log.recent(20).at(-1)!), ['First Blood']);
  log.death(40, 0, 'victim', 'carry');
  log.death(60, 0, 'victim', 'carry');
  log.death(70, 0, 'carry', undefined, true);
  assert.equal(log.recent(70).at(-1)!.endedStreak, 3);
  log.death(80, 0, 'victim', 'carry');
  assert.equal(log.recent(80).at(-1)!.streak, 1);
  assert.equal(log.recent(80).at(-1)!.firstBlood, false);
});

test('engine emits real kill attribution and match-clock death timers; Aegis preserves scores and streaks', () => {
  const sim = battle(), heroes = sim.units.filter(u => u.kind === 'hero');
  const killer = heroes.find(u => u.team === 0)!, victim = heroes.find(u => u.team === 1)!;
  // Drive the actual lethal-damage endpoint without introducing a combat test mode.
  const lethal = sim as unknown as { die: (target: typeof victim, source: typeof killer, neutral?: boolean) => void };
  lethal.die(victim, killer);
  let frame = sim.snapshot();
  const event = frame.matchEvents!.at(-1)!;
  assert.equal(event.killerId, killer.player!.id);
  assert.equal(event.victimId, victim.player!.id);
  assert.equal(event.firstBlood, true);
  const player = frame.players.find(p => p.id === victim.player!.id)!;
  const remaining = (6 + victim.level * 2) * 6;
  assert.equal(deathTimer(frame, player), remaining);
  assert.equal(deathTimer(frame, player, frame.time + 5), remaining - 5);
  assert.equal(deathTimer(frame, player, frame.time + remaining + 10), 0);
  victim.dead = false; victim.hp = victim.max; victim.aegisUntil = 300;
  const deaths = victim.deaths, kills = killer.kills;
  lethal.die(victim, killer);
  frame = sim.snapshot();
  assert.equal(deathTimer(frame, player), 5);
  assert.equal(victim.deaths, deaths);
  assert.equal(killer.kills, kills);
  assert.equal(frame.matchEvents!.at(-1)!.kind, 'reincarnation');
  for (let i = 0; i < 6; i++) sim.step();
  assert.equal(victim.dead, false);
  assert.equal(deathTimer(sim.snapshot(), player), undefined);
  assert.ok(!('matchEvents' in frame.players[0]), 'event log stays outside saved scoreboards');
});

test('replay events deduplicate across snapshots without revealing future events or mutating frames', () => {
  const frame = battle().snapshot(), next = structuredClone(frame);
  frame.matchEvents = [{ id: 1, time: 10, kind: 'kill', team: 0, firstBlood: true }];
  next.matchEvents = [...frame.matchEvents, { id: 2, time: 25, kind: 'tower', team: 1 }];
  const original = JSON.stringify([frame, next]);
  assert.deepEqual(visibleMatchEvents(frame, next, 24).map(e => e.id), [1]);
  assert.deepEqual(visibleMatchEvents(frame, next, 25).map(e => e.id), [1, 2]);
  assert.deepEqual(visibleMatchEvents(frame, next, 116), []);
  assert.equal(JSON.stringify([frame, next]), original);
  delete frame.matchEvents;
  assert.deepEqual(visibleMatchEvents(frame, undefined, 0), []);
  const player = frame.players[0];
  const unit = heroUnit(frame, player)!;
  unit.hp = 0; delete unit.respawnAt;
  assert.equal(deathTimer(frame, player), undefined, 'old replays do not invent timers');
});

test('death and Aegis countdowns between replay samples appear only after the actual death', () => {
  const frame = battle().snapshot(), next = structuredClone(frame), player = frame.players[0];
  frame.time = 18; next.time = 36;
  next.matchEvents = [{id:1,time:22,kind:'reincarnation',team:player.team,victimId:player.id,respawnAt:27}];
  assert.equal(heroLife(frame, player, 21, next).dead, false);
  assert.deepEqual(heroLife(frame, player, 22, next), {dead:true,remaining:5});
  assert.deepEqual(heroLife(frame, player, 26, next), {dead:true,remaining:1});
  assert.equal(heroLife(frame, player, 27, next).dead, false);
  assert.equal(heroLife(frame, player, 35, next).dead, false);
});

test('observing and capturing telemetry does not change the simulated result', () => {
  const sim = battle(), control = battle();
  for (let i = 0; i < 500; i++) {
    sim.snapshot(); sim.step(); sim.snapshot(); control.step();
  }
  assert.deepEqual(sim.snapshot(), control.snapshot());
  const saved = sim.snapshot();
  saved.matchEvents!.push({ id: 999, time: 0, kind: 'tower', team: 0 });
  assert.ok(!sim.snapshot().matchEvents!.some(e => e.id === 999), 'snapshots cannot mutate the event log');
});

test('identical battles stay identical however many battles the process has already run', () => {
  // Regression: a shared route cache once let one simulation's searches change
  // another's routes; with this seed two interleaved battles split at step 162.
  const cfg = { ...buildBattleConfig(prepareEvent(createCampaign(DEFAULT_SETTINGS), events[0]), events[0], 3), bonuses: [0, 0] as [number, number], captureReplay: false };
  const state = (b: LaneBattle) => JSON.stringify([b.time, (b as unknown as { units: { id: string; x: number; y: number; hp: number }[] }).units.map(u => [u.id, u.x, u.y, u.hp])]);
  for (let pair = 0; pair < 3; pair++) {
    const a = new LaneBattle(cfg), b = new LaneBattle(cfg);
    for (let i = 0; i < 420; i++) { a.step(); b.step(); assert.equal(state(a), state(b), `pair ${pair}, step ${i}`); }
  }
});

test('bundled original announcer recordings match their source ledger', () => {
  const ledger = JSON.parse(readFileSync('docs/dota-announcer-assets.json', 'utf8'));
  assert.equal(ledger.assets.length, 19);
  for (const asset of ledger.assets) {
    const bytes = readFileSync(asset.path);
    assert.equal(bytes.length, asset.bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256);
    assert.ok(bytes.subarray(0, 3).toString() === 'ID3' || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0), 'MP3 tag or MPEG frame sync');
  }
});
