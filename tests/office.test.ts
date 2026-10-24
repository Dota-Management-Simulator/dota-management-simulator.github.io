import { test } from "node:test";
import assert from "node:assert/strict";
import { createCampaign, DEFAULT_SETTINGS, advanceCalendarTo } from "../src/game";
import { enableHistoricalCalendar } from "../src/historical-game";
import { campaignWeek } from "../src/contracts";
import { calendarDay, calendarMonth, CALENDAR_DAY, tournamentDays } from "../src/calendar-layout";
import { advanceManagerWeek, declineTournament, markInboxRead, reserveTournament, syncOffice, unreadMessages, updateMessage } from "../src/office";
import { historicalTournaments } from "../src/tournaments";
import type { HistoricalTournament } from "../src/tournament-types";
import { managedSponsorTeam, sponsors } from "../src/sponsors";

// Existing office scenarios begin on tournament day, independently of new-game preparation time.
const newCampaign = () => {
  const c = enableHistoricalCalendar(createCampaign(DEFAULT_SETTINGS));
  c.calendar!.now = c.calendar!.origin = "2011-08-17T00:00:00Z";
  c.week = 33;
  return c;
};
const ti1 = historicalTournaments.find(e => e.kind === "ti" && e.year === 2011)!;
const sample = (id: string, start: string, end: string) => ({ ...ti1, id, start, end });

test("month bars cover every inclusive event date across weeks, leap days, and year boundaries", () => {
  const events = [sample("a", "2011-12-29", "2012-01-05"), sample("b", "2012-01-02", "2012-01-03"), sample("c", "2012-01-03", "2012-01-07")];
  const weeks = calendarMonth(2012, 0, events);
  assert.equal(new Date(weeks[0].start).getUTCDay(), 1);
  for (const event of events) {
    const covered = weeks.flatMap(w => w.segments.filter(s => s.event.id === event.id).flatMap(s => Array.from({ length: s.span }, (_, i) => w.start + (s.column - 1 + i) * CALENDAR_DAY)));
    assert.equal(covered.length, tournamentDays(event));
    assert.equal(new Set(covered).size, covered.length);
    assert.equal(Math.min(...covered), calendarDay(event.start));
    assert.equal(Math.max(...covered), calendarDay(event.end));
  }
  for (const week of weeks) for (const a of week.segments) for (const b of week.segments) {
    if (a === b || a.lane !== b.lane) continue;
    assert.ok(a.column + a.span <= b.column || b.column + b.span <= a.column, "overlapping events need separate lanes");
  }
  assert.equal(tournamentDays(sample("leap", "2012-02-28", "2012-03-01")), 3);
  assert.equal(calendarMonth(2020, 7, []).length, 6);
});

test("inbox migration is immutable and idempotent; invitations, read and archive state survive a round trip", () => {
  const original = newCampaign();
  const before = JSON.stringify(original);
  let c = syncOffice(original);
  assert.equal(JSON.stringify(original), before);
  const invite = c.office!.messages.find(m => m.id === `invitation:${ti1.id}`)!;
  assert.ok(invite);
  assert.ok(c.calendar!.invitations[ti1.id].includes(c.world!.managedTeamId));
  assert.equal(syncOffice(c), c);
  c = updateMessage(c, invite.id, { read: true, archived: true });
  c = syncOffice(JSON.parse(JSON.stringify(c)));
  assert.equal(c.office!.messages.filter(m => m.id === invite.id).length, 1);
  assert.ok(c.office!.messages.find(m => m.id === invite.id)!.archived);
  c = markInboxRead(c);
  assert.equal(unreadMessages(c), 0);
  assert.equal(c.cash, original.cash);
  assert.equal(c.calendar!.now, original.calendar!.now);
});

test("reserving a tournament claims entry without advancing dates or charging payroll; duplicate claims are rejected", () => {
  const c = syncOffice(newCampaign());
  const reserved = reserveTournament(c, ti1.id);
  assert.equal(reserved.calendar!.now, c.calendar!.now);
  assert.equal(reserved.cash, c.cash);
  assert.equal(reserved.calendar!.runs.length, 0);
  assert.equal(reserved.office!.registrations[ti1.id].status, "reserved");
  assert.ok(reserved.office!.messages.find(m => m.id === `registration:${ti1.id}`));
  assert.throws(() => reserveTournament(reserved, ti1.id), /already reserved/);
  const declined = declineTournament(reserved, ti1.id);
  assert.equal(declined.office!.registrations[ti1.id].status, "declined");
  assert.equal(reserveTournament(declined, ti1.id).office!.registrations[ti1.id].status, "reserved");
});

test("weekly advancement stops at an unanswered invitation; explicit decline permits moving on", () => {
  const c = syncOffice(newCampaign());
  assert.equal(advanceManagerWeek(c).calendar!.now, c.calendar!.now);
  const declined = declineTournament(c, ti1.id);
  assert.ok(Date.parse(advanceManagerWeek(declined).calendar!.now) > Date.parse(c.calendar!.now));
});

test("contracts and removed sponsor deals generate one reminder and expiry notice, across skipped weeks", () => {
  let c = newCampaign();
  const id = c.roster[0];
  const week = campaignWeek(c);
  c.contracts = { [id]: { wage: 500, bonus: 0, weeks: 6, prizeShare: 0, practiceHours: 30, restDays: 2, signedAt: week - 5, expiresAt: week + 1, marketWage: 500 } };
  const sponsor = sponsors.find(s => s.from <= 2011)!;
  c.sponsorships = { deals: [{ sponsorId: sponsor.id, teamId: managedSponsorTeam(c), teamName: c.settings.team, signedAt: week - 5, expiresAt: week + 1, weekly: 1000, bonus: 0, weeks: 6, mediaHours: 1 }], releasedAt: {} };
  c = syncOffice(c);
  assert.equal(c.office!.messages.filter(m => m.category === "contracts").length, 1);
  assert.ok(c.office!.messages.some(m => m.subject === `${sponsor.name}: partnership ending soon`));
  c = advanceCalendarTo(c, "2011-09-02T00:00:00Z");
  assert.ok(!c.sponsorships!.deals.some(d => d.teamId === managedSponsorTeam(c)));
  c = syncOffice(c);
  assert.equal(c.office!.messages.filter(m => m.category === "contracts").length, 2);
  assert.equal(c.office!.messages.filter(m => m.subject === `${sponsor.name}: agreement ended`).length, 1);
  assert.equal(syncOffice(c), c);
});

test("missing office data preserves a legacy campaign's clock, roster, cash and results", () => {
  const c = createCampaign(DEFAULT_SETTINGS);
  const next = syncOffice(c);
  assert.equal(next.calendar, undefined);
  assert.deepEqual(next.roster, c.roster);
  assert.equal(next.week, c.week);
  assert.equal(next.cash, c.cash);
  assert.deepEqual(next.results, c.results);
});

test("future invitations do not arrive years early, and invalid event claims never mutate the save", () => {
  const c = syncOffice(newCampaign());
  for (const message of c.office!.messages.filter(m => m.id.startsWith("invitation:"))) {
    const event = historicalTournaments.find(e => e.id === message.id.slice("invitation:".length)) as HistoricalTournament;
    assert.ok(calendarDay(event.start) <= Date.parse(c.calendar!.now) + 28 * CALENDAR_DAY);
  }
  const before = JSON.stringify(c);
  assert.throws(() => reserveTournament(c, "not-an-event"), /Unknown/);
  assert.equal(JSON.stringify(c), before);
});

test("weekly advances stop on a future reserved opening instead of paying a seventh day or missing entry", () => {
  const event = { ...sample("office-future-opening", "2011-08-23", "2011-08-27"), invited: ["navi"] };
  historicalTournaments.push(event);
  try {
    let c = declineTournament(syncOffice(newCampaign()), ti1.id);
    c.calendar!.invitations[event.id] = [c.world!.managedTeamId];
    c = reserveTournament(c, event.id);
    const next = advanceManagerWeek(c);
    assert.equal(next.calendar!.now.slice(0, 10), "2011-08-23");
    assert.equal(next.cash, c.cash, "six elapsed days must not charge weekly payroll");
    assert.equal(advanceManagerWeek(next).calendar!.now, next.calendar!.now);
    const late = syncOffice(advanceCalendarTo(next, "2011-08-26T00:00:00Z"));
    assert.ok(late.office!.messages.some(m => m.id === `registration:${event.id}:missed`));
    assert.throws(() => reserveTournament(late, event.id));
  } finally { historicalTournaments.splice(historicalTournaments.indexOf(event), 1); }
});

test("reservations enforce eligibility and region; a calendar click cannot manufacture a main-event spot", () => {
  const closed = { ...sample("office-no-invite", "2011-08-23", "2011-08-27"), kind: "event" as const, invited: [] };
  const regional = { ...sample("office-wrong-region", "2011-08-23", "2011-08-27"), kind: "qualifier" as const, invited: [], region: "China" };
  historicalTournaments.push(closed, regional);
  try {
    const c = syncOffice(newCampaign());
    assert.throws(() => reserveTournament(c, closed.id), /invitation or a qualifying place/i);
    assert.throws(() => reserveTournament(c, regional.id), /China/);
    assert.equal(c.calendar!.runs.length, 0);
    assert.equal(c.office!.registrations[closed.id], undefined);
  } finally { for (const event of [closed, regional]) historicalTournaments.splice(historicalTournaments.indexOf(event), 1); }
});

test("contract notices refresh their countdown, expire when superseded or renewed, and retain unresolved renewals", () => {
  let c = newCampaign();
  const id = c.roster[0];
  const week = campaignWeek(c);
  c.contracts = { [id]: { wage: 500, bonus: 0, weeks: 6, prizeShare: 0, practiceHours: 30, restDays: 2, signedAt: week - 4, expiresAt: week + 2, marketWage: 500 } };
  c = syncOffice(c);
  const reminderId = `contract:${id}:${week - 4}:${week + 2}:due`;
  assert.match(c.office!.messages.find(m => m.id === reminderId)!.subject, /2 weeks/);
  c = syncOffice(advanceCalendarTo(c, "2011-08-24T00:00:00Z"));
  assert.match(c.office!.messages.find(m => m.id === reminderId)!.subject, /1 week$/);
  c = syncOffice(advanceCalendarTo(c, "2011-08-31T00:00:00Z"));
  assert.ok(c.office!.messages.find(m => m.id === reminderId)!.expired);
  const renewalId = reminderId.replace(/due$/, "expired");
  assert.equal(c.office!.messages.find(m => m.id === renewalId)!.expired, undefined);
  c = syncOffice(advanceCalendarTo(c, "2011-10-10T00:00:00Z"));
  assert.equal(c.office!.messages.find(m => m.id === renewalId)!.expired, undefined, "an unresolved renewal must stay actionable");
  c.contracts![id] = { ...c.contracts![id], signedAt: campaignWeek(c), expiresAt: campaignWeek(c) + 18 };
  c = syncOffice(c);
  assert.match(c.office!.messages.find(m => m.id === renewalId)!.expired!.reason, /renewed or replaced/);
  assert.equal(syncOffice(c), c);
});

test("sponsor leads expire when a rival signs or reputation requirements fail, and cannot reappear as unread", () => {
  const initial = syncOffice(newCampaign());
  const lead = initial.office!.messages.find(m => m.id.startsWith("sponsor-opportunity:"))!;
  const sponsor = sponsors.find(s => lead.id === `sponsor-opportunity:${s.id}:${initial.year}`)!;
  let rival = structuredClone(initial);
  rival.sponsorships!.deals.push({ sponsorId: sponsor.id, teamId: "rival", teamName: "Rival club", signedAt: campaignWeek(rival), expiresAt: campaignWeek(rival) + 6, weekly: 1000, bonus: 0, weeks: 6, mediaHours: 0 });
  rival = syncOffice(rival);
  const expired = rival.office!.messages.find(m => m.id === lead.id)!;
  assert.match(expired.expired!.reason, /Exclusive to Rival club/);
  assert.equal(expired.read, undefined, "expiry preserves the user's read state");
  const unread = unreadMessages(rival);
  rival = updateMessage(rival, lead.id, { read: false, archived: false });
  assert.equal(unreadMessages(rival), unread, "expired history cannot inflate the unread badge");
  rival.sponsorships!.deals = rival.sponsorships!.deals.filter(d => d.teamId !== "rival");
  rival = syncOffice(JSON.parse(JSON.stringify(rival)));
  assert.ok(rival.office!.messages.find(m => m.id === lead.id)!.expired);
  const demanding = initial.office!.messages.find(m => sponsors.some(s => s.requirement > 0 && m.id === `sponsor-opportunity:${s.id}:${initial.year}`))!;
  assert.ok(demanding);
  const reputationLoss = syncOffice({ ...initial, reputation: 0 });
  assert.match(reputationLoss.office!.messages.find(m => m.id === demanding.id)!.expired!.reason, /reputation required/);
});

test("accepted, withdrawn and overdue tournament notices expire; invalid invitations no longer stop time", () => {
  const c = syncOffice(newCampaign());
  const invitationId = `invitation:${ti1.id}`;
  let reserved = reserveTournament(c, ti1.id);
  assert.match(reserved.office!.messages.find(m => m.id === invitationId)!.expired!.reason, /accepted/);
  assert.equal(reserved.office!.messages.find(m => m.id === `registration:${ti1.id}`)!.expired, undefined);
  reserved = syncOffice(declineTournament(reserved, ti1.id));
  assert.ok(reserved.office!.messages.filter(m => m.id.startsWith(`registration:${ti1.id}`)).every(m => m.expired));
  const late = syncOffice(advanceCalendarTo(c, "2011-08-20T00:00:00Z"));
  assert.match(late.office!.messages.find(m => m.id === invitationId)!.expired!.reason, /window has closed/);
  const withdrawn = structuredClone(c);
  withdrawn.calendar!.invitations[ti1.id] = [];
  const invalid = syncOffice(withdrawn);
  assert.match(invalid.office!.messages.find(m => m.id === invitationId)!.expired!.reason, /no longer holds an invitation/);
  assert.ok(Date.parse(advanceManagerWeek(invalid).calendar!.now) > Date.parse(invalid.calendar!.now));
});

test("resolved cash warnings and old informational updates leave the live inbox; old saves migrate without losing read/archive state", () => {
  let c = syncOffice({ ...newCampaign(), cash: 1 });
  const warning = c.office!.messages.find(m => m.id.startsWith("cash-warning:"))!;
  c = updateMessage(c, warning.id, { read: true, archived: true });
  for (const message of c.office!.messages) delete message.createdWeek;
  c.cash = 1000000;
  c = syncOffice(c);
  const expiredWarning = c.office!.messages.find(m => m.id === warning.id)!;
  assert.ok(expiredWarning.read && expiredWarning.archived && expiredWarning.expired);
  c = syncOffice(advanceCalendarTo(c, "2011-09-15T00:00:00Z"));
  assert.ok(c.office!.messages.find(m => m.id === "office-welcome")!.expired);
  assert.ok(c.office!.messages.filter(m => m.id.startsWith("sponsor-opportunity:")).every(m => m.expired));
  assert.equal(syncOffice(JSON.parse(JSON.stringify(c))).office!.messages.length, c.office!.messages.length);
  assert.equal(syncOffice(c), c);
});
