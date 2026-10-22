import { advanceCalendarTo, clamp, data, money, rating, teamPlayers } from "./game";
import type { Campaign, Result } from "./game";
import type { BattleConfig, SeriesSummary } from "./battle";
import { activeClubs } from "./history";
import { campaignWeek } from "./contracts";
import { fixtureTeams, historicalTournaments, hashSeed, isoTime, nextTournamentFixture, recordTournamentSeries, seededTournamentFixtures, tournamentById, tournamentForRun, tournamentOpponentCondition, utcTime } from "./tournaments";
import type { HistoricalTournament, TournamentFixture, TournamentRun } from "./tournament-types";

const DAY = 86400000;
export function enableHistoricalCalendar(current: Campaign): Campaign {
  if (current.calendar) return current;
  const c = structuredClone(current);
  const epoch = campaignWeek(c);
  const start = c.year === 2011 ? "2011-08-17T00:00:00Z" : `${c.year}-01-01T00:00:00Z`;
  c.calendar = { now: start, origin: start, paidWeeks: 0, contractEpoch: epoch, runs: [], rankings: {}, invitations: {}, shuffledYears: Array.from({ length: Math.max(0, Math.min(2026, c.year - 1) - 2010) }, (_, i) => i + 2011) };
  c.week = Math.floor((utcTime(start) - Date.UTC(c.year, 0, 1)) / 604800000) + 1;
  c.points = 0; c.qualified = c.year === 2011;
  c.log = ["Historical calendar enabled. Tournament lineups stay registered through the end of their run. Dates without a published time are shown without an invented start time.", ...c.log].slice(0, 30);
  return c;
}

export function updateHistoricalShuffle(c: Campaign) {
  if (!c.calendar) return;
  for (let year = 2011; year <= Math.min(2026, c.year); year++) {
    const ti = historicalTournaments.find(e => e.kind === "ti" && e.year === year);
    const after = ti ? utcTime(ti.end) + DAY : year === 2020 ? Date.UTC(2021, 0, 1) : Infinity;
    if (utcTime(c.calendar.now) >= after && !c.calendar.shuffledYears.includes(year)) c.calendar.shuffledYears.push(year);
  }
}
export const activeTournament = (c: Campaign) => c.calendar?.runs.find(r => r.state === "playing");
export const activeTournaments = (c: Campaign) => c.calendar?.runs.filter(r => r.state === "playing") ?? [];
/** The calendar may advance through a gap, but never past a due registered
 * series. When an opponent is unresolved, its preceding fixture is the stop. */
export function nextTournamentCommitment(c: Campaign): { eventId: string; fixtureId: string; at: string; timeVerified: boolean; stage: string } | null {
  const commitments = activeTournaments(c).flatMap(run => {
    const completed = new Set(run.matches.map(m => m.id));
    const own = run.fixtures.filter(f => !completed.has(f.id) && fixtureTeams(run, f)?.includes(run.managed));
    const candidates = own.length ? own : [nextTournamentFixture(run)].filter((f): f is TournamentFixture => !!f);
    return candidates.map(f => ({ eventId: run.eventId, fixtureId: f.id, at: f.at, timeVerified: f.timeVerified, stage: f.stage }));
  });
  return commitments.sort((a, b) => utcTime(a.at) - utcTime(b.at))[0] ?? null;
}
const managedClub = (c: Campaign) => c.world?.managedTeamId ?? "managed";
const referenceClub = (c: Campaign) => c.world?.replacedTeamId ?? managedClub(c);

export function qualificationAwards(event: HistoricalTournament) {
  return event.qualification ?? (event.parent ? [{ eventId: event.parent, from: 1, to: event.qualifyingPlaces ?? 1, slots: [] as string[] }] : []);
}
/** Registered source rules survive catalog corrections and saved-game reloads. */
export function earnedQualifyingPlaces(c: Campaign, eventId: string) {
  return (c.calendar?.runs ?? []).filter(run => run.state === "complete").flatMap(run => {
    const source = tournamentForRun(run);
    if (!source) return [];
    return qualificationAwards(source).filter(award => award.eventId === eventId).flatMap(award =>
      run.placements.filter(place => place.from >= award.from && place.to <= award.to).map(place => ({ run, source, award, place })));
  });
}
export const qualifiedForTournament = (c: Campaign, event: HistoricalTournament) =>
  earnedQualifyingPlaces(c, event.id).some(entry => entry.place.team === entry.run.managed);

function qualifierExclusions(c: Campaign, event: HistoricalTournament): Map<string, string> {
  const excluded = new Map<string, string>();
  if (event.kind !== "qualifier") return excluded;
  for (const award of qualificationAwards(event)) {
    const parent = tournamentById(award.eventId);
    if (!parent || utcTime(parent.start) < utcTime(event.start)) continue;
    for (const id of earnedInvitations(c, parent)) excluded.set(id, parent.name);
    for (const entry of earnedQualifyingPlaces(c, parent.id)) {
      const club = entry.run.teams.find(t => t.id === entry.place.team)?.clubId;
      if (club) excluded.set(club === managedClub(c) ? referenceClub(c) : club, parent.name);
    }
  }
  return excluded;
}

export function earnedInvitations(c: Campaign, event: HistoricalTournament): string[] {
  if (c.calendar?.invitations[event.id]) return c.calendar.invitations[event.id];
  if (event.year === 2011 && event.kind === "ti") return event.teams;
  if (!event.invited.length) return [];
  const regionEligible = (region: string) => !event.region || event.region.split("|").includes(region);
  const clubs = c.world ? activeClubs(c.world).filter(t => t.roster.length === 5 && regionEligible(t.region)) : [];
  const qualified = new Set(earnedQualifyingPlaces(c, event.id).map(entry => {
    const team = entry.run.teams.find(t => t.id === entry.place.team)!;
    return team.clubId === managedClub(c) ? referenceClub(c) : team.clubId ?? team.id;
  }));
  const excluded = qualifierExclusions(c, event);
  const cutoff = Math.min(utcTime(event.start), utcTime(c.calendar!.now));
  const previousTi = historicalTournaments.filter(e => e.kind === "ti" && utcTime(e.end) < utcTime(event.start)).sort((a, b) => utcTime(b.end) - utcTime(a.end))[0];
  const after = previousTi ? utcTime(previousTi.end) : cutoff - 366 * DAY;
  const performance = new Map<string, number>();
  for (const run of c.calendar!.runs.filter(r => r.state === "complete")) {
    const source = tournamentForRun(run);
    if (!source || utcTime(source.end) > cutoff || utcTime(source.end) <= after || source.kind === "qualifier") continue;
    for (const place of run.placements) {
      const id = run.teams.find(t => t.id === place.team)?.clubId;
      if (id) performance.set(id, (performance.get(id) ?? 0) + (run.teams.length - place.from + 1) / run.teams.length / Math.max(1, source.tier));
    }
  }
  // Source invitation counts and regional restrictions are historical. The
  // ranking that selects invitees belongs to this campaign's alternate history.
  return clubs.filter(club => {
    const id = club.id === managedClub(c) ? referenceClub(c) : club.id;
    return !qualified.has(id) && !excluded.has(id);
  }).map(club => ({ id: club.id === managedClub(c) ? referenceClub(c) : club.id,
    score: (performance.get(club.id) ?? 0) + club.roster.reduce((n, id) => { const p = c.players.find(p => p.id === id); return n + (p ? rating(p) : 0); }, 0) / 500 + (event.invited.includes(club.id) ? 0.01 : 0) }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, event.invited.length).map(t => t.id);
}

export function tournamentEntryBlocker(c: Campaign, event: HistoricalTournament): string | null {
  if (!c.calendar) return "Start a historical-calendar campaign to enter this event. Your existing save is retained.";
  if (event.status !== "ready") return event.status === "scheduled" ? "This event is scheduled; its final format and prize distribution are not yet historical results." : `Historical verification pending: ${event.limitations.join(" ")}`;
  if (c.calendar.runs.some(r => r.eventId === event.id)) return "Your team has already entered this tournament.";
  const commitments = c.calendar.runs.filter(r => r.state === "playing");
  for (const commitment of commitments) {
    const other = tournamentForRun(commitment)!;
    const next = nextTournamentFixture(commitment);
    if (!event.online && !other.online && event.start <= other.end && other.start <= event.end)
      return `The LAN dates overlap with your registered run at ${other.name}.`;
    if (next && utcTime(next.at) < utcTime(event.start)) return `Play your next series at ${other.name} before advancing to this event.`;
  }
  if (utcTime(c.calendar.now) >= utcTime(event.end) + DAY) return "This tournament has ended.";
  if (utcTime(c.calendar.now) > utcTime(event.start) + DAY) return "Registration has closed; a tournament must be entered from its opening stage.";
  if (event.region && !event.region.split("|").includes(c.settings.region)) return `This qualifier is for ${event.region.split("|").join(" / ")}.`;
  const club = referenceClub(c);
  const invite = earnedInvitations(c, event).includes(club);
  const qualified = qualifiedForTournament(c, event);
  if (event.kind === "qualifier") {
    const parent = qualifierExclusions(c, event).get(club);
    if (parent) return `Your club already has a place at ${parent}; it cannot take another qualifying slot.`;
    if (event.invited.length && !invite && !qualified) return "A closed-qualifier invitation or an open-qualifier place is required.";
    return null;
  }
  if (!invite && !qualified) return "An invitation or a qualifying place is required for this event.";
  return null;
}

export function enterHistoricalTournament(current: Campaign, eventId: string, seed = Math.floor(Math.random() * 4294967296)): Campaign {
  const event = tournamentById(eventId);
  if (!event) throw new Error("Unknown historical tournament.");
  const blocker = tournamentEntryBlocker(current, event);
  if (blocker) throw new Error(blocker);
  let c = advanceCalendarTo(current, isoTime(Math.max(utcTime(current.calendar!.now), utcTime(event.start))));
  c = structuredClone(c);
  const club = referenceClub(c);
  const slots = [...event.teams];
  const invites = earnedInvitations(c, event);
  const assignment = new Map(slots.map(id => [id, id]));
  const freeInvites = invites.filter(id => !event.invited.includes(id));
  for (const slot of event.invited) {
    if (!invites.includes(slot) && freeInvites.length) assignment.set(slot, freeInvites.shift()!);
  }
  const awarded = earnedQualifyingPlaces(c, event.id);
  for (const entry of awarded) {
    const entries = awarded.filter(e => e.run.eventId === entry.run.eventId && e.award === entry.award).sort((a, b) => a.place.from - b.place.from || a.place.team.localeCompare(b.place.team));
    const slot = entry.award.slots?.[entries.indexOf(entry)];
    const winner = entry.run.teams.find(t => t.id === entry.place.team)!;
    if (slot && slots.includes(slot)) assignment.set(slot, winner.clubId === managedClub(c) ? club : winner.clubId ?? winner.id);
  }
  const managedInvite = invites.includes(club);
  let managed = [...assignment].find(([slot, id]) => id === club && (managedInvite ? event.invited.includes(slot) : !event.invited.includes(slot)))?.[0];
  if (!managed && qualifiedForTournament(c, event)) managed = slots.find(slot => !event.invited.includes(slot) && !awarded.some(entry => entry.award.slots?.includes(slot)));
  if (!managed && event.kind === "qualifier" && !event.invited.length) managed = slots.find(slot => !event.invited.includes(slot));
  if (!managed) throw new Error("The earned entry cannot yet be linked to a tournament field slot.");
  assignment.set(managed, club);
  const used = new Set<string>();
  const usedClubs = new Set<string>();
  // Fill the manager first so an AI source slot cannot duplicate their club or players.
  usedClubs.add(managedClub(c)); c.roster.forEach(id => used.add(id));
  const teams = slots.map(id => {
    const actualId = assignment.get(id) ?? id;
    const isManaged = id === managed;
    let realClub = c.world?.clubs.find(t => t.id === (actualId === club ? managedClub(c) : actualId) && t.roster.length === 5 && t.active !== false);
    if (!isManaged && realClub && (usedClubs.has(realClub.id) || realClub.roster.some(pid => used.has(pid)))) {
      const region = realClub.region;
      realClub = activeClubs(c.world!).find(t => t.roster.length === 5 && t.region === region && !usedClubs.has(t.id) && !t.roster.some(pid => used.has(pid)) && ![...assignment.values()].includes(t.id));
    }
    const roster = isManaged ? [...c.roster] : realClub && !realClub.roster.some(pid => used.has(pid)) ? [...realClub.roster] : Array.from({ length: 5 }, (_, role) => `unscouted-${id}-${role}`);
    roster.forEach(pid => used.add(pid));
    if (realClub) usedClubs.add(realClub.id);
    return { id, name: isManaged ? c.settings.team : realClub?.name ?? event.teamNames[id] ?? id, clubId: isManaged ? managedClub(c) : realClub?.id, roster };
  });
  const run: TournamentRun = { eventId, seed, managed, teams, lineup: [...c.roster], prizeShares: Object.fromEntries(c.roster.map(id => [id, c.contracts?.[id]?.prizeShare ?? 0])),
    matches: [], fixtures: seededTournamentFixtures(event, seed), groupOrder: {}, state: "playing", placements: [] };
  const { fixtures: _fixtures, ...definition } = event;
  run.definition = structuredClone(definition);
  c.calendar!.runs.push(run);
  c.calendar!.invitations[eventId] = invites;
  c.log = [`Entered ${event.name}. The five-player lineup and prize-share terms are registered until your run ends.`, ...c.log].slice(0, 30);
  return c;
}

export function tournamentBattleConfig(c: Campaign, run: TournamentRun, fixture: TournamentFixture, managedFirst = true): BattleConfig {
  let keys = fixtureTeams(run, fixture)!;
  if (!keys) throw new Error("The tournament opponents are not resolved.");
  const reverse = managedFirst && keys[1] === run.managed;
  if (reverse) keys = [keys[1], keys[0]];
  const event = tournamentForRun(run)!;
  const teamData = keys.map(key => run.teams.find(t => t.id === key)!);
  const playerRows = (team: typeof teamData[number]) => team.roster.map((id, role) => {
    const p = c.players.find(p => p.id === id);
    const condition = { energy: p?.energy ?? 90, happiness: p?.happiness ?? 85 };
    return { id, name: p?.name ?? `Unscouted ${data.players[role].role.toLowerCase()}`,
      role, skills: { ...(p?.stats ?? data.players[role].stats) },
      ...(team.id === run.managed ? condition : tournamentOpponentCondition(run, team.id, { ...condition, stamina: p?.stats.stamina ?? data.players[role].stats.stamina }, fixture.at)) };
  });
  const players: BattleConfig["players"] = [playerRows(teamData[0]), playerRows(teamData[1])];
  const bonus = (key: string) => key === run.managed ? (c.settings.difficulty === "Club" ? 0.14 : c.settings.difficulty === "Legend" ? -0.12 : 0) + (c.staffIds.includes("c2") ? 0.035 : 0) : 0;
  const through = Math.max(2010, ...c.calendar!.shuffledYears);
  return { seed: run.seed ^ hashSeed(fixture.id), year: event.year, heroPoolThroughYear: Math.min(2026, through),
    teams: [teamData[0].name, teamData[1].name], players, bonuses: [bonus(keys[0]), bonus(keys[1])],
    seriesFormat: { bestOf: fixture.bestOf, ...(fixture.advantage ? { advantage: reverse ? [fixture.advantage[1], fixture.advantage[0]] : fixture.advantage } : {}) } };
}

export function commitTournamentRun(current: Campaign, run: TournamentRun): Campaign {
  const old = current.calendar?.runs.find(r => r.eventId === run.eventId);
  if (!old || old.settled || old.matches.length > run.matches.length || old.seed !== run.seed) return current;
  if (old.matches.length === run.matches.length && old.state === run.state) return current;
  let c = structuredClone(current);
  const index = c.calendar!.runs.findIndex(r => r.eventId === run.eventId);
  c.calendar!.runs[index] = structuredClone(run);
  // AI results advance the same real clock as managed games. Apply the saved
  // batch first so elapsed-time guards see the remaining fixtures, not rounds
  // that have just been played. Other registered commitments can still stop us.
  const known = new Set(old.matches.map(match => match.id));
  const aiEnd = run.matches.filter(match => !known.has(match.id) && !match.teams.includes(run.managed)).reduce((latest, match) => {
    const games = match.performance?.games ?? match.series?.games ?? [];
    return Math.max(latest, utcTime(match.at) + games.reduce((seconds, game) => seconds + game.duration, 0) * 1000);
  }, utcTime(c.calendar!.now));
  const pending = c.calendar!.runs.filter(other => other.state === "playing").map(nextTournamentFixture).filter((fixture): fixture is TournamentFixture => !!fixture);
  const stop = pending.length ? Math.max(utcTime(c.calendar!.now), Math.min(...pending.map(fixture => utcTime(fixture.at)))) : aiEnd;
  if (aiEnd > utcTime(c.calendar!.now)) c = advanceCalendarTo(c, isoTime(Math.min(aiEnd, stop)));
  const stored = c.calendar!.runs[index];
  if (stored.state === "complete" && !stored.settled) {
    const event = tournamentForRun(stored)!;
    const place = stored.placements.find(p => p.team === stored.managed)!;
    c.cash += place.prize;
    const ledger = (label: string, amount: number) => c.transactions.unshift({ year: c.year, week: c.week, label, amount });
    ledger(`${event.name} · ${place.from === place.to ? place.from : `${place.from}–${place.to}`} place`, place.prize);
    for (const id of stored.lineup) {
      const share = Math.floor(place.prize * (stored.prizeShares[id] ?? 0) / 100);
      if (share) { c.cash -= share; ledger(`${c.players.find(p => p.id === id)?.name} prize share · ${event.name}`, -share); }
    }
    c.transactions = c.transactions.slice(0, 80);
    c.reputation = clamp(c.reputation + Math.max(1, 14 - place.from));
    for (const placement of stored.placements) {
      const id = stored.teams.find(t => t.id === placement.team)?.clubId;
      if (id) c.calendar!.rankings[id] = (c.calendar!.rankings[id] ?? 0) + placement.points + (stored.teams.length - placement.from + 1) / stored.teams.length;
    }
    const result: Result = { eventId: event.id, event: event.name, year: event.year, week: c.week, won: place.from === 1, prize: place.prize, points: place.points,
      opponent: "Full tournament", score: `${place.from === place.to ? place.from : `${place.from}–${place.to}`} place`, tournamentId: stored.eventId };
    c.results.push(result);
    c.log = [`${event.name}: ${result.score}. ${money(place.prize)} gross prize earned; registered player shares paid.`, ...c.log].slice(0, 30);
    stored.settled = true;
    updateHistoricalShuffle(c);
  }
  return c;
}

export function settleTournamentMatch(current: Campaign, eventId: string, fixtureId: string, series: SeriesSummary): Campaign {
  const run = current.calendar?.runs.find(r => r.eventId === eventId);
  if (!run || run.matches.some(m => m.id === fixtureId)) return current;
  const fixture = nextTournamentFixture(run);
  if (!fixture || fixture.id !== fixtureId || !fixtureTeams(run, fixture)?.includes(run.managed)) throw new Error("This is not the next managed-team fixture.");
  const updated = recordTournamentSeries(run, fixtureId, series);
  const end = Math.max(utcTime(current.calendar!.now), utcTime(fixture.at)) + series.games.reduce((sum, game) => sum + game.duration * 1000, 0);
  let c = advanceCalendarTo(current, isoTime(end), true);
  c.calendar!.nowHasTime = fixture.timeVerified || current.calendar!.nowHasTime;
  for (const player of teamPlayers(c)) {
    player.energy = clamp(player.energy - series.games.length * Math.max(1, 4 - player.stats.stamina / 40));
    player.happiness = clamp(player.happiness + (series.winner === null ? 0 : series.winner === 0 ? 2 : -1));
  }
  c = commitTournamentRun(c, updated);
  return c;
}
