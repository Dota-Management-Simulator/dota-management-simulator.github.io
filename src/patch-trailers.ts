import type { SeasonPatch } from "./patches";
import { milestoneForPatch, patchHeroArrivals } from "./patch-milestones";

export interface PatchVideo { id: string; title: string; videoId?: string; videoUrl?: string; source: string; heroIds?: string[]; version?: string }
/** Valve uploads or videos embedded on Valve's own release pages, grouped by in-game arrival. */
export const heroTrailers: PatchVideo[] = [
  { id: "monkey-king", title: "Monkey King Teaser", videoId: "guGFT27SavM", source: "https://www.youtube.com/watch?v=guGFT27SavM", heroIds: ["monkey_king"] },
  { id: "dueling-fates", title: "The Dueling Fates · Dark Willow & Pangolier", videoId: "LV1ZV_DG3kI", source: "https://www.youtube.com/watch?v=LV1ZV_DG3kI", heroIds: ["dark_willow", "pangolier"] },
  { id: "mars-grimstroke", title: "Mars & Grimstroke", videoId: "3450S8MfemE", source: "https://www.youtube.com/watch?v=3450S8MfemE", heroIds: ["mars", "grimstroke"] },
  { id: "snapfire", title: "Introducing Snapfire", videoId: "DXBpMy9VgNU", source: "https://www.youtube.com/watch?v=DXBpMy9VgNU", heroIds: ["snapfire"] },
  { id: "void-spirit", title: "Introducing Void Spirit", videoId: "xLK-h3TB2ds", source: "https://www.youtube.com/watch?v=xLK-h3TB2ds", heroIds: ["void_spirit"] },
  { id: "marci", title: "Marci joins the fight", videoId: "CJuoqAi9ugA", source: "https://www.dota2.com/marci", heroIds: ["marci"] },
  { id: "muerta", title: "Introducing Muerta", videoUrl: "https://cdn.steamstatic.com/apps/dota2/videos/dota_react/muerta/muerta_trailer_english.mp4", source: "https://www.dota2.com/deadreckoning", heroIds: ["muerta"] },
  { id: "ringmaster", title: "Introducing Ringmaster", videoUrl: "https://cdn.steamstatic.com/apps/dota2/videos/dota_react/international2024/ringmaster_trailer_english.mp4", source: "https://www.dota2.com/international2024", heroIds: ["ringmaster"] },
  { id: "kez", title: "Introducing Kez", videoUrl: "https://cdn.steamstatic.com/apps/dota2/videos/dota_react/kez/kez_reveal_1920x1080_en.mp4", source: "https://www.dota2.com/kez", heroIds: ["kez"] },
  { id: "largo", title: "Introducing Largo", videoUrl: "https://cdn.steamstatic.com/apps/dota2/videos/dota_react/largo/largo_trailer.mp4", source: "https://www.dota2.com/largo", heroIds: ["largo"] },
];
export function patchTrailers(patch: Pick<SeasonPatch, "id" | "year" | "phase">): PatchVideo[] {
  const milestone = milestoneForPatch(patch.id);
  const arrivals = new Set(patchHeroArrivals(patch).map(h => h.id));
  return [...(milestone ? [{ id: milestone.id, title: milestone.title, videoId: milestone.videoId, source: milestone.source, version: milestone.version }] : []),
    ...heroTrailers.filter(video => video.heroIds?.some(id => arrivals.has(id)))];
}
