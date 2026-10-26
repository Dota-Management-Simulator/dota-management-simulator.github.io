import archive from "./data/rosters-2011.json";
import identityData from "./data/player-identities.json";
import aliasesData from "./data/identity-aliases.json";
import world from "./data/world.json";
import { LAST_ROSTER_YEAR, rosterBatchFor, rosterBatches, rosterSources } from "./roster-data";
import type { Player, Role } from "./game";
import { startingAttributes } from "./development";

export const historicalArchive = archive;
const roles: Role[] = ["Carry", "Mid", "Offlane", "Soft support", "Hard support"];
export interface RosterReference {
  id: string;
  name: string;
  region: string;
  ti1: boolean;
  source: string;
  date: string;
  roster: string[];
  playerIds?: string[];
  group?: string;
  bench?: (string | number)[][];
}
export interface Club {
  id: string;
  name: string;
  region: string;
  ti1: boolean;
  roster: string[];
  bench: string[];
  active?: boolean;
  group?: string;
  archivedRoster?: string[];
  reference: { source: string; date: string };
}
export interface HistoricalWorld {
  basisYear: number;
  dataThroughYear?: number;
  managedTeamId: string;
  replacedTeamId?: string;
  clubs: Club[];
  protectedPlayerIds: string[];
  appliedShuffles: number[];
}

const aliases: Record<string, string[]> = { ...archive.aliases, ...aliasesData.groups };
const aliasLookup = new Map(Object.entries(aliases).flatMap(([name, values]) =>
  [name, ...values].map((v): [string, string] => [v.toLowerCase(), name])));
const identities = new Map(identityData.players.map((p) => [p.id, p]));
export const historicalPlayerId = (name: string) =>
  `real-${encodeURIComponent((aliasLookup.get(name.toLowerCase()) ?? name).toLowerCase())}`;
export const originalTiTeams = archive.opening.filter((t) => t.ti1);
export const activeClubs = (state: HistoricalWorld) => state.clubs.filter((t) => t.active !== false);
export const sourceFor = (id: string) => rosterSources.find((s) => s.id === id);
export const allRosterReferences: RosterReference[] = [
  ...archive.opening, ...archive.postTi, ...rosterBatches.flatMap((b) => b.teams),
];
export const customClubNameAvailable = (name: string, replacedId: string) => !!name.trim() &&
  !allRosterReferences.some((t) => t.id !== replacedId && t.name.toLowerCase() === name.trim().toLowerCase());

export const rosterYearForStart = (year: number) => Math.min(LAST_ROSTER_YEAR, year - 1);
export function getStartingTeams(year: number): RosterReference[] {
  if (year <= 2011) return originalTiTeams;
  if (year === 2012) return [...new Map([...archive.opening, ...archive.postTi].map((t) => [t.id, t])).values()];
  return rosterBatchFor(rosterYearForStart(year))?.teams ?? originalTiTeams;
}

function makePlayer(name: string, role: number, region: string, source: string, date: string, team: string, id = historicalPlayerId(name)): Player {
  const identity = identities.get(id);
  return {
    ...structuredClone(world.players[role]),
    id, name, firstName: "", lastName: "", age: null, region, role: roles[role],
    stats: startingAttributes(id),
    historical: {
      aliases: [...new Set([...(identity?.names ?? []), ...(aliases[aliasLookup.get(name.toLowerCase()) ?? name] ?? [])])].filter((s) => s !== name),
      source, date, team, role: roles[role], roleEvidence: "adapted",
    },
  };
}
function referenceMembers(t: RosterReference) {
  return [
    ...t.roster.map((name, role) => ({ name, role, id: t.playerIds?.[role] ?? historicalPlayerId(name), bench: false })),
    ...(t.bench ?? []).map(([name, role]) => ({ name: String(name), role: Number(role), id: historicalPlayerId(String(name)), bench: true })),
  ];
}
export function playersFromReferences(references: RosterReference[]): Player[] {
  const players = new Map<string, Player>();
  for (const t of references) for (const member of referenceMembers(t)) {
    if (!players.has(member.id)) players.set(member.id,
      makePlayer(member.name, member.role, t.region, t.source, t.date, t.name, member.id));
  }
  return [...players.values()];
}
export const clubForPlayer = (state: HistoricalWorld | undefined, id: string) =>
  state?.clubs.find((t) => t.active !== false && (t.roster.includes(id) || t.bench.includes(id)));
function detach(state: HistoricalWorld, id: string) {
  for (const t of state.clubs) {
    t.roster = t.roster.filter((p) => p !== id);
    t.bench = t.bench.filter((p) => p !== id);
  }
}
function ownership(state: HistoricalWorld) {
  return new Map(activeClubs(state).flatMap((t) => [...t.roster, ...t.bench].map((id): [string, Club] => [id, t])));
}

export function fillRegionalVacancies(state: HistoricalWorld, players: Player[], club: Club, allowManagerReserves = false): boolean {
  const byId = new Map(players.map((p) => [p.id, p]));
  const owners = ownership(state);
  for (const role of roles) {
    if (club.roster.some((id) => byId.get(id)?.role === role)) continue;
    const candidates = players.filter((p) => {
      const owner = owners.get(p.id);
      return p.region === club.region && (!owner ||
        ((owner.id !== state.managedTeamId || allowManagerReserves) && owner.bench.includes(p.id)));
    });
    const score = (p: Player) => (p.role === role ? 1000 : 0) +
      (owners.get(p.id)?.id === club.id ? 100 : 0) + (owners.has(p.id) ? 0 : 50) + p.stats.stability;
    candidates.sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id));
    const replacement = candidates[0];
    if (!replacement) return false;
    detach(state, replacement.id);
    replacement.role = role;
    club.roster.push(replacement.id);
    owners.set(replacement.id, club);
  }
  club.roster.sort((a, b) => roles.indexOf(byId.get(a)!.role as Role) - roles.indexOf(byId.get(b)!.role as Role));
  return true;
}

export function createHistoricalWorld(teamId: string, customName?: string, year = 2011) {
  const choices = getStartingTeams(year);
  const chosen = choices.find((t) => t.id === teamId) ?? choices[0];
  const through = rosterYearForStart(year);
  const refs: RosterReference[] = year === 2011 ? archive.opening : [
    ...archive.opening, ...archive.postTi,
    ...rosterBatches.filter((b) => b.year <= through).flatMap((b) => b.teams),
  ];
  const players = playersFromReferences(refs);
  for (const p of archive.freeAgents) if (!players.some((v) => v.id === historicalPlayerId(p.name)))
    players.push(makePlayer(p.name, p.role, p.region, p.source, p.date, "Free agent"));
  const state: HistoricalWorld = {
    basisYear: year, dataThroughYear: through, managedTeamId: customName ? "managed-custom" : chosen.id,
    ...(customName ? { replacedTeamId: chosen.id } : {}), clubs: [], protectedPlayerIds: [],
    appliedShuffles: Array.from({ length: Math.max(0, through - 2010) }, (_, i) => 2011 + i),
  };
  const snapshots: RosterReference[] = year === 2011 ? archive.opening : choices;
  const ordered = [chosen, ...snapshots.filter((r) => r.id !== chosen.id)];
  const claimed = new Set<string>();
  const byId = new Map(players.map((p) => [p.id, p]));
  for (const ref of ordered) {
    const managed = ref.id === chosen.id;
    const club: Club = {
      id: managed ? state.managedTeamId : ref.id, name: managed && customName ? customName : ref.name,
      region: ref.region, ti1: ref.ti1, roster: [], bench: [], active: true, group: ref.group,
      reference: { source: ref.source, date: ref.date },
    };
    state.clubs.push(club);
    for (const member of referenceMembers(ref)) {
      if (claimed.has(member.id)) continue;
      const p = byId.get(member.id)!;
      if (!p) continue;
      p.name = member.name; p.role = roles[member.role]; p.region = ref.region;
      p.historical = makePlayer(member.name, member.role, ref.region, ref.source, ref.date, ref.name, member.id).historical;
      (member.bench ? club.bench : club.roster).push(p.id);
      claimed.add(p.id);
    }
  }
  for (const club of state.clubs) if (!fillRegionalVacancies(state, players, club)) {
    club.active = false; club.archivedRoster = club.roster; club.roster = []; club.bench = [];
  }
  const managed = state.clubs.find((t) => t.id === state.managedTeamId)!;
  return { players, state, managed };
}

export function recruitHistoricalPlayer(state: HistoricalWorld, players: Player[], id: string): string | null {
  const player = players.find((p) => p.id === id);
  const managed = state.clubs.find((t) => t.id === state.managedTeamId)!;
  if (!player || managed.roster.includes(id)) return "Player is already in your lineup.";
  const slot = managed.roster.findIndex((pid) => players.find((p) => p.id === pid)?.role === player.role);
  if (slot < 0 && managed.roster.length >= 5) return "No matching position in your lineup.";
  const previous = managed.roster[slot];
  const owner = clubForPlayer(state, id);
  const wasStarter = owner?.roster.includes(id);
  detach(state, id);
  if (slot < 0) managed.roster.push(id);
  else managed.roster[slot] = id;
  managed.roster.sort((a, b) => roles.indexOf(players.find(p => p.id === a)!.role as Role) - roles.indexOf(players.find(p => p.id === b)!.role as Role));
  if (owner && wasStarter && !fillRegionalVacancies(state, players, owner))
    return `${owner.name} has no available replacement from ${owner.region}.`;
  state.protectedPlayerIds = [...new Set([...state.protectedPlayerIds, id, ...(previous ? [previous] : [])])];
  return null;
}

export function postTiShuffle(current: HistoricalWorld, currentPlayers: Player[], year: number, historicalMoves = true) {
  const refs: RosterReference[] | undefined = year === 2011 ? archive.postTi : rosterBatchFor(year)?.teams;
  if (!refs || current.appliedShuffles.includes(year)) return null;
  const state = structuredClone(current);
  const players = structuredClone(currentPlayers);
  const byId = new Map(players.map((p) => [p.id, p]));
  const incoming = playersFromReferences(refs);
  for (const p of incoming) {
    const existing = byId.get(p.id);
    if (!existing) { players.push(p); byId.set(p.id, p); }
    else { existing.name = p.name; existing.historical = p.historical; }
  }
  const managed = state.clubs.find((t) => t.id === state.managedTeamId)!;
  const protectedIds = new Set([...state.protectedPlayerIds, ...managed.roster]);
  const unformedClubs: string[] = [];
  if (historicalMoves) {
    const applicable = refs.filter((r) => r.id !== managed.id && r.id !== state.replacedTeamId &&
      !(r.name.toLowerCase() === managed.name.toLowerCase() && r.id !== managed.id));
    const included = new Set(applicable.map((r) => r.id));
    // A later annual reference field replaces the prior AI field. This is not a
    // claim that omitted organizations historically disbanded or players retired.
    if (year > 2011) for (const club of state.clubs) if (club.id !== managed.id && !included.has(club.id)) {
      if (club.active !== false) club.archivedRoster = [...club.roster];
      club.active = false; club.roster = []; club.bench = [];
    }
    const priorIds = new Set(state.clubs.map((t) => t.id));
    for (const ref of applicable) {
      let club = state.clubs.find((t) => t.id === ref.id);
      if (!club) {
        club = { id: ref.id, name: ref.name, region: ref.region, ti1: ref.ti1, roster: [], bench: [], reference: { source: ref.source, date: ref.date } };
        state.clubs.push(club);
      }
      club.active = true; club.region = ref.region; club.group = ref.group;
      club.roster = club.roster.filter((id) => protectedIds.has(id));
      club.bench = club.bench.filter((id) => protectedIds.has(id));
    }
    const claimed = new Set<string>();
    for (const ref of applicable) {
      const club = state.clubs.find((t) => t.id === ref.id)!;
      club.name = ref.name; club.reference = { source: ref.source, date: ref.date };
      for (const member of referenceMembers(ref)) {
        if (protectedIds.has(member.id) || claimed.has(member.id)) continue;
        if (!member.bench && club.roster.some((id) => byId.get(id)?.role === roles[member.role])) continue;
        const p = byId.get(member.id)!;
        detach(state, p.id);
        p.role = roles[member.role]; p.region = ref.region;
        p.historical = makePlayer(member.name, member.role, ref.region, ref.source, ref.date, ref.name, p.id).historical;
        (member.bench ? club.bench : club.roster).push(p.id);
        claimed.add(p.id);
      }
    }
    const ordered = activeClubs(state).filter((t) => t.id !== managed.id)
      .sort((a, b) => Number(priorIds.has(b.id)) - Number(priorIds.has(a.id)));
    for (const club of ordered) if (!fillRegionalVacancies(state, players, club, true)) {
      unformedClubs.push(club.name);
      club.archivedRoster = [...club.roster]; club.active = false; club.roster = []; club.bench = [];
    }
  }
  state.appliedShuffles.push(year);
  state.dataThroughYear = Math.max(state.dataThroughYear ?? 2010, year);
  return { state, players, unformedClubs };
}
