import type { PlayerScore } from "./battle";
import type { ScoreboardGame } from "./scoreboards";
import { patchById } from "./patches";
import { REBORN_CLIENT_DATE, SOURCE1_CLIENT_DATE } from "./menu-eras";

export const POST_GAME_SUMMARY_DATE = "2016-08-23";
export const POST_GAME_ANALYTICS_DATE = "2018-03-12";

/** Use the match's date/patch, never the manager's current season or host clock.
 * Undated composites use their start date; early archives fall back to January. */
export function postGameEra(year: number, patchId?: string, playedAt?: string) {
  const date = playedAt && /^\d{4}-\d{2}-\d{2}(?:T|$)/.test(playedAt) && Number.isFinite(Date.parse(playedAt))
    ? playedAt.slice(0, 10) : patchById(patchId)?.startsOn ?? `${year}-01-01`;
  if (date >= "2027-01-01") return { id: "future", title: "Alternate future", lineup: true };
  if (date < SOURCE1_CLIENT_DATE) return { id: "beta", title: "Beta client", lineup: false };
  if (date < REBORN_CLIENT_DATE) return { id: "source1", title: "Source 1", lineup: false };
  if (date < POST_GAME_SUMMARY_DATE) return { id: "reborn", title: "Reborn", lineup: false };
  if (date < POST_GAME_ANALYTICS_DATE) return { id: "summary", title: "Post-Game Summary", lineup: true };
  return { id: "analytics", title: "Post-Game Analytics", lineup: true };
}

export const breakdownMetrics = [
  { id: "heroDamage", label: "Hero damage" },
  { id: "buildingDamage", label: "Building damage" },
  { id: "healing", label: "Healing" },
  { id: "netWorth", label: "Net worth" },
  { id: "gpm", label: "Gold per minute" },
  { id: "xpm", label: "XP per minute" },
  { id: "lastHits", label: "Last hits" },
  { id: "denies", label: "Creep denies" },
  { id: "buybacks", label: "Buybacks" },
  { id: "participation", label: "Kill participation" },
] as const;
export type BreakdownMetric = typeof breakdownMetrics[number]["id"];

export function scoreMetric(player: PlayerScore, game: ScoreboardGame, metric: BreakdownMetric): number | null {
  if (metric === "gpm" || metric === "xpm") return game.duration > 0
    ? (metric === "gpm" ? Math.max(0, player.gold - 600) : player.xp) / (game.duration / 60) : null;
  if (metric === "participation") return game.kills[player.team] > 0
    ? Math.min(100, (player.kills + player.assists) / game.kills[player.team] * 100) : 0;
  const value = player[metric];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** A partial archive must not imply that unrecorded teammates contributed zero. */
export function teamMetricShare(player: PlayerScore, game: ScoreboardGame, metric: BreakdownMetric): number | null {
  const values = game.players.filter(p => p.team === player.team).map(p => scoreMetric(p, game, metric));
  const own = scoreMetric(player, game, metric);
  if (own === null || values.some(v => v === null)) return null;
  const total = values.reduce<number>((sum, value) => sum + value!, 0);
  return total > 0 ? own / total * 100 : 0;
}
