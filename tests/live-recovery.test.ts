import { test } from "node:test";
import assert from "node:assert/strict";
import { buildBattleConfig, createCampaign, DEFAULT_SETTINGS, events } from "../src/game";
import { LiveBattleSession } from "../src/live-battle";

test("the automatic time limit retains the live map and lets stepping finish instead of restarting", () => {
  const config = { ...buildBattleConfig(createCampaign(DEFAULT_SETTINGS), events[0], 84), captureReplay: false };
  const session = new LiveBattleSession(config), battle = session.battle;
  session.command({ type: "inspect", playerId: "all" });
  session.command({ type: "auto-glyph", enabled: false });
  battle.time = 1800; // The real automatic-run cap, in engine seconds.
  const before = battle.snapshotForTeam(0);
  const limited = session.command({ type: "finish-live" });
  assert.match(limited.message!, /still live.*resume or step/i);
  assert.equal(limited.simulation, undefined);
  assert.equal(session.battle, battle);
  assert.deepEqual(limited.frame, before);
  assert.equal(session.targetPlayerId, "all");
  assert.equal(limited.frame.glyphs![0].auto, false);
  const stepped = session.command({ type: "advance", seconds: 60 });
  assert.ok(stepped.frame.time > limited.frame.time);
  assert.equal(session.battle, battle);
  // Unexpected engine failures still surface, instead of being swallowed as limits.
  battle.run = () => { throw new Error("Unexpected failure"); };
  assert.throws(() => session.command({ type: "finish-live" }), /Unexpected failure/);
});
