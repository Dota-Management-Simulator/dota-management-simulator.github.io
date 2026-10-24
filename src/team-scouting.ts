import type { BattleConfig, PlayerScore, Side } from "./battle";
import type { Campaign, Player } from "./game";
import { buildBattleConfig, nextEvent, opponentFor, teamPlayers } from "./game";
import { activeClubs } from "./history";
import { nextTournamentCommitment, tournamentBattleConfig } from "./historical-game";
import { fixtureTeams, tournamentForRun } from "./tournaments";
import { campaignPatch, draftWeight, heroTags, patchById } from "./patches";
import { managedPatchObserver, perceivedPatch } from "./patch-knowledge";
import { getHeroPool } from "./heroes";
import { assignDraftRoles, draftCanFinish, normalizeDraftPreparation } from "./draft";
import type { DraftPreparation } from "./draft";
import { staffCatalog } from "./staff";

export interface ScoutTeam {
  id: string; clubId?: string; name: string; region: string; roster: string[]; bench: string[];
  active: boolean; managed: boolean; reference?: { source: string; date: string };
}
export interface ScoutMap {
  duration: number; won: boolean; players: PlayerScore[]; bans: string[];
}
export interface ScoutSeries {
  key: string; event: string; at: string; order: number; opponent: string;
  score: string; outcome: "W" | "D" | "L"; maps: ScoutMap[];
}
export function scoutingTeams(c: Campaign): ScoutTeam[] {
  const own = c.world?.managedTeamId ?? "managed";
  const active = new Set(c.world ? activeClubs(c.world).map(t => t.id) : []);
  const teams: ScoutTeam[] = (c.world?.clubs ?? []).map(t => ({ ...t, roster: active.has(t.id) ? t.roster : t.archivedRoster ?? t.roster,
    clubId: t.id, active: active.has(t.id), managed: t.id === own }));
  if (!teams.some(t => t.id === own)) teams.push({ id: own, name: c.settings.team, region: c.settings.region, roster: c.roster, bench: [], active: true, managed: true });
  for (const run of c.calendar?.runs ?? []) for (const t of run.teams) {
    const id = t.id === run.managed ? own : t.clubId ?? `field:${run.eventId}:${t.id}`;
    if (!teams.some(team => team.id === id)) teams.push({ ...t, id, region: c.world?.clubs.find(club => club.id === t.clubId)?.region ?? "Tournament field", bench: [], active: false, managed: id === own });
  }
  if (!c.calendar) {
    const name = opponentFor(c);
    if (!teams.some(t => t.name === name)) teams.push({ id: `legacy:${name}`, name, region: "Circuit opponent", roster: [], bench: [], active: true, managed: false });
    for (const r of c.results) if (!r.skipped && r.year <= c.year && (r.year < c.year || r.week <= c.week) && r.opponent && r.opponent !== "—" && !teams.some(t => t.name === r.opponent))
      teams.push({ id: `legacy:${r.opponent}`, name: r.opponent, region: "Archived opponent", roster: [], bench: [], active: false, managed: false });
  }
  return teams.sort((a, b) => Number(b.managed) - Number(a.managed) || a.name.localeCompare(b.name));
}

/** Saved public matches only, cutoff at the campaign clock. Placement summaries
 * are excluded so managed series and compact AI archives cannot double count. */
export function teamScoutSeries(c: Campaign, team: ScoutTeam): ScoutSeries[] {
  const rows: ScoutSeries[] = [], seen = new Set<string>();
  for (const run of c.calendar?.runs ?? []) {
    const ids = run.teams.filter(t => team.managed ? t.id === run.managed : team.clubId ? t.clubId === team.clubId : team.id === `field:${run.eventId}:${t.id}`).map(t => t.id);
    for (const match of run.matches) {
      const side = match.teams.findIndex(id => ids.includes(id));
      const key = `${run.eventId}:${match.id}`, order = Date.parse(match.at);
      if (side < 0 || seen.has(key) || !Number.isFinite(order) || order > Date.parse(c.calendar!.now)) continue;
      seen.add(key);
      const saved = match.series ?? match.performance;
      const advantage = run.fixtures.find(f => f.id === match.id)?.advantage ?? [0, 0];
      const score = match.score.map((n, i) => Math.max(0, n - advantage[i]));
      if (!score.some(Boolean)) continue;
      rows.push({ key, order, at: match.at, event: tournamentForRun(run)?.name ?? run.eventId,
        opponent: run.teams.find(t => t.id === match.teams[1 - side])?.name ?? "Unknown team",
        score: `${score[side]}–${score[1 - side]}`, outcome: match.winner === null ? "D" : match.winner === side ? "W" : "L",
        maps: (saved?.games ?? []).filter(g => g.duration > 0).map(g => ({ duration: g.duration, won: g.winner === side,
          players: g.players.filter(p => p.team === side), bans: g.draft?.actions.filter(a => a.kind === "ban" && a.side === side).map(a => a.heroId) ?? [] })) });
    }
  }
  for (const r of c.results) {
    if (r.tournamentId || r.skipped || !r.series || r.year > c.year || (r.year === c.year && r.week > c.week)) continue;
    const side: Side = team.managed ? 0 : 1;
    if (!team.managed && r.opponent !== team.name) continue;
    const key = `weekly:${r.year}:${r.eventId}`;
    if (seen.has(key)) continue; seen.add(key);
    rows.push({ key, event: r.event, at: `${r.year} · Week ${r.week}`, order: Date.UTC(r.year, 0, 1) + r.week * 604800000,
      opponent: r.series.teams[1 - side], score: `${r.series.score[side]}–${r.series.score[1 - side]}`,
      outcome: r.series.winner === null ? "D" : r.series.winner === side ? "W" : "L",
      maps: r.series.games.filter(g => g.duration > 0).map(g => ({ duration: g.duration, won: g.winner === side, players: g.players.filter(p => p.team === side),
        bans: g.draft?.actions.filter(a => a.kind === "ban" && a.side === side).map(a => a.heroId) ?? [] })) });
  }
  return rows.sort((a, b) => b.order - a.order || b.key.localeCompare(a.key));
}

export interface NextScoutSeries {
  team: ScoutTeam | null; config?: BattleConfig; event: string; eventId?: string; at: string; stage: string; estimated: boolean;
}
export function nextScoutSeries(c: Campaign): NextScoutSeries | null {
  if (!c.calendar) {
    const event = nextEvent(c); if (!event) return null;
    const config = buildBattleConfig(c, event, 42);
    return { team: scoutingTeams(c).find(t => !t.managed && t.name === config.teams[1]) ?? null, config,
      event: event.name, at: `Week ${event.week}`, stage: "BO3", estimated: false };
  }
  const commitment = nextTournamentCommitment(c); if (!commitment) return null;
  const run = c.calendar.runs.find(r => r.eventId === commitment.eventId)!;
  const fixture = run.fixtures.find(f => f.id === commitment.fixtureId)!;
  const pair = fixtureTeams(run, fixture);
  const opponent = pair?.includes(run.managed) ? run.teams.find(t => t.id === pair.find(id => id !== run.managed)) : undefined;
  const id = opponent?.clubId ?? `field:${run.eventId}:${opponent?.id}`;
  const team = opponent ? { ...(scoutingTeams(c).find(t => t.id === id) ?? { id, name: opponent.name, region: "Tournament field", bench: [], active: false, managed: false }), roster: opponent.roster, name: opponent.name } : null;
  return { team, config: opponent ? tournamentBattleConfig(c, run, fixture) : undefined,
    event: tournamentForRun(run)?.name ?? run.eventId, eventId: run.eventId, at: fixture.at,
    stage: opponent ? `${fixture.stage} · BO${fixture.bestOf}` : "Opponent awaiting bracket results", estimated: !fixture.dateVerified && !fixture.timeVerified };
}

export function frequentHeroes(maps: ScoutMap[], playerId?: string) {
  const counts = new Map<string, { id: string; games: number; wins: number }>();
  for (const map of maps) for (const p of map.players) {
    if (playerId && p.id !== playerId) continue;
    const row = counts.get(p.heroId) ?? { id: p.heroId, games: 0, wins: 0 };
    row.games++; row.wins += Number(map.won); counts.set(p.heroId, row);
  }
  return [...counts.values()].sort((a, b) => b.games - a.games || b.wins - a.wins || a.id.localeCompare(b.id));
}

export function scoutingTeamForConfig(c: Campaign, config: BattleConfig): ScoutTeam | null {
  const roster = config.players[1].map(p => p.id);
  const teams = scoutingTeams(c);
  const team = teams.find(t => !t.managed && t.roster.length === roster.length && t.roster.every(id => roster.includes(id)))
    ?? teams.find(t => !t.managed && t.name === config.teams[1]);
  return team ? { ...team, roster, name: config.teams[1] } : null;
}

export const draftStaffBenefits: Record<string, string> = {
  c1: "Suggests a patch-aware approach and a legal five-role draft plan.",
  c2: "Breaks down recorded lanes and identifies frequently played opponent heroes for bans.",
  c3: "Supports squad recovery; does not add tactical scouting coverage.",
  c4: "Reviews recorded farming speed and objective damage to guide your game plan.",
  c5: "Reads observed composition tendencies and the opponent’s recorded bans.",
  c6: "Builds hero shortlists from your research and the current players’ recorded hero pools.",
};

/** Advice uses our uncertain patch report and completed public maps. Never
 * inspect the opponent's private preparations, staff, or true hero strengths. */
export function staffDraftAdvice(c: Campaign, config: BattleConfig, team: ScoutTeam | null) {
  const staff = staffCatalog.filter(s => c.staffIds.includes(s.id) && s.id !== "c3");
  const patch = patchById(config.patchId) ?? campaignPatch(c);
  const observer = config.patchObservers?.[0] ?? managedPatchObserver(c);
  const view = perceivedPatch(patch, { ...observer, staffIds: c.staffIds });
  const pool = getHeroPool(config.year, Math.min(config.heroPoolThroughYear ?? patch.year - 1, patch.year - 1), patch);
  const maps = team ? teamScoutSeries(c, team).flatMap(s => [...s.maps].reverse()).slice(0, 20) : [];
  const current = new Set(team?.roster ?? config.players[1].map(p => p.id));
  const currentMaps = maps.map(m => ({ ...m, players: m.players.filter(p => current.has(p.id)) }));
  const threats = frequentHeroes(currentMaps).filter(h => pool.some(p => p.id === h.id));
  const approach: DraftPreparation["approach"] = view.axes.objectives >= 65 ? "push" : view.axes.teamfight >= 60 ? "teamfight" : view.axes.economy >= 60 ? "scaling" : view.axes.tempo >= 60 ? "pickoff" : "balanced";
  const picks: string[] = [];
  for (let role = 0; role < 5; role++) {
    const own = config.players[0][role];
    const rank = pool.filter(h => h.roles.includes(role) && !picks.includes(h.id)).sort((a, b) => {
      const score = (h: typeof a) => draftWeight(h, view, own?.skills.creativity ?? 50) + Math.min(1, Math.log1p(own?.heroExperience?.[h.id] ?? 0) * .15);
      return score(b) - score(a) || a.id.localeCompare(b.id);
    });
    const choice = rank.find(h => assignDraftRoles(config, 0, [...picks, h.id], false) && draftCanFinish(pool, [[...picks, h.id], []], []));
    if (choice) picks.push(choice.id);
  }
  const assigned = assignDraftRoles(config, 0, picks, false)?.heroes;
  const bans: string[] = [];
  if (staff.some(s => ["c2", "c5", "c6"].includes(s.id))) for (const threat of threats) {
    if (bans.length === 3) break;
    if (!assigned?.includes(threat.id) && draftCanFinish(pool, [picks, []], [...bans, threat.id])) bans.push(threat.id);
  }
  const plan = normalizeDraftPreparation({ approach, preferred: assigned?.map(id => id ? [id] : []) ?? [[], [], [], [], []],
    bans });
  const notes = staff.map(s => {
    let detail = "";
    if (s.id === "c1") detail = `Our patch estimate suggests ${approach}. Keep a legal five-role lineup and adjust if key heroes are taken.`;
    if (s.id === "c2") {
      const lanes = currentMaps.flatMap(m => m.players).filter(p => p.laneOutcome != null);
      detail = lanes.length ? `Current players won ${lanes.filter(p => p.laneOutcome === "win").length} of ${lanes.length} recorded lane matchups (${lanes.filter(p => p.laneOutcome === "draw").length} drawn). Repeated picks are ban candidates, not guaranteed picks.` : "No measured lane matchups yet. Priority bans will use repeated public picks when available.";
    }
    if (s.id === "c4") {
      const rows = maps.flatMap(m => m.players.filter(p => p.role < 3).map(p => ({ p, minutes: m.duration / 60 })));
      const minutes = rows.reduce((n, r) => n + r.minutes, 0), damage = rows.filter(r => r.p.buildingDamage != null);
      detail = minutes ? `Recorded cores average ${Math.round(rows.reduce((n, r) => n + Math.max(0, r.p.gold - 600), 0) / minutes)} earned GPM. ${damage.length ? `${Math.round(damage.reduce((n, r) => n + r.p.buildingDamage!, 0) / damage.length).toLocaleString()} average building damage across ${damage.length} measured core performances.` : "No measured building damage yet."} Contest safe farm and defend exposed objectives.` : "No economy sample yet. Use the uncertain farming and objective patch report when preparing.";
    }
    if (s.id === "c5") {
      const pushing = maps.filter(m => m.players.filter(p => { const h = pool.find(h => h.id === p.heroId); return h && heroTags(h).includes("Pushing"); }).length >= 2).length;
      const bans = new Set(maps.flatMap(m => m.bans));
      detail = maps.length ? `${pushing} of ${maps.length} recent maps used at least two pushing heroes; ${bans.size} different bans recorded. Treat this small sample as a tendency, not their next draft.` : "No public draft sample yet. Composition tendencies and recorded bans will appear after completed maps.";
    }
    if (s.id === "c6") detail = `${threats.length} eligible heroes observed on current opponent players in the recent team sample. Team profiles show each player’s recorded hero pool across campaign clubs; unplayed signature heroes remain unknown.`;
    return { id: s.id, name: s.name, role: s.role, detail };
  });
  const banCounts = new Map<string, number>();
  for (const m of maps) for (const id of m.bans) banCounts.set(id, (banCounts.get(id) ?? 0) + 1);
  return { notes, plan, canApply: staff.length > 0 && assigned?.filter(Boolean).length === 5, patchId: patch.id, maps: maps.length, threats,
    observedBans: [...banCounts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5) };
}

export function scoutPlayer(c: Campaign, id: string): Player | undefined { return c.players.find(p => p.id === id); }
export function ownScoutConfig(c: Campaign, team: ScoutTeam): BattleConfig | null {
  const own = teamPlayers(c), enemy = team.roster.map(id => scoutPlayer(c, id)).filter((p): p is Player => !!p);
  if (own.length !== 5 || enemy.length !== 5) return null;
  const playerRows = (players: Player[]) => players.map((p, role) => ({ id: p.id, name: p.name, role, skills: p.stats, energy: p.energy, happiness: p.happiness }));
  return { seed: 42, year: c.year, patchId: campaignPatch(c).id, heroPoolThroughYear: campaignPatch(c).year - 1,
    teams: [c.settings.team, team.name], players: [playerRows(own), playerRows(enemy)], bonuses: [0, 0],
    patchObservers: [managedPatchObserver(c), { teamKey: team.id, staffIds: [] }] };
}
