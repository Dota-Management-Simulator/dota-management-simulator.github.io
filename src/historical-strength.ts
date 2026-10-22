import { allRosterReferences, historicalPlayerId, sourceFor } from "./history";
import { historicalTournaments } from "./tournaments";
import type { HistoricalStrength, HistoricalTournament } from "./tournament-types";

const DAY = 86400000;
const time = (date: string) => Date.parse(date);
interface Evidence {
  event: HistoricalTournament;
  roster: string[];
  rosterDate: string;
  from: number;
  to: number;
  power: number;
}

/** An event's results describe a lineup, not a permanent organization rating.
 * Annual references are approximate; their observation date remains visible. */
function evidenceFor(event: HistoricalTournament): Evidence[] {
  if (event.status !== "ready") return [];
  return Object.entries(event.historicalResults ?? {}).flatMap(([club, band]) => {
    if (band.from < 1 || band.to < band.from || band.to > event.teams.length) return [];
    const distance = (r: typeof allRosterReferences[number]) => sourceFor(r.source)?.url === event.source ? 0 :
      /^\d{4}$/.test(r.date) ? (r.date === String(event.year) ? 180 * DAY : Infinity) : Math.abs(time(r.date) - time(event.end));
    const reference = allRosterReferences.filter(r => r.id === club && distance(r) <= 200 * DAY)
      .sort((a, b) => distance(a) - distance(b))[0];
    if (!reference || reference.roster.length !== 5) return [];
    const roster = reference.playerIds ?? reference.roster.map(historicalPlayerId);
    if (new Set(roster).size !== 5) return [];
    // Illustrative combat calibration, not a historical player skill score.
    const power = Math.max(-0.18, 0.44 - 0.16 * Math.log2((band.from + band.to) / 2)
      - Math.min(0.18, (event.tier - 1) * 0.06) - (event.kind === "qualifier" ? 0.12 : 0));
    return [{ event, roster, rosterDate: reference.date, ...band, power }];
  });
}
const evidenceCache = new Map<string, Evidence[]>();
const nearbyCache = new Map<string, Evidence[]>();
function evidence(event: HistoricalTournament) {
  let rows = evidenceCache.get(event.id);
  if (!rows) { rows = evidenceFor(event); evidenceCache.set(event.id, rows); }
  return rows;
}

/** Same-event evidence first; otherwise a nearby completed event. No perpetual
 * brand bonus, future-year pedigree, fuzzy player matching or invented result. */
export function historicalLineupStrength(event: HistoricalTournament, roster: string[]): HistoricalStrength {
  const overlap = (row: Evidence) => roster.filter(id => row.roster.includes(id)).length;
  const local = [...evidence(event)].sort((a, b) => overlap(b) - overlap(a));
  let nearby = nearbyCache.get(event.id);
  if (!nearby) {
    nearby = historicalTournaments.filter(other => other.id !== event.id && other.status === "ready" &&
      time(other.end) <= time(event.start) && time(event.start) - time(other.end) <= 365 * DAY)
      .sort((a, b) => time(b.end) - time(a.end)).flatMap(other => evidence(other));
    nearbyCache.set(event.id, nearby);
  }
  const candidates = [...local, ...nearby];
  const playerPower = (id: string) => {
    const row = candidates.find(candidate => candidate.roster.includes(id));
    // Past evidence fades; the current event's reference does not.
    return row ? row.power * (row.event.id === event.id ? 1 :
      Math.max(0, 1 - (time(event.start) - time(row.event.end)) / (366 * DAY))) : 0;
  };
  const players = roster.reduce((sum, id) => sum + playerPower(id), 0) / Math.max(5, roster.length) * 0.75;
  const closest = candidates.map(row => ({ row, count: roster.filter(id => row.roster.includes(id)).length }))
    .filter(({ count }) => count >= 3).sort((a, b) => b.count - a.count ||
      Number(b.row.event.id === event.id) - Number(a.row.event.id === event.id))[0];
  const retained = closest?.count ?? 0;
  const row = closest?.row;
  // Losing a player removes their pedigree and some of the old five's cohesion.
  const continuity = row ? row.power * 0.25 * (retained / 5) ** 3 *
    (row.event.id === event.id ? 1 : Math.max(0, 1 - (time(event.start) - time(row.event.end)) / (366 * DAY))) : 0;
  return { players, continuity, retained, covered: roster.filter(id => candidates.some(candidate => candidate.roster.includes(id))).length, ...(row ? { reference: {
    event: row.event.name, source: row.event.source, from: row.from, to: row.to, rosterDate: row.rosterDate,
  } } : {}) };
}
