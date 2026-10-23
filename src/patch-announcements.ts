import { campaignPatch, patchById, patchForSeason } from "./patches";
import type { SeasonPatch } from "./patches";
import { milestoneForPatch, patchHeroArrivals } from "./patch-milestones";

/** A migrated save gets its current update; subsequent jumps retain every crossed drop. */
export function announcedPatches(campaign: Parameters<typeof campaignPatch>[0], previousId?: string): SeasonPatch[] {
  const current = campaignPatch(campaign);
  const previous = patchById(previousId);
  if (!previous) return [current];
  const index = (p: SeasonPatch) => p.year * 2 + p.phase - 1;
  const patches: SeasonPatch[] = [];
  for (let i = index(previous) + 1; i <= index(current); i++) patches.push(patchForSeason(Math.floor(i / 2), i % 2 + 1 as 1 | 2));
  return patches;
}

export function patchAnnouncement(patch: SeasonPatch) {
  const arrivals = patchHeroArrivals(patch);
  const milestone = milestoneForPatch(patch.id);
  return `${patch.phase === 1 ? "The post-TI opening patch is now active." : "The pre-TI balance update is now active."} ${patch.description}\n\n${arrivals.length ? `New heroes: ${arrivals.map(h => h.name).join(", ")}.` : "No new heroes in this drop."}${milestone ? `\n\n${milestone.version} · ${milestone.title}: ${milestone.summary}` : ""}\n\nRead the one-page notes for gameplay changes and your team's simplified hero report.${milestone ? " The official trailer is also available there." : ""} Registered tournaments keep their opening patch. These season composites compress real releases.`;
}
