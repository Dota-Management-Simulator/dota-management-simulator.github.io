import type { SeasonPatch } from "./patches";
import { heroesArrivingIn } from "./heroes";

export const talentsEnabled = (patch?: Pick<SeasonPatch, "year">) => !!patch && patch.year >= 2017;
export const frontiersEnabled = (patch?: Pick<SeasonPatch, "year">) => !!patch && patch.year >= 2023;
/** Annual releases belong to the following season's opening composite. */
export const patchHeroArrivals = (patch: Pick<SeasonPatch, "year" | "phase">) => patch.phase === 1 ? heroesArrivingIn(patch.year - 1) : [];
export interface PatchMilestone {
  id: "journey" | "frontiers";
  patchId: string;
  title: string;
  version: string;
  releasedOn: string;
  source: string;
  videoId: string;
  summary: string;
}
export const patchMilestones: PatchMilestone[] = [
  { id: "journey", patchId: "2017.1", title: "The New Journey", version: "7.00", releasedOn: "2016-12-12", source: "https://www.dota2.com/700/gameplay/", videoId: "GwLq25FeCc4",
    summary: "Player talent trees unlock. Choose one of two bonuses at each tier, activated when the player's hero reaches levels 10, 15, 20 and 25 in a match. Monkey King joins the hero pool." },
  { id: "frontiers", patchId: "2023.1", title: "New Frontiers", version: "7.33", releasedOn: "2023-04-20", source: "https://www.dota2.com/newfrontiers", videoId: "eH6UJ4xDn4Q",
    summary: "The battlefield gains 40% more area around the existing lanes. Twelve neutral farm camps offer gold and experience; players spend time travelling and clearing them instead of pushing a lane." },
];
export const milestoneForPatch = (id: string) => patchMilestones.find(m => m.patchId === id);
/** On load, introduce the current milestone only; date jumps include crossed milestones. */
export function arrivingMilestones(current: string, previous: string | undefined, seen: string[] = []) {
  return patchMilestones.filter(m => !seen.includes(m.id) && (m.patchId === current || (!!previous && previous < m.patchId && m.patchId <= current)));
}
