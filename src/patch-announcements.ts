import { campaignPatch, patchById, patchForSeason } from "./patches";
import type { SeasonPatch } from "./patches";
import { milestoneForPatch, patchHeroArrivals } from "./patch-milestones";
import { patchMilestones } from "./patch-milestones";
import type { Campaign } from "./game";

export interface PatchIntroductions { lastPatchId?: string; pending: string[]; dismissed: string[] }
const validPatchId = (id: unknown): id is string => typeof id === "string" && /^\d{4}\.[12]$/.test(id) && Number(id.slice(0, 4)) >= 2011 && Number(id.slice(0, 4)) <= 9999;
export function normalizePatchIntroductions(value: unknown): PatchIntroductions | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const data = value as Record<string, unknown>;
  const dismissed = [...new Set(Array.isArray(data.dismissed) ? data.dismissed.filter(validPatchId) : [])];
  return { ...(validPatchId(data.lastPatchId) ? { lastPatchId: data.lastPatchId } : {}), dismissed,
    pending: [...new Set(Array.isArray(data.pending) ? data.pending.filter(validPatchId) : [])].filter(id => !dismissed.includes(id)) };
}

/** Persist the entire queue so busy screens, jumps and reloads cannot lose an introduction. */
export function syncPatchIntroductions(c: Campaign): Campaign {
  const prior = normalizePatchIntroductions(c.patchIntroductions);
  const dismissed = [...new Set([...(prior?.dismissed ?? []), ...patchMilestones.filter(m => c.seenPatchMilestones?.includes(m.id)).map(m => m.patchId)])];
  const pending = [...new Set([...(prior?.pending ?? []), ...announcedPatches(c, prior?.lastPatchId).map(p => p.id)])].filter(id => !dismissed.includes(id));
  const state: PatchIntroductions = { lastPatchId: campaignPatch(c).id, pending, dismissed };
  return JSON.stringify(state) === JSON.stringify(c.patchIntroductions) ? c : { ...c, patchIntroductions: state };
}

export function dismissPatchIntroduction(c: Campaign, id: string): Campaign {
  const next = syncPatchIntroductions(c);
  const state = next.patchIntroductions!;
  if (!state.pending.includes(id)) return next;
  const milestone = milestoneForPatch(id);
  return { ...next, patchIntroductions: { ...state, pending: state.pending.filter(p => p !== id), dismissed: [...new Set([...state.dismissed, id])] },
    ...(milestone ? { seenPatchMilestones: [...new Set([...(next.seenPatchMilestones ?? []), milestone.id])] } : {}) };
}

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
