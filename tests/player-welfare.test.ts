import { test } from "node:test";
import assert from "node:assert/strict";
import { askingWage } from "../src/player-market";
import { advanceCalendarTo, advanceWeek, buildBattleConfig, createCampaign, DEFAULT_SETTINGS, events, negotiateContract, readSave, recruitmentBlocker, releasePlayer, releasePlayerBlocker, ROLES, SAVE_KEY, settlePlayerDepartures, signPlayer, weeklyWages } from "../src/game";
import type { Campaign } from "../src/game";
import type { SeriesSummary } from "../src/battle";
import { campaignWeek, initialOffer, releaseCost } from "../src/contracts";
import { enableHistoricalCalendar, enterHistoricalTournament, tournamentEntryBlocker } from "../src/historical-game";
import { historicalTournaments } from "../src/tournaments";
import { fullRosterBlocker, normalizeWelfare, playerTalkBlocker, reviewPlayerWelfare, rosterMovement, talkToPlayer, welfareAssessment, welfarePreferences, welfareRecord, welfareStatus, welfareWorkload, competitiveForm } from "../src/player-welfare";
import { syncOffice, unreadMessages } from "../src/office";
import { scrimSlotBlocker } from "../src/scrims";
import { botChallengeBlocker } from "../src/bot-challenge";
import type { Scrim } from "../src/scrim-state";

const WEEK = 604800000;
function content(dated = false) {
  const c = dated ? enableHistoricalCalendar(createCampaign(DEFAULT_SETTINGS)) : createCampaign(DEFAULT_SETTINGS);
  c.cash = 1000000;
  for (const id of c.roster) c.training[id] = "Rest";
  return c;
}
function overloaded() {
  const c = content(true), id = c.roster[0];
  c.training[id] = "Laning";
  c.trainingSchedules = { [id]: { hoursPerDay: 12, daysPerWeek: 7, intensity: "Intense" } };
  return { c, id };
}
function load(c: Campaign) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (key: string) => key === SAVE_KEY ? JSON.stringify(c) : null } });
  try { return readSave(); } finally { if (descriptor) Object.defineProperty(globalThis, "localStorage", descriptor); else Reflect.deleteProperty(globalThis, "localStorage"); }
}

test("preferences are stable, varied, and historically bounded without future knowledge", () => {
  const c = createCampaign({ ...DEFAULT_SETTINGS, year: 2026 });
  const preferences = c.players.map(p => welfarePreferences(c, p));
  assert.ok(preferences.some(p => p.demanding));
  assert.ok(preferences.some(p => !p.demanding));
  assert.equal(new Set(preferences.map(p => p.practice)).size, 3);
  assert.ok(preferences.some(p => p.movement.changes >= 3));
  assert.deepEqual(welfarePreferences(c, c.players[0]), welfarePreferences(structuredClone(c), c.players[0]));
  const first = createCampaign(DEFAULT_SETTINGS);
  assert.equal(rosterMovement(first, first.players[0]).observations, 0);
  const liquid = c.players.find(p => p.name.toLowerCase() === "insania")!;
  assert.equal(rosterMovement({ ...c, year: 2021 }, liquid).changes, rosterMovement({ ...c, year: 2020 }, liquid).changes, "Alliance to Liquid's intact core is not individual churn");
});

test("win-rate demands use exact participants, actual competitive maps and a six-map minimum", () => {
  const c = content(), id = c.roster[0], p = c.players.find(p => p.id === id)!;
  const game = { winner: 1, duration: 1800, players: [{ id, team: 1 }] };
  const series = { games: Array(5).fill(game), teams: ["Opposition", c.settings.team] } as unknown as SeriesSummary;
  c.results.push({ year: c.year, week: c.week, event: "Fixture", eventId: "fixture", won: false, prize: 0, points: 0, opponent: "Fixture", score: "0–2", series });
  assert.equal(competitiveForm(c, id).winRate, 100, "side 1 is recognized");
  assert.ok(!welfareAssessment(c, p).concerns.some(v => v.text.startsWith("Wants ") && v.text.includes("competitive")));
  series.games = Array(8).fill({ ...game, winner: 0 });
  assert.equal(competitiveForm(c, id).winRate, 0);
  assert.ok(welfareAssessment(c, p).concerns.some(v => v.text.includes("competitive wins")));
  assert.equal(competitiveForm(c, c.roster[1]).played, 0, "unknown lineups never inherit team wins");
  assert.equal(c.results[0].won, false);
});

test("workload counts attended completed scrims once inside the weekly interval, plus media", () => {
  const c = content(true), id = c.roster[0], p = c.players.find(p => p.id === id)!;
  c.training[id] = "Balanced";
  const end = Date.parse(c.calendar!.now) + WEEK;
  const review = { players: [{ id, name: p.name, confidence: 0, training: 0, energy: 0 }], heroes: [] };
  const session = { id: "s", opponentId: "x", opponent: "Fixture", at: new Date(end - 86400000).toISOString(), bestOf: 2, focus: "balanced", source: "manager", status: "complete", seed: 1, review } as Scrim;
  c.scrims = { research: {}, sessions: [session, { ...session, id: "cancelled", status: "cancelled" }, { ...session, id: "old", at: new Date(end - WEEK - 1).toISOString() }, { ...session, id: "other", review: { players: [], heroes: [] } }] };
  const workload = welfareWorkload(c, p, end);
  assert.equal(workload.trainingHours, 20);
  assert.equal(workload.scrimHours, 3.5);
  assert.equal(workload.totalHours, 23.5);
  c.training[id] = "Rest";
  assert.equal(welfareWorkload(c, p, end).trainingHours, 0);
  assert.equal(welfareWorkload(c, p, end).restDays, 6);
  assert.equal(welfareWorkload(c, p, end + WEEK).scrimHours, 0);
});

test("repeated unmet expectations warn, give notice, and quit without a release payout", () => {
  const { c: start, id } = overloaded();
  let c = start, sawNotice = false, noticeWeek = 0;
  for (let i = 0; i < 14 && c.roster.includes(id); i++) {
    const before = c;
    c = advanceWeek(c);
    assert.ok(before.roster.includes(id));
    if (welfareRecord(c, id).noticeAt !== undefined) { sawNotice = true; noticeWeek ||= welfareRecord(c, id).noticeAt!; }
  }
  assert.ok(sawNotice);
  assert.ok(!c.roster.includes(id));
  const departure = c.welfare!.departures.at(-1)!;
  assert.equal(departure.kind, "quit");
  assert.ok(departure.week >= noticeWeek + 2);
  assert.equal(departure.severance, 0);
  assert.equal(c.world!.clubs.find(t => t.id === c.world!.managedTeamId)!.roster.includes(id), false);
  assert.match(fullRosterBlocker(c)!, /Carry/);
  assert.match(recruitmentBlocker(c, id)!, /four weeks/);
  assert.ok(c.players.some(p => p.id === id), "departed player stays in the market database");
  assert.equal(start.roster.length, 5);
});

test("fixing the schedule can withdraw notice; meetings have a cooldown and cannot clear it alone", () => {
  const { c, id } = overloaded(), record = c.welfare!.players[id];
  record.satisfaction = 15; record.unhappyWeeks = 5; record.noticeAt = campaignWeek(c); record.joinedAt -= 5;
  const met = talkToPlayer(c, id);
  assert.equal(welfareRecord(met, id).noticeAt, record.noticeAt);
  assert.equal(welfareRecord(met, id).satisfaction, 23);
  assert.ok(playerTalkBlocker(met, id));
  assert.equal(talkToPlayer(met, id), met);
  met.training[id] = "Rest";
  met.players.find(p => p.id === id)!.happiness = 85;
  met.players.find(p => p.id === id)!.energy = 85;
  const recovered = advanceWeek(met);
  assert.ok(recovered.roster.includes(id));
  assert.equal(welfareRecord(recovered, id).noticeAt, undefined);
  assert.notEqual(welfareStatus(recovered, id), "Wants to leave");
});

test("clashing teammates build tension under strain and mediation helps both players", () => {
  const c = content(true);
  const id = c.roster.find(id => welfareAssessment(c, c.players.find(p => p.id === id)!).relations.some(r => r.clash))!;
  c.training[id] = "Laning";
  c.trainingSchedules = { [id]: { hoursPerDay: 12, daysPerWeek: 7, intensity: "Intense" } };
  const player = c.players.find(p => p.id === id)!;
  const other = welfareAssessment(c, player).relations.find(r => r.clash);
  assert.ok(other, "fixture has a clashing teammate");
  c.welfare!.players[id].joinedAt -= 5;
  const before = structuredClone(c);
  for (let i = 1; i <= 4; i++) reviewPlayerWelfare(c, campaignWeek(c) + i);
  assert.ok(welfareRecord(c, id).conflicts[other.id] >= 45);
  assert.ok(welfareAssessment(c, player).concerns.some(issue => issue.text.includes(other.name)));
  c.welfare!.players[other.id].conflicts[id] = 60;
  const met = talkToPlayer(c, id);
  assert.ok(welfareRecord(met, id).conflicts[other.id] < welfareRecord(c, id).conflicts[other.id]);
  assert.equal(welfareRecord(met, other.id).conflicts[id], 35);
  assert.deepEqual(before.welfare!.players[id].conflicts, {});
});

test("weekly reviews and resignations are identical for split dated advances and a single jump", () => {
  const { c, id } = overloaded();
  const origin = Date.parse(c.calendar!.origin);
  const jumped = advanceCalendarTo(c, new Date(origin + 12 * WEEK).toISOString());
  let stepped = c;
  for (let i = 1; i <= 24; i++) stepped = advanceCalendarTo(stepped, new Date(origin + i * WEEK / 2).toISOString());
  assert.deepEqual(stepped.welfare, jumped.welfare);
  assert.deepEqual(stepped.roster, jumped.roster);
  assert.equal(stepped.cash, jumped.cash);
  assert.deepEqual(stepped.players, jumped.players);
  assert.ok(!jumped.roster.includes(id));
});

test("tournament commitments defer quitting and block kicks; due departures settle when the run ends", () => {
  let c = content(true);
  const ti = historicalTournaments.find(e => e.year === 2011 && e.kind === "ti")!;
  c = enterHistoricalTournament(c, ti.id, 1);
  const id = c.roster[0], record = c.welfare!.players[id];
  record.satisfaction = 10; record.unhappyWeeks = 8; record.noticeAt = campaignWeek(c) - 3;
  assert.match(releasePlayerBlocker(c, id)!, /tournament/);
  assert.equal(releasePlayer(c, id), c);
  assert.equal(settlePlayerDepartures(c), c);
  c.calendar!.runs[0].state = "complete";
  const next = settlePlayerDepartures(c);
  assert.ok(!next.roster.includes(id));
  assert.equal(settlePlayerDepartures(next), next);
});

test("kicking pays severance once, removes wages and ownership, persists a vacancy and supports contracted recruitment", () => {
  let c = content(), id = c.roster[1], player = c.players.find(p => p.id === id)!;
  const signed = negotiateContract(c, id, { ...initialOffer(c, player), wage: player.wage * 2, weeks: 6 });
  assert.equal(signed.status, "accepted"); c = signed.campaign;
  const cost = releaseCost(c, id), wages = weeklyWages(c);
  assert.equal(releasePlayer({ ...c, cash: cost - 1 }, id).roster.length, 5);
  const kicked = releasePlayer(c, id);
  assert.equal(kicked.cash, c.cash - cost);
  assert.equal(weeklyWages(kicked), wages - player.wage * 2);
  assert.equal(kicked.contracts?.[id], undefined);
  assert.equal(releasePlayer(kicked, id), kicked);
  assert.deepEqual(load(kicked), JSON.parse(JSON.stringify(kicked)));
  const candidate = kicked.players.find(p => p.name === "God")!;
  assert.equal(recruitmentBlocker(kicked, candidate.id), null);
  const result = negotiateContract(kicked, candidate.id, { ...initialOffer(kicked, candidate), wage: askingWage(kicked, candidate) * 2 });
  assert.equal(result.status, "accepted");
  const next = result.campaign;
  assert.equal(fullRosterBlocker(next), null);
  assert.deepEqual(next.roster.map(id => next.players.find(p => p.id === id)!.role), ROLES);
  assert.deepEqual(next.world!.clubs.find(t => t.id === next.world!.managedTeamId)!.roster, next.roster);
  const memberships = next.world!.clubs.flatMap(t => [...t.roster, ...t.bench]);
  assert.equal(memberships.length, new Set(memberships).size);
  assert.equal(next.world!.clubs.find(t => t.id === "m5")!.roster.length, 5);
  assert.equal(welfareRecord(next, candidate.id).satisfaction, 75);
});

test("empty and legacy fictional rosters remain reloadable and recruitable while match entry is blocked", () => {
  let c = content(); delete c.world;
  const originals = [...c.roster];
  for (const id of originals) c = releasePlayer(c, id);
  assert.equal(c.roster.length, 0);
  assert.deepEqual(load(c), JSON.parse(JSON.stringify(c)));
  assert.throws(() => buildBattleConfig(c, events[0]), /full starting five/);
  assert.match(botChallengeBlocker(c)!, /full starting five/);
  assert.match(scrimSlotBlocker(c, "x", "2011-08-01", 1)!, /full starting five/);
  assert.match(tournamentEntryBlocker(c, historicalTournaments[0])!, /full starting five/);
  for (const id of originals) c = signPlayer(c, id);
  assert.equal(fullRosterBlocker(c), null);
});

test("a rolling player can be kicked without cash to reduce a club's debt obligations", () => {
  const c = content(); c.cash = -100;
  const id = c.roster[0];
  assert.equal(releasePlayerBlocker(c, id), null);
  const next = releasePlayer(c, id);
  assert.equal(next.cash, -100);
  assert.equal(next.roster.length, 4);
  assert.ok(weeklyWages(next) < weeklyWages(c));
});

test("legacy saves acquire a grace period and malformed optional welfare cannot invalidate a campaign", () => {
  const c = content(); delete c.welfare;
  const next = load(c)!;
  assert.ok(next);
  assert.equal(next.cash, c.cash);
  assert.deepEqual(next.roster, c.roster);
  assert.equal(welfareRecord(next, next.roster[0]).joinedAt, campaignWeek(c));
  assert.equal(normalizeWelfare("bad"), undefined);
  assert.deepEqual(normalizeWelfare({ players: { x: { satisfaction: null } }, departures: [null] }), { players: {}, departures: [] });
});

test("a prepared scrim locks recruitment as well as kicks until it is completed or cancelled", () => {
  const c = content(true), id = c.roster[1];
  const config = buildBattleConfig(c, events[0]);
  c.scrims = { research: {}, sessions: [{ id: "prepared", opponentId: "x", opponent: "Fixture", at: c.calendar!.now, bestOf: 1, focus: "balanced", source: "manager", status: "scheduled", seed: 1, config }] };
  const recruit = c.players.find(p => p.name === "God")!;
  assert.match(releasePlayerBlocker(c, id)!, /prepared scrim/);
  assert.match(recruitmentBlocker(c, recruit.id)!, /prepared scrim/);
  assert.equal(signPlayer(c, recruit.id), c);
  c.scrims.sessions[0].status = "cancelled";
  assert.equal(recruitmentBlocker(c, recruit.id), null);
});

test("inbox concerns, notice, withdrawal and departure messages are deduplicated and retire obsolete actions", () => {
  const c = content(), id = c.roster[0], record = c.welfare!.players[id];
  record.unhappyWeeks = 3; record.satisfaction = 40; record.concerns = ["Needs more free time."];
  let next = syncOffice(c);
  const concern = next.office!.messages.find(m => m.id.startsWith("welfare:"))!;
  assert.ok(concern && !concern.expired);
  assert.deepEqual(syncOffice(next), next);
  const resolved = structuredClone(next);
  resolved.welfare!.players[id].unhappyWeeks = 0;
  let freshConcern = syncOffice(resolved);
  freshConcern.welfare!.players[id].unhappyWeeks = 2;
  freshConcern.welfare!.players[id].concernAt = campaignWeek(c) + 5;
  freshConcern = syncOffice(freshConcern);
  assert.equal(freshConcern.office!.messages.filter(m => m.id.startsWith("welfare:") && !m.expired).length, 1, "a later episode gets a new actionable warning");
  next.welfare!.players[id].noticeAt = campaignWeek(c);
  next = syncOffice(next);
  assert.ok(next.office!.messages.find(m => m.id === concern.id)!.expired);
  const notice = next.office!.messages.find(m => m.id.includes(":notice:"))!;
  assert.ok(notice && !notice.expired);
  next = syncOffice(releasePlayer(next, id));
  assert.ok(next.office!.messages.find(m => m.id === notice.id)!.expired);
  assert.equal(next.office!.messages.filter(m => m.id.startsWith("departure:")).length, 1);
  assert.deepEqual(syncOffice(next), next);
  assert.ok(unreadMessages(next) > 0);
});
