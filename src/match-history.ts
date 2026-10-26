import type { Campaign } from "./game";
import type { PlayerScore, Side } from "./battle";
import type { ScoreboardResult } from "./scoreboards";
import { tournamentScoreboard } from "./scoreboards";
import { tournamentById, tournamentForRun } from "./tournaments";
import { scrimFocuses } from "./scrim-state";

export type MatchKind = "tournament" | "practice" | "exhibition";
export interface MatchHistoryEntry {
  key: string;
  kind: MatchKind;
  eventKey: string;
  event: string;
  at: string;
  year: number;
  stage: string;
  team: string;
  opponent: string;
  outcome: "W" | "D" | "L";
  game: number | null;
  duration?: number;
  player?: PlayerScore;
  result: ScoreboardResult;
  perspective: Side | null;
  teamIds?: [string | undefined, string | undefined];
  order: number;
}

/** A read-only index of existing archives. Practice never enters career ratings
 * or tournament form. Player membership is proven by the saved map's IDs. */
export function campaignMatchHistory(c: Campaign, playerId?: string): MatchHistoryEntry[] {
  const rows: MatchHistoryEntry[] = [];
  const seen = new Set<string>();
  const add = (meta: Omit<MatchHistoryEntry, "key" | "game" | "duration" | "player" | "opponent" | "team" | "outcome"> & { side: Side; key: string; opponent?: string }) => {
    const series = meta.result.series;
    if (series?.games.length) {
      series.games.forEach((g, index) => {
        const player = playerId ? g.players.find(p => p.id === playerId) : undefined;
        if ((playerId && !player) || g.duration <= 0 || !Number.isFinite(g.duration)) return;
        const side = player?.team ?? meta.side;
        const key = `${meta.key}:map:${index}`;
        if (seen.has(key)) return;
        seen.add(key);
        rows.push({ ...meta, key, game: index, duration: g.duration, player, perspective: side,
          team: series.teams[side], opponent: series.teams[side === 0 ? 1 : 0], outcome: g.winner === side ? "W" : "L" });
      });
    } else if (!playerId && !seen.has(meta.key)) {
      seen.add(meta.key);
      rows.push({ ...meta, game: null, team: c.settings.team, opponent: meta.opponent ?? meta.result.opponent,
        outcome: series?.winner === null ? "D" : meta.result.won ? "W" : "L" });
    }
  };

  for (const run of c.calendar?.runs ?? []) {
    const event = tournamentForRun(run);
    if (!event) continue;
    for (const match of run.matches) {
      if (!playerId && !match.teams.includes(run.managed)) continue;
      if (Date.parse(match.at) > Date.parse(c.calendar!.now)) continue;
      const view = tournamentScoreboard(event, run, match);
      if (!view) continue; // Unplayed/default fixtures do not create map appearances.
      add({ ...view, key: `tournament:${run.eventId}:${match.id}`, kind: "tournament", eventKey: run.eventId,
        event: event.name, at: match.at, year: event.year, stage: run.fixtures.find(f => f.id === match.id)?.label ?? "Tournament series",
        order: Date.parse(match.at), side: view.perspective ?? 0 });
    }
  }
  for (const r of c.results) {
    if (r.skipped || r.year > c.year || (r.year === c.year && r.week > c.week)) continue;
    // Dated placement summaries are not a second copy of tournament maps.
    if (r.tournamentId) continue;
    add({ key: `weekly:${r.year}:${r.eventId}`, kind: "tournament", eventKey: `weekly:${r.year}:${r.eventId}`,
      event: r.event, at: `${r.year}-W${String(r.week).padStart(2, "0")}`, year: r.year, stage: `Week ${r.week}`,
      result: r, side: 0, perspective: 0, order: Date.UTC(r.year, 0, 1) + r.week * 604800000,
      teamIds: [c.world?.managedTeamId, undefined] });
  }
  for (const scrim of c.scrims?.sessions ?? []) {
    if (scrim.status !== "complete" || !scrim.series) continue;
    const year = Number(scrim.at.slice(0, 4)), series = scrim.series;
    add({ key: `scrim:${scrim.id}`, kind: "practice", eventKey: "private-practice", event: "Private practice · no tournament",
      at: scrim.at, year, stage: scrimFocuses[scrim.focus].name, side: 0, perspective: 0, order: Date.parse(scrim.at),
      teamIds: [c.world?.managedTeamId, undefined],
      result: { eventId: scrim.id, event: `Private scrim · ${scrimFocuses[scrim.focus].name}`, year, week: 0, prize: 0, points: 0,
        opponent: scrim.opponent, won: series.winner === 0, score: series.score.join(" – "), series, playedAt: scrim.at } });
  }
  for (const attempt of c.botChallenges?.attempts ?? []) {
    const year = Number(attempt.at.slice(0, 4));
    add({ key: `bots:${attempt.id}`, kind: "exhibition", eventKey: "openai-five", event: "OpenAI Five · no tournament",
      at: attempt.at, year, stage: `BO${attempt.bestOf} exhibition`, side: 0, perspective: 0, order: Date.parse(attempt.at),
      result: { eventId: attempt.id, event: "OpenAI Five exhibition", year, week: 0, prize: 0, points: 0,
        opponent: "OpenAI Five", won: attempt.won, score: attempt.score.join(" – "), series: attempt.series, playedAt: attempt.at } });
  }
  // Old All-Star archives retained only a score, not participants or scoreboards.
  if (!playerId) for (const [eventId, star] of Object.entries(c.allStars ?? {})) {
    if (!star.coached) continue;
    const year = Number(star.at.slice(0, 4));
    const event = tournamentById(eventId)?.name ?? eventId;
    add({ key: `all-star:${eventId}`, kind: "exhibition", eventKey: `all-star:${eventId}`, event: `${event} · All-Star exhibition`,
      at: star.at, year, stage: "All-Star match", side: 0, perspective: 0, order: Date.parse(star.at),
      result: { eventId: `all-star:${eventId}`, event: `${event} · All-Star`, year, week: 0, prize: 0, points: 0,
        opponent: star.teams[1], won: star.score[0] > star.score[1], score: star.score.join(" – ") } });
  }
  return rows.sort((a, b) => b.year - a.year || Number(a.at.includes("-W")) - Number(b.at.includes("-W"))
    || b.order - a.order || (b.game ?? 0) - (a.game ?? 0) || a.key.localeCompare(b.key));
}
