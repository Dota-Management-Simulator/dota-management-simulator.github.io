import type { Campaign } from "./game";
import { activeClubs } from "./history";
import { earnedInvitations, earnedQualifyingPlaces, invitationRanking } from "./historical-game";
import { historicalTournaments, tournamentForRun, utcTime } from "./tournaments";
import type { HistoricalTournament, TournamentRun, TournamentTeam } from "./tournament-types";

export type EntryStatus = "in-ti" | "invited" | "qualified" | "projected" | "reserved" | "declined" | "missed" | "qualifiers" | "unknown";
export interface TeamForm {
  outcome: "W" | "D" | "L"; opponent: string; event: string; at: string; score: string; order: number;
}
export interface TeamStanding {
  id: string; clubId?: string; name: string; region: string; managed: boolean; active: boolean;
  played: number; wins: number; draws: number; losses: number; mapWins: number; mapLosses: number;
  form: TeamForm[]; titles: number; prize: number;
  inviteRank: number | null; inviteScore: number | null; performanceScore: number | null;
  status: EntryStatus; statusLabel: string; route: string;
}
export interface TournamentWinner {
  eventId: string; event: string; year: number; at: string; order: number; qualifier: boolean;
  winner: { name: string; clubId?: string }; runnerUp: { name: string; clubId?: string } | null;
  prize: number | null; archived: boolean;
}
export interface StandingsView {
  event: HistoricalTournament | null; rows: TeamStanding[]; winners: TournamentWinner[];
  liveRuns: TournamentRun[]; since: string | null; locked: boolean; recordedSeries: number;
}

/** The current TI, or the next imported edition; no fictitious annual TI in 2020/future years. */
export function nextRaceEvent(c: Campaign): HistoricalTournament | null {
  if (!c.calendar) return null;
  const now = utcTime(c.calendar.now);
  return historicalTournaments.filter(e => e.kind === "ti" && utcTime(e.end) + 86400000 > now)
    .sort((a, b) => utcTime(a.start) - utcTime(b.start))[0] ?? null;
}

function emptyRow(id: string, name: string, region: string, managed = false, clubId?: string, active = false): TeamStanding {
  return { id, name, region, managed, clubId, active, played: 0, wins: 0, draws: 0, losses: 0,
    mapWins: 0, mapLosses: 0, form: [], titles: 0, prize: 0, inviteRank: null, inviteScore: null, performanceScore: null,
    status: "unknown", statusLabel: "No place recorded", route: "" };
}

function recordSeries(a: TeamStanding, b: TeamStanding, score: [number, number], winner: 0 | 1 | null,
  context: { event: string; at: string; order: number }) {
  [a, b].forEach((row, side) => {
    const outcome = winner === null ? "D" : winner === side ? "W" : "L";
    row.played++; row.wins += Number(outcome === "W"); row.draws += Number(outcome === "D"); row.losses += Number(outcome === "L");
    row.mapWins += score[side]; row.mapLosses += score[1 - side];
    row.form.push({ ...context, outcome, opponent: side === 0 ? b.name : a.name, score: `${score[side]}–${score[1 - side]}` });
  });
}

/** A read-only index of saved campaign results. Catalog rosters never supply winners or match records. */
export function campaignStandings(c: Campaign, event: HistoricalTournament | null = nextRaceEvent(c)): StandingsView {
  const rows = new Map<string, TeamStanding>();
  const managed = c.world?.managedTeamId ?? "managed";
  for (const club of c.world ? activeClubs(c.world) : []) rows.set(club.id,
    emptyRow(club.id, club.name, club.region, club.id === managed, club.id, true));
  if (!rows.has(managed)) rows.set(managed, emptyRow(managed, c.settings.team, c.settings.region, true, c.world?.managedTeamId, true));
  const winners: TournamentWinner[] = [];
  if (!c.calendar) {
    let recordedSeries = 0;
    for (const r of c.results) {
      if (r.skipped || r.tournamentId || r.year > c.year || (r.year === c.year && r.week > c.week)) continue;
      const opponentId = `legacy:${r.year}:${r.opponent}`;
      if (!r.opponent || r.opponent === "—") continue;
      if (!rows.has(opponentId)) rows.set(opponentId, emptyRow(opponentId, r.opponent, "Archived opponent"));
      const own = rows.get(managed)!, other = rows.get(opponentId)!;
      const order = r.year * 100 + r.week;
      winners.push({ eventId: `legacy:${r.year}:${r.eventId}`, event: r.event, year: r.year, at: `${r.year} · Week ${r.week}`, order,
        qualifier: r.eventId === "qualifier", winner: { name: r.won ? c.settings.team : r.opponent, clubId: r.won ? own.clubId : undefined },
        runnerUp: { name: r.won ? r.opponent : c.settings.team, clubId: r.won ? undefined : own.clubId }, prize: r.won ? r.prize : null, archived: true });
      if (r.year !== c.year) continue;
      if (r.eventId !== "qualifier") (r.won ? own : other).titles++;
      own.prize += r.prize;
      if (r.series) { recordSeries(own, other, r.series.score, r.series.winner, { event: r.event, at: `${r.year} · Week ${r.week}`, order }); recordedSeries++; }
    }
    const own = rows.get(managed)!;
    own.status = c.qualified ? "qualified" : "qualifiers"; own.statusLabel = c.qualified ? "Qualified" : "Chasing qualification";
    own.route = `${c.points} / 80 points · regional qualifier win also qualifies`;
    return finish({ event: null, rows: [...rows.values()], winners, liveRuns: [], since: null, locked: false, recordedSeries });
  }
  const now = utcTime(c.calendar.now);
  const cutoff = event ? Math.min(now, utcTime(event.end) + 86400000 - 1) : now;
  const previousTi = event ? historicalTournaments.filter(e => e.kind === "ti" && utcTime(e.end) < utcTime(event.start))
    .sort((a, b) => utcTime(b.end) - utcTime(a.end))[0] : null;
  const after = previousTi ? utcTime(previousTi.end) : event ? Math.min(utcTime(event.start), now) - 366 * 86400000 : now - 366 * 86400000;
  const teamRow = (run: TournamentRun, team: TournamentTeam) => {
    const id = team.id === run.managed ? managed : team.clubId ?? `field:${run.eventId}:${team.id}`;
    if (!rows.has(id)) {
      const club = c.world?.clubs.find(club => club.id === team.clubId);
      rows.set(id, emptyRow(id, club?.name ?? team.name, club?.region ?? "Unlinked field team", id === managed, team.clubId));
    }
    return rows.get(id)!;
  };
  let recordedSeries = 0;
  const seenRuns = new Set<string>();
  for (const run of c.calendar.runs) {
    if (seenRuns.has(run.eventId)) continue;
    seenRuns.add(run.eventId);
    const source = tournamentForRun(run);
    if (!source) continue;
    const seenMatches = new Set<string>();
    for (const match of run.matches) {
      const order = utcTime(match.at);
      if (source.id === previousTi?.id || seenMatches.has(match.id) || order <= after || order > cutoff) continue;
      seenMatches.add(match.id);
      const a = run.teams.find(team => team.id === match.teams[0]), b = run.teams.find(team => team.id === match.teams[1]);
      if (!a || !b) continue;
      const advantage = run.fixtures.find(f => f.id === match.id)?.advantage ?? [0, 0];
      const score: [number, number] = [Math.max(0, match.score[0] - advantage[0]), Math.max(0, match.score[1] - advantage[1])];
      if (!score[0] && !score[1]) continue;
      recordSeries(teamRow(run, a), teamRow(run, b), score, match.winner, { event: source.name, at: match.at, order });
      recordedSeries++;
    }
    if (run.state !== "complete" || utcTime(source.end) > cutoff || run.matches.some(m => utcTime(m.at) > cutoff)) continue;
    const champions = run.placements.filter(p => p.from === 1 && p.to === 1);
    if (champions.length !== 1) continue;
    const champion = run.teams.find(t => t.id === champions[0].team);
    if (!champion) continue;
    const second = run.placements.find(p => p.from === 2 && p.to === 2);
    const runnerUp = second ? run.teams.find(t => t.id === second.team) : null;
    winners.push({ eventId: source.id, event: source.name, year: source.year, at: source.end, order: utcTime(source.end), qualifier: source.kind === "qualifier",
      winner: { name: champion.name, clubId: champion.clubId }, runnerUp: runnerUp ? { name: runnerUp.name, clubId: runnerUp.clubId } : null,
      prize: champions[0].prize, archived: false });
    if (source.id === previousTi?.id || utcTime(source.end) <= after) continue;
    for (const place of run.placements) {
      const team = run.teams.find(t => t.id === place.team);
      if (!team) continue;
      const row = teamRow(run, team);
      row.prize += place.prize;
      if (place.from === 1 && place.to === 1 && source.kind !== "qualifier") row.titles++;
    }
  }
  const locked = !!event && (Object.hasOwn(c.calendar.invitations, event.id) || (event.year === 2011 && event.kind === "ti"));
  if (event) {
    const tiRun = c.calendar.runs.find(run => run.eventId === event.id);
    const referenceRow = (id: string) => {
      const clubId = id === (c.world?.replacedTeamId ?? managed) ? managed : id;
      if (rows.has(clubId)) return rows.get(clubId)!;
      const field = tiRun?.teams.find(team => team.id === id);
      if (field) return teamRow(tiRun!, field);
      const key = `reference:${event.id}:${id}`;
      if (!rows.has(key)) rows.set(key, emptyRow(key, event.teamNames[id] ?? id, "Unlinked field team"));
      return rows.get(key)!;
    };
    const canProject = !locked && now <= utcTime(event.start) + 86400000;
    const ranking = canProject ? invitationRanking(c, event) : [];
    ranking.forEach((candidate, index) => {
      const row = rows.get(candidate.clubId);
      if (row) { row.inviteRank = index + 1; row.inviteScore = candidate.score; row.performanceScore = candidate.performance; }
    });
    for (const row of rows.values()) { row.status = "qualifiers"; row.statusLabel = "No TI place"; row.route = "Needs an invite or an earned qualifying place"; }
    for (const id of locked || canProject ? earnedInvitations(c, event) : []) {
      const row = referenceRow(id);
      row.status = locked ? "invited" : "projected"; row.statusLabel = locked ? "Invited" : "Projected invite";
      row.route = locked ? "Direct invitation recorded for this edition" : "Current selection if invitations were decided now";
    }
    for (const entry of earnedQualifyingPlaces(c, event.id)) {
      if (utcTime(entry.source.end) > now) continue;
      const team = entry.run.teams.find(team => team.id === entry.place.team);
      if (!team) continue;
      const row = teamRow(entry.run, team);
      row.status = "qualified"; row.statusLabel = "Qualified"; row.route = `Earned through ${entry.source.name}`;
    }
    for (const team of tiRun?.teams ?? []) {
      const row = teamRow(tiRun!, team);
      if (!row.route) row.route = "Registered tournament field";
      row.status = "in-ti"; row.statusLabel = tiRun!.state === "complete" ? "Played TI" : "In TI";
    }
    if (!tiRun) {
      const own = rows.get(managed)!;
      const registration = c.office?.registrations[event.id];
      if (registration?.status === "declined") {
        own.status = "declined"; own.statusLabel = "Declined"; own.route = "You declined this event";
      } else if (now > utcTime(event.start) + 86400000 && utcTime(c.calendar.origin) <= utcTime(event.end) + 86400000) {
        own.status = "missed"; own.statusLabel = "Entry closed"; own.route = "Your club did not register a TI run before the opening window closed";
      } else if (registration?.status === "reserved" && ["invited", "qualified"].includes(own.status)) {
        own.status = "reserved"; own.statusLabel = "Place reserved"; own.route = "Start the tournament from the calendar before registration closes";
      }
    }
  }
  return finish({ event, rows: [...rows.values()], winners, locked, since: new Date(after).toISOString(), recordedSeries,
    liveRuns: c.calendar.runs.filter(run => run.state === "playing" && utcTime(tournamentForRun(run)?.start ?? "9999-01-01") <= now) });
}

function finish(view: StandingsView) {
  for (const row of view.rows) row.form.sort((a, b) => b.order - a.order || a.event.localeCompare(b.event));
  view.rows.sort((a, b) => b.wins - a.wins || (b.played ? b.wins / b.played : -1) - (a.played ? a.wins / a.played : -1)
    || b.mapWins - b.mapLosses - (a.mapWins - a.mapLosses) || b.titles - a.titles || a.name.localeCompare(b.name));
  view.winners.sort((a, b) => b.order - a.order || a.event.localeCompare(b.event));
  return view;
}
