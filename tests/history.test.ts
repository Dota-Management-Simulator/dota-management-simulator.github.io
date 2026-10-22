import { test } from "node:test";
import assert from "node:assert/strict";
import { advanceWeek, buildBattleConfig, createCampaign, data, DEFAULT_SETTINGS, events, readSave, recruitmentBlocker, ROLES, SAVE_KEY, signPlayer } from "../src/game";
import type { Campaign } from "../src/game";
import { historicalArchive, historicalPlayerId, originalTiTeams, sourceFor, activeClubs, getStartingTeams, postTiShuffle } from "../src/history";
import { rosterBatches } from "../src/roster-data";
import identities from "../src/data/player-identities.json";
import { getHeroPool, heroById, heroUnlockYear, heroesArrivingIn } from "../src/heroes";

function assertWorld(c: Campaign) {
  assert.ok(c.world);
  const memberships = c.world.clubs.flatMap((t) => [...t.roster, ...t.bench]);
  assert.equal(new Set(memberships).size, memberships.length, "one club per player");
  assert.equal(new Set(c.players.map((p) => p.id)).size, c.players.length, "one record per person");
  const byId = new Map(c.players.map((p) => [p.id, p]));
  for (const t of c.world.clubs) {
    if (t.active === false) { assert.equal(t.roster.length + t.bench.length, 0); continue; }
    assert.equal(t.roster.length, 5, `${t.name} has a complete lineup`);
    assert.deepEqual(t.roster.map((id) => byId.get(id)?.role), [...ROLES], t.name);
    for (const id of [...t.roster, ...t.bench]) assert.ok(c.players.some((p) => p.id === id));
  }
  assert.deepEqual(c.roster, c.world.clubs.find((t) => t.id === c.world!.managedTeamId)!.roster);
}
function afterTi(current: Campaign) {
  let c = current;
  while (c.week < 17) c = advanceWeek(c);
  return c;
}

test("2011 references contain all sixteen TI1 organizations, preserve sources, and deduplicate aliases", () => {
  assert.equal(originalTiTeams.length, 16);
  const c = createCampaign(DEFAULT_SETTINGS);
  assertWorld(c);
  assert.equal(c.players.length, 100);
  assert.equal(c.players.filter((p) => p.historical?.source === "ti1").length, 88); // 83 listed players/subs + five reserves
  for (const p of c.players) {
    assert.ok(sourceFor(p.historical!.source));
    assert.equal(p.age, null);
    assert.equal(p.firstName, "");
    assert.equal(p.historical?.roleEvidence, "adapted");
  }
  assert.equal(historicalPlayerId("357"), historicalPlayerId("QQQ"));
  assert.equal(historicalPlayerId("Ceb"), historicalPlayerId("7ckngMad"));
  assert.equal(historicalPlayerId("ChuaN"), historicalPlayerId("chuan"));
  for (const ref of [...historicalArchive.opening, ...historicalArchive.postTi]) {
    assert.equal(ref.roster.length, 5);
    assert.ok(sourceFor(ref.source));
    assert.match(ref.date, /^2011-\d\d-\d\d$/);
  }
});

test("every original team and replacement club starts and survives a single post-TI import", () => {
  for (const t of originalTiTeams) for (const clubMode of ["historical", "custom"] as const) {
    const c = createCampaign({ ...DEFAULT_SETTINGS, historicalTeamId: t.id, clubMode, team: "New Club" });
    assertWorld(c);
    assert.equal(c.settings.team, clubMode === "historical" ? t.name : "New Club");
    assert.equal(c.settings.region, t.region);
    if (clubMode === "custom") assert.ok(!c.world?.clubs.some((club) => club.id === t.id));
    const next = afterTi(c);
    assertWorld(next);
    assert.deepEqual(next.world?.appliedShuffles, [2011], `${t.id} / ${clubMode}`);
    assert.equal(next.players.length, 199);
    assert.equal(next.world?.clubs.length, 38);
    assert.deepEqual(next.roster, c.roster, "manager keeps lineup");
    assertWorld(advanceWeek(next));
    assert.equal(advanceWeek(next).players.length, next.players.length);
    assert.ok(next.players.every((p) => p.age === null));
  }
});

test("regional replacements use real players and failed cross-region signings are atomic", () => {
  const c = createCampaign(DEFAULT_SETTINGS);
  const p = c.players.find((p) => p.name === "God")!;
  const next = signPlayer(c, p.id);
  assertWorld(next);
  const replacement = next.world!.clubs.find((t) => t.id === "m5")!.roster[1];
  assert.equal(next.players.find((p) => p.id === replacement)?.region, "Eastern Europe");
  assert.notEqual(replacement, p.id);
  const chinese = c.players.find((p) => p.name === "Ferrari_430")!;
  assert.match(recruitmentBlocker(c, chinese.id)!, /China/);
  assert.equal(signPlayer(c, chinese.id), c);
  assert.equal(c.world!.clubs.find((t) => t.id === "m5")!.roster[1], p.id);
});

test("post-TI arrivals stay gated and recruitment decisions survive historical moves", () => {
  const c = createCampaign(DEFAULT_SETTINGS);
  assert.ok(!c.players.some((p) => p.name === "BuLba"));
  const ars = c.players.find((p) => p.name === "ARS-ART")!;
  const recruited = signPlayer(c, ars.id);
  const next = afterTi(recruited);
  assertWorld(next);
  assert.ok(next.players.some((p) => p.name === "BuLba"));
  assert.ok(next.roster.includes(ars.id));
  assert.deepEqual(next.roster, recruited.roster);
  const disabled = afterTi(createCampaign({ ...DEFAULT_SETTINGS, shuffle: false }));
  assert.equal(disabled.players.length, 199, "newcomers enter even with historical moves disabled");
  assert.equal(disabled.world?.clubs.length, 19);
});

test("annual references cover 2012–2026, complete TI fields and all six regional pools", () => {
  assert.deepEqual(rosterBatches.map((b) => b.year), Array.from({ length: 15 }, (_, i) => 2012 + i));
  const ids = new Map(identities.players.map((p) => [p.id, p]));
  const mainCounts = [16, 16, 16, 16, 16, 18, 18, 18, 0, 18, 20, 20, 16, 16, 16];
  for (const [i, batch] of rosterBatches.entries()) {
    assert.equal(batch.teams.filter((t) => t.group === "main").length, mainCounts[i], `${batch.year} TI field`);
    assert.equal(new Set(batch.teams.map((t) => t.id)).size, batch.teams.length);
    assert.equal(new Set(batch.teams.map((t) => t.region)).size, 6, `${batch.year} regions`);
    for (const team of batch.teams) {
      assert.equal(team.roster.length, 5);
      assert.equal(new Set(team.playerIds).size, 5);
      assert.ok(batch.sources.some((s) => s.id === team.source));
      assert.match(team.date, new RegExp(`^${batch.year}(?:-\\d\\d-\\d\\d)?$`), `${team.name} has a year or precise event date`);
      for (const id of team.playerIds) assert.ok(ids.has(id), id);
    }
  }
  assert.ok(rosterBatches.find((b) => b.year === 2020)!.note.includes("No TI"));
  assert.equal(rosterBatches[0].teams.find((t) => t.name === "Mortal Teamwork")?.id, "mufc");
  assert.equal(rosterBatches.find((b) => b.year === 2020)!.teams.find((t) => t.name === "Team Nigma")?.id,
    rosterBatches.find((b) => b.year === 2022)!.teams.find((t) => t.name === "Nigma Galaxy")?.id);
});

test("later starts use only completed prior shuffles and allow historical or replacement clubs", () => {
  const firstSeen = new Map(identities.players.map((p) => [p.id, p.firstSeenYear]));
  for (let year = 2012; year <= 2027; year++) for (const clubMode of ["historical", "custom"] as const) {
    const team = getStartingTeams(year).at(-1)!; // Regional clubs can be managed too.
    const c = createCampaign({ ...DEFAULT_SETTINGS, year, clubMode, historicalTeamId: team.id, team: "New Club" });
    assertWorld(c);
    assert.equal(c.world?.dataThroughYear, Math.min(2026, year - 1));
    assert.ok(c.players.every((p) => firstSeen.get(p.id)! < year));
    assert.deepEqual(c.roster, team.playerIds ?? team.roster.map(historicalPlayerId));
    assert.equal(c.settings.team, clubMode === "custom" ? "New Club" : team.name);
    if (clubMode === "custom") assert.ok(!c.world?.clubs.some((t) => t.id === team.id));
  }
});

test("all annual shuffles preserve alternate history, gate arrivals and retain unique club ownership", () => {
  let c = signPlayer(createCampaign(DEFAULT_SETTINGS), historicalPlayerId("ARS-ART"));
  const managed = [...c.roster];
  const firstSeen = new Map(identities.players.map((p) => [p.id, p.firstSeenYear]));
  for (let year = 2011; year <= 2026; year++) {
    assert.equal(c.year, year);
    assert.ok(c.players.every((p) => (firstSeen.get(p.id) ?? 2011) < year || year === 2011));
    c = afterTi(c);
    assertWorld(c);
    assert.deepEqual(c.roster, managed);
    assert.equal(c.world?.dataThroughYear, year);
    assert.ok(c.players.every((p) => (firstSeen.get(p.id) ?? 2011) <= year));
    assert.equal(postTiShuffle(c.world!, c.players, year), null, "imports are idempotent");
    assert.ok(activeClubs(c.world!).length >= 16);
    while (c.year === year) c = advanceWeek(c);
  }
  assert.equal(c.players.length, identities.players.length);
  assert.deepEqual(c.world?.appliedShuffles, Array.from({ length: 16 }, (_, i) => 2011 + i));
  assertWorld(c);
});

test("old historical saves catch up missing batches without changing management, finances or results", () => {
  const old = afterTi(createCampaign(DEFAULT_SETTINGS));
  old.year = 2024; old.week = 4;
  delete old.world!.dataThroughYear;
  const saved = JSON.stringify(old);
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: () => saved } });
  try {
    const restored = readSave()!;
    assertWorld(restored);
    assert.equal(restored.world?.dataThroughYear, 2023);
    assert.equal(restored.cash, old.cash);
    assert.equal(restored.week, old.week);
    assert.deepEqual(restored.roster, old.roster);
    assert.deepEqual(restored.results, old.results);
    assert.deepEqual(restored.transactions, old.transactions);
    assert.ok(!restored.players.some((p) => identities.players.find((i) => i.id === p.id)?.firstSeenYear === 2024));
    assert.deepEqual(readSave(), restored);
  } finally { delete (globalThis as { localStorage?: unknown }).localStorage; }
});

test("hero release batches unlock only at annual shuffles and global lookups retain old scoreboards", () => {
  let count = 46;
  for (let year = 2011; year <= 2026; year++) {
    assert.equal(getHeroPool(year).length, count, `${year} opening`);
    count += heroesArrivingIn(year).length;
    const pool = getHeroPool(year, heroUnlockYear(year, 17));
    assert.equal(pool.length, count, `${year} shuffle`);
    assert.equal(new Set(pool.map((h) => h.id)).size, pool.length);
    for (const h of pool) assert.equal(heroById(h.id)?.name, h.name);
  }
  assert.equal(count, 127);
  assert.equal(getHeroPool(2011, 2011).length, 64);
  assert.equal(getHeroPool(2012, 2012).length, 95);
  assert.equal(heroById("oracle")?.releasedYear, 2014);
  assert.equal(heroesArrivingIn(2026).length, 0);
  for (const [year, week] of [[2011, 16], [2011, 17], [2015, 1], [2026, 17]]) {
    const c = createCampaign({ ...DEFAULT_SETTINGS, year });
    c.week = week;
    const config = buildBattleConfig(c, events[0], 7);
    assert.equal(config.heroPoolThroughYear, heroUnlockYear(year, week));
  }
});

test("opponent scoreboards use the actual opposing club after recruitment", () => {
  const c = createCampaign({ ...DEFAULT_SETTINGS, historicalTeamId: "mym" });
  const config = buildBattleConfig(c, events[0], 4);
  const club = c.world!.clubs.find((t) => t.name === config.teams[1])!;
  assert.deepEqual(config.players[1].map((p) => p.id), club.roster);
  assert.deepEqual(config.players[1].map((p) => p.name), club.roster.map((id) => c.players.find((p) => p.id === id)!.name));
});

test("recruiting a regional reserve cannot prevent new players from arriving after TI", () => {
  const c = createCampaign(DEFAULT_SETTINGS);
  const reserve = c.players.find((p) => p.name === "UNiVeRsE")!;
  const recruited = signPlayer(c, reserve.id);
  assert.ok(recruited.roster.includes(reserve.id));
  const next = afterTi(recruited);
  assertWorld(next);
  assert.deepEqual(next.world?.appliedShuffles, [2011]);
  assert.ok(next.players.some((p) => p.name === "BuLba"));
  assert.ok(next.roster.includes(reserve.id));
  assert.ok(next.log.some((message) => message.includes("could not form")));
});

test("custom club names cannot duplicate regional or future-arrival clubs", () => {
  for (const team of ["LGD", "Team DK", "Natural 9"])
    assert.throws(() => createCampaign({ ...DEFAULT_SETTINGS, clubMode: "custom", team }), /already in use/);
});

test("historical saves round-trip and old fictional campaigns remain intact", () => {
  const c = afterTi(createCampaign(DEFAULT_SETTINGS));
  let saved = JSON.stringify(c);
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (key: string) => key === SAVE_KEY ? saved : null } });
  assert.deepEqual(readSave(), JSON.parse(saved));
  const legacy = structuredClone(c);
  delete legacy.world;
  legacy.players = structuredClone(data.players);
  legacy.roster = legacy.players.slice(0, 5).map((p) => p.id);
  legacy.training = Object.fromEntries(legacy.players.map((p) => [p.id, "Balanced"]));
  legacy.settings = { team: "Legacy Club", region: "Europe", year: 2011, difficulty: "Contender", shuffle: true, injuries: false };
  saved = JSON.stringify(legacy);
  const restored = readSave()!;
  assert.equal(restored.players[0].name, data.players[0].name);
  assert.equal(restored.world, undefined);
  assert.equal(advanceWeek(restored).players.length, legacy.players.length);
  delete (globalThis as { localStorage?: unknown }).localStorage;
});
