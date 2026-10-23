import type { Campaign, Page } from "./game";
import { advanceCalendarTo, advanceWeek, money, weeklyIncome, weeklyWages } from "./game";
import { campaignWeek } from "./contracts";
import { earnedInvitations, qualifiedForTournament, tournamentEntryBlocker } from "./historical-game";
import { managedSponsorTeam, sponsorBlocker, sponsorMarket, sponsors } from "./sponsors";
import { historicalTournaments, nextTournamentFixture, tournamentById, utcTime } from "./tournaments";
import type { HistoricalTournament } from "./tournament-types";
import { CALENDAR_DAY, calendarDay } from "./calendar-layout";
import { announcedPatches, patchAnnouncement } from "./patch-announcements";
import { campaignPatch } from "./patches";

export type OfficeAction = { kind: "tournament"; eventId: string } | { kind: "player"; playerId: string } | { kind: "page"; page: Page } | { kind: "patch"; patchId: string };
export interface OfficeMessage {
  id: string; at: string; sender: string; subject: string; body: string;
  category: "tournaments" | "contracts" | "sponsors" | "club" | "patches";
  action?: OfficeAction; actionLabel?: string; read?: boolean; archived?: boolean;
  createdWeek?: number;
  expired?: { at: string; reason: string };
}
interface TermSnapshot { id: string; name: string; expiresAt: number; signedAt: number; weekly: number }
export interface OfficeState {
  messages: OfficeMessage[];
  seen: string[];
  registrations: Record<string, { status: "reserved" | "declined"; at: string }>;
  sponsorTerms: TermSnapshot[];
  lastPatchId?: string;
}
const emptyOffice = (): OfficeState => ({ messages: [], seen: [], registrations: {}, sponsorTerms: [] });
export const officeNow = (c: Campaign) => c.calendar?.now ?? `${c.year} · Week ${c.week}`;
export const unreadMessages = (c: Campaign) => (c.office?.messages ?? []).filter(m => !m.read && !m.archived && !m.expired).length;
export const managedReference = (c: Campaign) => c.world?.replacedTeamId ?? c.world?.managedTeamId ?? "managed";
export function qualifiedFor(c: Campaign, event: HistoricalTournament) {
  return qualifiedForTournament(c, event);
}
/** Reserving entry plans the diary; starting a tournament still uses the engine's full checks. */
export function reservationBlocker(c: Campaign, event: HistoricalTournament): string | null {
  if (!c.calendar) return "This save uses the original weekly calendar.";
  if (c.calendar.runs.some(r => r.eventId === event.id)) return "Your team has already entered this event.";
  if (c.office?.registrations[event.id]?.status === "reserved") return "Your place is already reserved.";
  const planning = { ...c, calendar: { ...c.calendar, runs: c.calendar.runs.filter(r => r.state === "complete") } };
  return tournamentEntryBlocker(planning, event);
}
export function reserveTournament(c: Campaign, eventId: string): Campaign {
  const event = tournamentById(eventId);
  if (!event) throw new Error("Unknown tournament.");
  const reason = reservationBlocker(c, event);
  if (reason) throw new Error(reason);
  const next = structuredClone(c);
  next.office ??= emptyOffice();
  next.office.registrations[eventId] = { status: "reserved", at: officeNow(c) };
  // Lock the invitation decision used to accept this place.
  next.calendar!.invitations[eventId] ??= earnedInvitations(c, event);
  return syncOffice(next);
}
export function declineTournament(c: Campaign, eventId: string): Campaign {
  const next = structuredClone(c);
  next.office ??= emptyOffice();
  next.office.registrations[eventId] = { status: "declined", at: officeNow(c) };
  return next;
}
export function updateMessage(c: Campaign, id: string, change: Partial<Pick<OfficeMessage, "read" | "archived">>): Campaign {
  if (!c.office?.messages.some(m => m.id === id)) return c;
  return { ...c, office: { ...c.office, messages: c.office.messages.map(m => m.id === id ? { ...m, ...change } : m) } };
}
export function markInboxRead(c: Campaign): Campaign {
  if (!c.office) return c;
  return { ...c, office: { ...c.office, messages: c.office.messages.map(m => m.archived || m.expired ? m : { ...m, read: true }) } };
}

function messageWeek(c: Campaign, message: OfficeMessage): number {
  if (Number.isFinite(message.createdWeek)) return message.createdWeek!;
  if (c.calendar && message.at.includes("T") && Number.isFinite(Date.parse(message.at)))
    return c.calendar.contractEpoch + Math.floor((Date.parse(message.at) - Date.parse(c.calendar.origin)) / (7 * CALENDAR_DAY));
  const legacy = /^(\d+) · Week (\d+)$/.exec(message.at);
  return legacy ? Number(legacy[1]) * 18 + Number(legacy[2]) - 1 : campaignWeek(c);
}

/** Evaluate real club state, including notices saved before expiry metadata existed. */
export function messageExpiryReason(c: Campaign, message: OfficeMessage): string | null {
  // Patch announcements remain readable and link to their own historical notes.
  if (message.category === "patches") return null;
  const week = campaignWeek(c);
  const age = week - messageWeek(c, message);
  const contract = /^contract:(.*):(-?\d+):(-?\d+):(due|expired)$/.exec(message.id);
  if (contract) {
    const [, id, signedAt, expiresAt, phase] = contract;
    if (!c.roster.includes(id)) return "This player is no longer in your managed lineup.";
    const term = c.contracts?.[id];
    if (!term || term.signedAt !== Number(signedAt) || term.expiresAt !== Number(expiresAt)) return "The player agreement has been renewed or replaced.";
    if (phase === "due" && week >= term.expiresAt) return "The fixed term has ended. The renewal notice replaces this reminder.";
    return null; // An unresolved renewal stays relevant even after several weeks.
  }
  const opportunity = /^sponsor-opportunity:(.*):(\d+)$/.exec(message.id);
  if (opportunity) {
    const sponsor = sponsors.find(s => s.id === opportunity[1]);
    if (!sponsor) return "This brand is no longer available in the sponsor catalog.";
    const blocker = sponsorBlocker(c, sponsor);
    if (blocker) return blocker;
    return age >= 2 || Number(opportunity[2]) !== c.year ? "This partnership lead is outdated. Check the sponsor market for current availability and terms." : null;
  }
  const sponsorship = /^sponsor:(.*):(-?\d+):(-?\d+):(due|expired)$/.exec(message.id);
  if (sponsorship) {
    const [, id, signedAt, expiresAt, phase] = sponsorship;
    const deals = sponsorMarket(c).deals;
    const active = deals.find(d => d.sponsorId === id && d.teamId === managedSponsorTeam(c) && d.signedAt <= week && d.expiresAt > week);
    if (phase === "due") {
      if (week >= Number(expiresAt)) return "This agreement has ended. Its expiry notice replaces this reminder.";
      if (!active || active.signedAt !== Number(signedAt) || active.expiresAt !== Number(expiresAt)) return "This sponsor agreement is no longer active on these terms.";
      return null;
    }
    if (active) return "You have already signed a new agreement with this sponsor.";
    return age >= 4 ? "This expiry update is now historical. Current deals are shown in the sponsor market." : null;
  }
  if (message.id.startsWith("cash-warning:")) {
    const net = weeklyWages(c) - weeklyIncome(c);
    if (net <= 0 || c.cash >= net * 3) return "Your current cash and recurring income no longer trigger this warning.";
    return message.id !== `cash-warning:${Math.floor(week / 4)}` ? "A newer finance update replaces this warning." : null;
  }
  const invitation = message.id.startsWith("invitation:");
  const registration = message.id.startsWith("registration:");
  if ((invitation || registration) && message.action?.kind === "tournament") {
    const event = tournamentById(message.action.eventId);
    if (!event || !c.calendar) return "This tournament is no longer available in the current calendar.";
    const run = c.calendar.runs.find(r => r.eventId === event.id);
    if (registration && message.id.endsWith(":missed")) {
      if (run) return "This tournament has already been entered.";
      return age >= 4 ? "This missed-registration update is now historical." : null;
    }
    if (run) return "Your team has already entered this tournament.";
    if (c.office?.registrations[event.id]?.status === "declined") return "You declined this event or withdrew its reservation.";
    if (utcTime(c.calendar.now) > calendarDay(event.start) + CALENDAR_DAY) return "The opening registration window has closed.";
    if (invitation && !earnedInvitations(c, event).includes(managedReference(c))) return "Your club no longer holds an invitation for this event.";
    if (invitation && c.office?.registrations[event.id]?.status === "reserved") return "You have accepted this invitation and reserved your place.";
    if (registration && c.office?.registrations[event.id]?.status !== "reserved") return "There is no longer an active reservation for this event.";
    const planning = { ...c, calendar: { ...c.calendar, runs: c.calendar.runs.filter(r => r.state === "complete") } };
    return tournamentEntryBlocker(planning, event);
  }
  const result = /^result:(.*):(\d+)$/.exec(message.id);
  if (result && message.action?.kind === "tournament" && message.action.eventId !== result[1]) {
    const parent = tournamentById(message.action.eventId);
    if (!parent || !c.calendar) return "The next event in this qualification route is no longer available.";
    if (c.calendar.runs.some(r => r.eventId === parent.id)) return "You have already used this qualifying place to enter the next event.";
    if (utcTime(c.calendar.now) > calendarDay(parent.start) + CALENDAR_DAY) return "The entry window for the qualified event has closed.";
    if (!qualifiedFor(c, parent)) return "This qualification route no longer grants your club entry.";
  }
  return age >= 4 ? "This club update is now historical." : null;
}

/** Stop weekly advances at invitations/reservations and due fixtures, never silently skip them. */
export function advanceManagerWeek(current: Campaign): Campaign {
  const c = syncOffice(current);
  if (!c.calendar) return syncOffice(advanceWeek(c));
  const now = utcTime(c.calendar.now);
  const planning = { ...c, calendar: { ...c.calendar, runs: c.calendar.runs.filter(r => r.state === "complete") } };
  let target = now + 7 * CALENDAR_DAY;
  for (const event of historicalTournaments) {
    const registration = c.office?.registrations[event.id];
    const hasInvitation = c.office?.messages.some(m => m.id === `invitation:${event.id}` && !m.expired);
    const validReservation = registration?.status === "reserved" && !tournamentEntryBlocker(planning, event);
    if (registration?.status === "declined" || (!hasInvitation && !validReservation) || c.calendar.runs.some(r => r.eventId === event.id)) continue;
    const start = calendarDay(event.start);
    if (now <= start + CALENDAR_DAY && start <= target) target = Math.min(target, Math.max(now, start));
  }
  for (const run of c.calendar.runs.filter(r => r.state === "playing")) {
    const fixture = nextTournamentFixture(run);
    if (fixture) target = Math.min(target, Math.max(now, utcTime(fixture.at)));
  }
  return syncOffice(advanceCalendarTo(c, new Date(target).toISOString()));
}

/** Idempotent reconciliation: transitions and reloads create each notice only once. */
export function syncOffice(current: Campaign): Campaign {
  const previous = current.office;
  const office = previous ? structuredClone(previous) : emptyOffice();
  const next = { ...current, office };
  const seen = new Set(office.seen);
  const at = officeNow(current);
  const week = campaignWeek(current);
  const add = (message: Omit<OfficeMessage, "at" | "createdWeek" | "expired">) => {
    if (seen.has(message.id)) {
      const existing = office.messages.find(m => m.id === message.id);
      if (existing && !existing.expired) Object.assign(existing, { subject: message.subject, body: message.body });
      return;
    }
    seen.add(message.id); office.seen.push(message.id); office.messages.unshift({ ...message, at, createdWeek: week });
  };
  add({ id: "office-welcome", sender: "Club secretary", subject: "Your manager's inbox is ready", category: "club",
    body: "Tournament invitations, registration reminders, player terms and sponsor updates arrive here. Opening a message marks it read. Every action links back to your club's actual agreements and event entry rules." });
  for (const patch of announcedPatches(current, office.lastPatchId)) add({
    id: `patch:${patch.id}`, sender: "Patch desk", category: "patches", subject: `Patch ${patch.id}: ${patch.name}`,
    body: patchAnnouncement(patch), action: { kind: "patch", patchId: patch.id }, actionLabel: `Read patch ${patch.id} notes`,
  });
  office.lastPatchId = campaignPatch(current).id;
  for (const id of current.roster) {
    const p = current.players.find(p => p.id === id);
    const term = current.contracts?.[id];
    if (!p || !term) continue;
    const left = term.expiresAt - week;
    const key = `contract:${id}:${term.signedAt}:${term.expiresAt}`;
    const action: OfficeAction = { kind: "player", playerId: id };
    if (left > 0 && left <= 2) add({ id: `${key}:due`, sender: `${p.name} · Player representative`, category: "contracts", subject: `${p.name}: contract ends in ${left} ${left === 1 ? "week" : "weeks"}`,
      body: `The current ${money(term.wage)}/week agreement is nearing expiry. Review pay, practice and protected rest before renewing. Tournament registration keeps the lineup together through its run.`, action, actionLabel: "Review player contract" });
    if (left <= 0) add({ id: `${key}:expired`, sender: `${p.name} · Player representative`, category: "contracts", subject: `${p.name}: renewal needed`,
      body: `The fixed term has ended. ${p.name} remains with the club on continuing terms; the renewal morale penalty applies outside a registered tournament. Open the profile to negotiate.`, action, actionLabel: "Negotiate renewal" });
  }
  const ownDeals = sponsorMarket(current).deals.filter(d => d.teamId === managedSponsorTeam(current));
  const terms = ownDeals.map(d => ({ id: d.sponsorId, name: sponsors.find(s => s.id === d.sponsorId)?.name ?? d.sponsorId, signedAt: d.signedAt, expiresAt: d.expiresAt, weekly: d.weekly }));
  for (const term of [...office.sponsorTerms, ...terms]) {
    const key = `sponsor:${term.id}:${term.signedAt}:${term.expiresAt}`;
    const left = term.expiresAt - week;
    const action: OfficeAction = { kind: "page", page: "finances" };
    if (left > 0 && left <= 2) add({ id: `${key}:due`, sender: term.name, category: "sponsors", subject: `${term.name}: partnership ending soon`,
      body: `Our agreement has ${left} ${left === 1 ? "week" : "weeks"} remaining. ${money(term.weekly)}/week support, benefits and media obligations end at expiry. A new agreement can be negotiated once the brand is available.`, action, actionLabel: "Review sponsorships" });
    if (left <= 0) add({ id: `${key}:expired`, sender: term.name, category: "sponsors", subject: `${term.name}: agreement ended`,
      body: `The fixed agreement has expired. Its ${money(term.weekly)}/week income, benefits and media obligations have stopped. Visit the sponsor market to check availability and negotiate another deal.`, action, actionLabel: "Open sponsor market" });
  }
  office.sponsorTerms = terms;
  const opportunity = sponsors.filter(s => !sponsorBlocker(current, s)).sort((a, b) => b.weekly - a.weekly).slice(0, 2);
  for (const s of opportunity) add({ id: `sponsor-opportunity:${s.id}:${current.year}`, sender: `${s.name} · Partnerships`, category: "sponsors", subject: `${s.name}: open to a partnership`,
    body: `Your club meets our current reputation requirement and the brand is available. Our starting package is ${money(s.weekly)}/week; terms, bonuses and media time are negotiable. Availability may change before you sign.`, action: { kind: "page", page: "finances" }, actionLabel: "Discuss sponsor terms" });
  const net = weeklyWages(current) - weeklyIncome(current);
  if (net > 0 && current.cash < net * 3) add({ id: `cash-warning:${Math.floor(week / 4)}`, sender: "Finance director", category: "club", subject: current.cash < 0 ? "Action needed: the club is in debt" : "Cash covers less than three weeks of net costs",
    body: `${money(current.cash)} in cash against ${money(net)} in net weekly costs. Review wages and sponsor income; unpaid payroll lowers player happiness.`, action: { kind: "page", page: "finances" }, actionLabel: "Review club finances" });
  if (current.calendar) {
    const now = utcTime(current.calendar.now);
    const invitations = { ...current.calendar.invitations };
    next.calendar = { ...current.calendar, invitations };
    for (const event of historicalTournaments) {
      const start = calendarDay(event.start);
      const closed = start + CALENDAR_DAY;
      const run = current.calendar.runs.find(r => r.eventId === event.id);
      if (run?.state === "complete") {
        const p = run.placements.find(p => p.team === run.managed);
        if (p) add({ id: `result:${event.id}:${run.seed}`, sender: "Tournament desk", category: "tournaments", subject: `${event.name}: ${p.from === 1 ? "champions" : `${p.from}${p.from !== p.to ? `–${p.to}` : ""} place`}`,
          body: `${money(p.prize)} gross prize earned. Registered player shares have been settled. ${event.parent && p.from <= (event.qualifyingPlaces ?? 1) ? "You earned a qualifying place in the parent event." : "Open the event to review your results."}`, action: { kind: "tournament", eventId: event.parent && p.from <= (event.qualifyingPlaces ?? 1) ? event.parent : event.id }, actionLabel: event.parent && p.from <= (event.qualifyingPlaces ?? 1) ? "View qualified event" : "View tournament" });
      }
      const registration = office.registrations[event.id];
      if (registration?.status === "reserved" && !run) {
        add({ id: `registration:${event.id}`, sender: "Tournament desk", category: "tournaments", subject: `${event.name}: place reserved`, body: `Your entry is reserved for ${event.start.slice(0, 10)} through ${event.end.slice(0, 10)}. Start the tournament from its event page before registration closes. Reserving does not advance the club clock.`, action: { kind: "tournament", eventId: event.id }, actionLabel: "Open registered event" });
        if (now >= start - 7 * CALENDAR_DAY && now <= closed) add({ id: `registration:${event.id}:due`, sender: "Tournament desk", category: "tournaments", subject: `${event.name}: your opening stage is due`, body: "Your reserved event is within seven days of its opening. Open the event and start your run before registration closes. Check any overlapping commitments first.", action: { kind: "tournament", eventId: event.id }, actionLabel: "Start registered event" });
        if (now > closed) add({ id: `registration:${event.id}:missed`, sender: "Tournament desk", category: "tournaments", subject: `${event.name}: registration missed`, body: "The opening registration window has closed without starting your run. The reservation no longer grants entry. No results or prize money have been generated for your club.", action: { kind: "tournament", eventId: event.id }, actionLabel: "Review event" });
      }
      if (event.status !== "ready" || run || now < start - 28 * CALENDAR_DAY || now > closed || registration?.status === "declined") continue;
      const invitees = earnedInvitations(next, event);
      if (!invitees.includes(managedReference(current)) || qualifiedFor(current, event)) continue;
      invitations[event.id] ??= invitees;
      add({ id: `invitation:${event.id}`, sender: `${event.name} · Organizer`, category: "tournaments", subject: `Invitation: ${event.name}`,
        body: `Your club has earned an invitation. The event runs ${event.start.slice(0, 10)} through ${event.end.slice(0, 10)} in ${event.location}. Claim your spot, or decline. You must start at the opening stage; an invitation alone does not enter the tournament.`, action: { kind: "tournament", eventId: event.id }, actionLabel: "Review invitation" });
    }
  }
  for (const message of office.messages) {
    message.createdWeek ??= messageWeek(current, message);
    if (message.expired) continue;
    const reason = messageExpiryReason(next, message);
    if (reason) message.expired = { at, reason };
  }
  office.messages = office.messages.slice(0, 300);
  return JSON.stringify(previous) === JSON.stringify(office) && JSON.stringify(current.calendar?.invitations) === JSON.stringify(next.calendar?.invitations) ? current : next;
}
