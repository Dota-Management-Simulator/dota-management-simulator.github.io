import { test } from "node:test";
import assert from "node:assert/strict";
import { liveCadence, replayPosition, replayWindow } from "../src/match-playback";
import type { ReplayFrame } from "../src/battle";
import { LiveBattleSession } from "../src/live-battle";
import { buildBattleConfig, createCampaign, DEFAULT_SETTINGS, events } from "../src/game";

test("replay lookup handles boundaries, irregular final frames and backwards seeking", () => {
  const frames = [0, 18, 36, 39].map(time => ({ time }) as ReplayFrame);
  for (const [clock, before, after, ratio] of [[-1,0,0,0], [0,0,0,0], [9,0,18,.5], [18,18,18,0], [37,36,39,1/3], [99,39,39,0], [27,18,36,.5]]) {
    const window = replayWindow(frames, clock);
    assert.equal(window.before.time, before);
    assert.equal(window.after.time, after);
    assert.equal(window.ratio, ratio);
  }
  assert.equal(replayWindow([frames[0]], 10).before, frames[0]);
});

test("map interpolation never animates death or respawn teleports", () => {
  const alive = { x: 100, y: 200, hp: 100 };
  const moved = { x: 200, y: 400, hp: 80 };
  const dead = { x: 710, y: 90, hp: 0 };
  assert.deepEqual(replayPosition(alive, moved, .5), { x: 150, y: 300 });
  assert.deepEqual(replayPosition(alive, dead, .5), { x: 100, y: 200 });
  assert.deepEqual(replayPosition(dead, alive, .5), { x: 710, y: 90 });
  assert.deepEqual(replayPosition(alive, undefined, .5), { x: 100, y: 200 });
});

test("all live playback speeds preserve thirty game seconds per second at 1× and integral ticks", () => {
  for (const speed of [.5, 1, 2, 4, 8, 16, 32]) {
    const { intervalMs, seconds } = liveCadence(speed);
    assert.equal(seconds / intervalMs * 1000, 30 * speed);
    assert.equal(seconds / 1.2, Math.round(seconds / 1.2));
  }
});

test("changing live cadence preserves the complete match and accepted tactical orders", () => {
  const config = { ...buildBattleConfig(createCampaign(DEFAULT_SETTINGS), events[0], 42), captureReplay: false };
  const a = new LiveBattleSession(config), b = new LiveBattleSession(config);
  const request = { type: "order", at: 0, order: { strategyId: "supports-mid" } } as const;
  const accepted = a.command(request);
  assert.equal(accepted.message, "Order accepted.");
  assert.deepEqual(accepted, b.command(request));
  // Different-sized automatic playback advances retain the accepted order.
  for (let i = 0; i < 16; i++) a.advance(liveCadence(1).seconds);
  b.advance(liveCadence(32).seconds);
  assert.deepEqual(a.update(), b.update());
  const finished = a.command({ type: "finish-live" });
  while (b.battle.winner === null) b.advance(liveCadence(8).seconds);
  assert.deepEqual(finished.simulation, b.update().simulation);
});
