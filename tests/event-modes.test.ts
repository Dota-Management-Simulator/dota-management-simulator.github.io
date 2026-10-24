import { test } from "node:test";
import assert from "node:assert/strict";
import { createCampaign, DEFAULT_SETTINGS, readSave, SAVE_KEY } from "../src/game";
import type { Campaign } from "../src/game";
import { enableHistoricalCalendar } from "../src/historical-game";
import { syncOffice } from "../src/office";
import { simulateSeries } from "../src/battle";
import type { BattleConfig } from "../src/battle";
import { campaignPatch } from "../src/patches";
import { managedPatchObserver, perceivedPatch } from "../src/patch-knowledge";
import { heroTargetWinRate } from "../src/hero-balance";
import { autoDraftMap, createMapDraft, draftSuggestions, automaticDraftAction, nextDraftStep } from "../src/draft";
import { BOT_TEAM, BOT_WINDOW, botChallengeBlocker, normalizeBotChallenges, prepareBotChallenge, settleBotChallenge } from "../src/bot-challenge";
import { allStarBlocker, allStarEvent, allStarMatch, normalizeAllStars, prepareAllStar, settleAllStar } from "../src/all-star";
import { historicalTournaments } from "../src/tournaments";

const year2019 = () => syncOffice(enableHistoricalCalendar(createCampaign({ ...DEFAULT_SETTINGS, year: 2019 })));
const on = (c: Campaign, day: string): Campaign => ({ ...c, calendar: { ...c.calendar!, now: `${day}T12:00:00Z` } });
const strip = (c: Campaign) => { const { botChallenges: _b, allStars: _a, log: _l, ...rest } = c; return rest; };

test("the bot challenge is open for one year from the real Arena date", () => {
  const c = year2019();
  assert.equal(BOT_WINDOW.from, "2019-04-18");
  assert.equal(BOT_WINDOW.to, "2020-04-17");
  assert.equal(botChallengeBlocker(c), null, c.calendar!.now);
  assert.match(botChallengeBlocker(on(c, "2019-04-17"))!, /opens/);
  assert.equal(botChallengeBlocker(on(c, "2020-04-17")), null);
  assert.match(botChallengeBlocker(on(c, "2020-04-18"))!, /closed/);
  assert.match(botChallengeBlocker(createCampaign({ ...DEFAULT_SETTINGS, year: 2019 }))!, /dated calendar/);
});

test("omniscient bots read the true patch; everyone else reads a range", () => {
  const c = year2019();
  const patch = campaignPatch(c);
  assert.equal(perceivedPatch(patch, { teamKey: "openai-five", staffIds: [], omniscient: true }), patch);
  const guessed = perceivedPatch(patch, managedPatchObserver(c));
  assert.notDeepEqual(guessed.axes, patch.axes);
  const config = prepareBotChallenge(c, 1);
  assert.equal(config.teams[1], BOT_TEAM);
  assert.equal(config.patchObservers![1].omniscient, true);
  assert.ok(!config.patchObservers![0].omniscient);
  assert.equal(config.draftPreparations![1], undefined, "bots never read the challenger's preparation");
});

test("bot drafts take truly stronger heroes than a blind drafter, almost greedily", () => {
  const c = year2019();
  const patch = campaignPatch(c);
  let bot = 0, blind = 0, greedy = 0, steps = 0;
  for (let i = 0; i < 12; i++) {
    const config = prepareBotChallenge({ ...c, botChallenges: { attempts: Array(i).fill(null) as never } }, 1);
    const blindConfig: BattleConfig = { ...config, patchObservers: [config.patchObservers![0], { teamKey: "openai-five", staffIds: [] }] };
    const truth = (ids: string[]) => ids.reduce((n, id) => n + heroTargetWinRate(patch, id), 0) / ids.length;
    bot += truth(autoDraftMap(config).picks[1]);
    blind += truth(autoDraftMap(blindConfig).picks[1]);
    let state = createMapDraft(config);
    while (nextDraftStep(config, state)) {
      const step = nextDraftStep(config, state)!;
      const best = draftSuggestions(config, state)[0].hero.id;
      const next = automaticDraftAction(config, state);
      if (step.side === 1) { steps++; if (next.actions.at(-1)!.heroId === best) greedy++; }
      state = next;
    }
  }
  assert.ok(bot > blind, `bot picks ${bot / 12} vs blind ${blind / 12}`);
  // Near-ties keep some variety between attempts; the top choice still dominates.
  assert.ok(greedy / steps > 0.75, `top suggestion taken ${greedy}/${steps}`);
});

test("a bot challenge records the result and changes nothing else", () => {
  const c = year2019();
  const config = prepareBotChallenge(c, 3);
  const series = simulateSeries(config).summary;
  const after = settleBotChallenge(c, config, series);
  assert.deepEqual(strip(after), strip(c), "no clock, energy, stats, money or research change");
  assert.equal(after.calendar!.now, c.calendar!.now);
  const row = after.botChallenges!.attempts[0];
  assert.equal(row.bestOf, 3);
  assert.equal(row.won, series.winner === 0);
  assert.deepEqual(row.score, series.score);
  assert.equal(!!after.botChallenges!.firstWinAt, row.won);
  assert.throws(() => settleBotChallenge(c, config, { ...series, seed: series.seed + 1 }), /does not match/);
  assert.throws(() => settleBotChallenge(c, { ...config, patchObservers: [config.patchObservers![0], { teamKey: "x", staffIds: [] }] }, series), /does not match/);
  assert.throws(() => settleBotChallenge(on(c, "2020-05-01"), config, series), /does not match/);
});

test("bot history keeps every score but only recent replays", () => {
  let c = year2019();
  const config = prepareBotChallenge(c, 1), series = simulateSeries(config).summary;
  for (let i = 0; i < 7; i++) c = settleBotChallenge(c, config, series);
  assert.equal(c.botChallenges!.attempts.length, 7);
  assert.deepEqual(c.botChallenges!.attempts.map(a => !!a.series), [false, false, true, true, true, true, true]);
});

test("bot and All-Star save data never break a save", () => {
  assert.equal(normalizeBotChallenges(null), undefined);
  assert.deepEqual(normalizeBotChallenges({ attempts: [{ id: "x" }, { id: "ok", at: "2019-05-01T00:00:00Z", patchId: "2019.1", bestOf: 3, score: [2, 1], won: true }, 7] }),
    { attempts: [{ id: "ok", at: "2019-05-01T00:00:00Z", patchId: "2019.1", bestOf: 3, score: [2, 1], won: true }], firstWinAt: "2019-05-01T00:00:00Z" });
  const ti = historicalTournaments.find(e => e.kind === "ti")!.id;
  assert.deepEqual(normalizeAllStars({ [ti]: { at: "2012-09-01T00:00:00Z", teams: ["A", "B"], score: [1, 0], coached: false }, nope: { at: "x" } }),
    { [ti]: { at: "2012-09-01T00:00:00Z", teams: ["A", "B"], score: [1, 0], coached: false } });
  const load = (saved: unknown) => {
    const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (key: string) => key === SAVE_KEY ? JSON.stringify(saved) : null } });
    try { return readSave(); } finally { if (previous) Object.defineProperty(globalThis, "localStorage", previous); else Reflect.deleteProperty(globalThis, "localStorage"); }
  };
  const c = year2019();
  const old = load(c)!;
  assert.ok(old && old.botChallenges === undefined && old.allStars === undefined, "older saves load without the fields");
  const corrupt = load({ ...c, botChallenges: "junk", allStars: [1, 2] })!;
  assert.ok(corrupt, "corrupt exhibition data does not reject the save");
  assert.equal(corrupt.botChallenges, undefined);
  assert.equal(corrupt.allStars, undefined);
});

test("All-Star: two fan-voted fives at a TI, coach if your player is in, else watch", () => {
  const base = year2019();
  const ti = historicalTournaments.find(e => e.kind === "ti" && e.year === 2019)!;
  const c = on(base, ti.end.slice(0, 10));
  assert.equal(allStarEvent(c)?.id, ti.id);
  assert.equal(allStarEvent(on(base, "2019-12-31")), undefined);
  assert.equal(allStarEvent(on(base, "2023-09-01")), undefined, "TI 2023 had no All-Star match");
  const match = allStarMatch(c)!;
  assert.ok(match);
  const ids = match.teams.flatMap(t => t.players);
  assert.equal(new Set(ids).size, 10);
  assert.deepEqual(allStarMatch(c), match, "reloads never reroll the vote");
  const spectator = c.roster.some(id => ids.includes(id)) ? { ...c, roster: c.roster.map(id => ids.includes(id) ? "none" : id) } : c;
  // Put one of your players in the vote by signing a voted-in player in their slot.
  const voted = match.teams[1].players[0];
  const coachedCampaign = { ...c, roster: [voted, ...c.roster.filter(id => id !== voted).slice(1)] };
  const coached = allStarMatch(coachedCampaign)!;
  assert.equal(coached.managedSide, 0);
  assert.ok(coached.teams[0].players.includes(voted), "your player's team is the one you coach");
  if (!spectator.roster.includes("none")) {
    assert.equal(allStarMatch(spectator)!.managedSide, null);
    const { config } = prepareAllStar(spectator);
    assert.equal(config.draftPreparations![0], undefined, "spectators don't draft");
  }
  const { config } = prepareAllStar(coachedCampaign);
  assert.ok(config.draftPreparations![0], "the coach drafts side 0");
  const series = simulateSeries(config).summary;
  const after = settleAllStar(coachedCampaign, config, series);
  assert.deepEqual(strip(after), strip(coachedCampaign), "an exhibition changes nothing else");
  assert.equal(after.allStars![ti.id].coached, true);
  assert.match(allStarBlocker(after)!, /has been played/);
  assert.throws(() => settleAllStar(after, config, series));
});
