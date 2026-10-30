import type { Player } from "./game";
import { patchForSeason } from "./patches";
import type { PatchAxis, SeasonPatch } from "./patches";
import { developmentProfile } from "./player-career";

/** Era meta pull on playstyles. Game rules built on the patch axes, not
 * sourced assessments of how any real player's style changed. */

/** The patch axis that rewards each playstyle. */
export const STYLE_AXIS: Record<string, PatchAxis> = {
  "Farming carry": "economy", "Tempo carry": "tempo", Aggression: "laning", Roaming: "tempo",
  "Split pushing": "splitpush", Teamfight: "teamfight", Initiation: "teamfight",
  "Save support": "teamfight", "Vision control": "vision",
};
/** Most a playstyle moves in one season (adaptability 10, axis far above the patch average). */
export const MAX_STYLE_DRIFT = 0.6;
/** Largest meta-fit effect, in decision-skill points. */
export const META_FIT_POINTS = 2;

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
/** −1..1: how much this patch favours a style's axis compared with its own other axes. */
export function stylePull(patch: SeasonPatch, key: string) {
  const axis = STYLE_AXIS[key];
  if (!axis) return 0;
  const values = Object.values(patch.axes), mean = values.reduce((a, b) => a + b, 0) / values.length;
  return clamp((patch.axes[axis] - mean) / 25, -1, 1);
}

/** One season of meta pressure, applied at the post-TI shuffle: each style
 * moves toward what the year's two patches rewarded. Adaptable players move
 * further; rigid ones keep their old style. Mutates `p`. */
export function driftPlaystyles(p: Player, year: number) {
  const patches = [patchForSeason(year, 1), patchForSeason(year, 2)];
  const rate = MAX_STYLE_DRIFT * (0.2 + 0.8 * developmentProfile(p).adaptability / 10);
  const styles = p.playstyles as Record<string, number | undefined>;
  for (const [key, n] of Object.entries(styles)) {
    if (n == null || !STYLE_AXIS[key]) continue;
    const pull = patches.reduce((sum, patch) => sum + stylePull(patch, key), 0) / patches.length;
    styles[key] = Math.round(clamp(n + pull * rate, 1, 10) * 10) / 10;
  }
}

/** −1..1: whether the player's strong styles are the ones this patch rewards. */
export function metaFit(p: Pick<Player, "playstyles">, patch: SeasonPatch) {
  const rows = Object.entries(p.playstyles as Record<string, number | undefined>).filter((row): row is [string, number] => row[1] != null && !!STYLE_AXIS[row[0]]);
  if (!rows.length) return 0;
  return clamp(rows.reduce((sum, [key, n]) => sum + (n - 5.5) / 4.5 * stylePull(patch, key), 0) / rows.length * 3, -1, 1);
}
/** Decision-skill points from meta fit, at most ±META_FIT_POINTS. */
export const metaFitPoints = (p: Pick<Player, "playstyles">, patch: SeasonPatch) => Math.round(metaFit(p, patch) * META_FIT_POINTS * 10) / 10 || 0;
