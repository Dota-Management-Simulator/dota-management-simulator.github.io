import { test } from "node:test";
import assert from "node:assert/strict";
import { postGameEra, scoreMetric, teamMetricShare } from "../src/post-game";
import type { PlayerScore } from "../src/battle";
import type { ScoreboardGame } from "../src/scoreboards";

const player: PlayerScore = { id: "a", player: "A", heroId: "axe", hero: "Axe", team: 0, role: 0,
  level: 20, kills: 4, deaths: 2, assists: 6, gold: 12600, xp: 18000, lastHits: 90, heroDamage: 0 };
const game: ScoreboardGame = { winner: 0, duration: 1200, kills: [20, 10], players: [player, { ...player, id: "b", heroDamage: 200 }] };

test("post-game screens change on documented client and summary boundaries", () => {
  for (const [date, id] of [["2011-08-17", "beta"], ["2012-05-23", "beta"], ["2012-05-24", "source1"],
    ["2015-09-08", "source1"], ["2015-09-09", "reborn"], ["2016-08-22", "reborn"], ["2016-08-23", "summary"],
    ["2018-03-11", "summary"], ["2018-03-12", "analytics"], ["2026-10-25", "analytics"], ["2027-01-01", "future"]]) {
    assert.equal(postGameEra(2026, "2026.2", `${date}T12:00:00Z`).id, id);
  }
});

test("archive era follows its saved patch and has a stable fallback without dates", () => {
  assert.equal(postGameEra(2026, "2011.1").id, "beta");
  assert.equal(postGameEra(2026, "2014.2").id, "source1");
  assert.equal(postGameEra(2011).id, "beta");
  assert.equal(postGameEra(2017).id, "summary");
  assert.equal(postGameEra(2011, undefined, "not a date").id, "beta");
  assert.equal(postGameEra(2011, undefined, "2011-W17").id, "beta");
});

test("post-game rates match career statistics, excluding starting gold and using match minutes", () => {
  assert.equal(scoreMetric(player, game, "gpm"), 600);
  assert.equal(scoreMetric(player, game, "xpm"), 900);
  assert.equal(scoreMetric({ ...player, gold: 500 }, game, "gpm"), 0);
  assert.equal(scoreMetric(player, { ...game, duration: 0 }, "gpm"), null);
  assert.equal(scoreMetric(player, game, "participation"), 50);
  assert.equal(scoreMetric(player, { ...game, kills: [0, 0] }, "participation"), 0);
  assert.equal(scoreMetric(player, { ...game, kills: [1, 0] }, "participation"), 100);
});

test("missing telemetry stays unknown while recorded zero remains zero", () => {
  assert.equal(scoreMetric(player, game, 'denies'), null);
  assert.equal(scoreMetric({...player,denies:0,buybacks:2}, game, 'denies'), 0);
  assert.equal(scoreMetric({...player,denies:0,buybacks:2}, game, 'buybacks'), 2);
  assert.equal(scoreMetric(player, game, "heroDamage"), 0);
  assert.equal(scoreMetric(player, game, "healing"), null);
  assert.equal(scoreMetric(player, game, "netWorth"), null);
  assert.equal(scoreMetric({ ...player, netWorth: 0 }, game, "netWorth"), 0);
  assert.equal(scoreMetric({ ...player, healing: NaN }, game, "healing"), null);
});

test("team shares require complete telemetry and exclude the opposing team", () => {
  const sample = { ...game, players: [{ ...player, heroDamage: 100 }, { ...player, id: "b", heroDamage: 300 }, { ...player, id: "c", team: 1 as const, heroDamage: 1000 }] };
  assert.equal(teamMetricShare(sample.players[0], sample, "heroDamage"), 25);
  assert.equal(teamMetricShare(player, game, "healing"), null);
  assert.equal(teamMetricShare(player, { ...game, players: [player, { ...player, heroDamage: undefined }] }, "heroDamage"), null);
  assert.equal(teamMetricShare(player, { ...game, players: [player] }, "heroDamage"), 0);
  const before = JSON.stringify(sample);
  teamMetricShare(sample.players[0], sample, "heroDamage");
  assert.equal(JSON.stringify(sample), before);
});
